"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi, AttendanceDTO } from "@/services/attendanceApi";
import { getUsersWithPermissions } from "@/services/userPermissionsApi";

/* ─── helpers ────────────────────────────────────────────────────────────── */

/**
 * Backend stores PKT as LocalDateTime (no timezone suffix).
 * Appending "+05:00" tells the browser to treat it as PKT (UTC+5)
 * so it displays correctly regardless of where the employee is.
 * e.g. "2024-01-15T18:00:00" → "06:00 PM" (PKT)
 */
const formatTimePKT = (dt: string | null | undefined): string => {
  if (!dt) return "—";
  return new Date(dt + "+05:00").toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const todayPKT = (): string => {
  // Get today's date string in PKT (YYYY-MM-DD)
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Karachi",
  });
};

const isWeekend = (): boolean => {
  // Check if today is Saturday (6) or Sunday (0) in PKT timezone
  const today = new Date();
  const dayOfWeek = today.toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
  });
  const pktDate = new Date(dayOfWeek);
  return pktDate.getDay() === 6 || pktDate.getDay() === 0;
};

/* ─── component ──────────────────────────────────────────────────────────── */

interface Props {
  userId: number;
}

export default function AttendanceClockCard({ userId }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ── fetch today's attendance record for this user ── */
  const { data: allRecords, isLoading } = useQuery({
    queryKey: ["employee-attendance", userId],
    queryFn: () => attendanceApi.getByUserId(userId),
    enabled: typeof userId === "number",
  });

  /* ── fetch web check-in permission for this user ── */
  const { data: usersPermissions, isLoading: permLoading } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: () => getUsersWithPermissions(),
    enabled: typeof userId === "number",
    staleTime: 30_000, // cache for 30s
  });
  const webCheckInAllowed = usersPermissions?.find((u) => u.id === userId)?.webCheckInAllowed ?? null;

  // Find today's record in PKT (used for status badge)
  const todayRecord: AttendanceDTO | undefined = allRecords?.find(
    (r) => r.date === todayPKT()
  );

  // Find any open shift (checked-in but not yet checked-out).
  // This handles overnight shifts: e.g. check-in at 5 PM (date = July 14)
  // and checkout at 2 AM next day (todayPKT = July 15 → todayRecord = undefined).
  // The open record is picked up regardless of date so the checkout button
  // stays enabled and the check-in time remains visible.
  const openRecord: AttendanceDTO | undefined = allRecords?.find(
    (r) => !!r.checkIn && !r.checkOut
  );

  // Active record: prefer the open overnight shift; otherwise use today's record.
  const activeRecord = openRecord ?? todayRecord;

  const hasCheckedIn  = !!activeRecord?.checkIn;
  const hasCheckedOut = !!activeRecord?.checkOut;

  /* ── office hours (for display only) ── */
  const { data: officeHours } = useQuery({
    queryKey: ["office-hours"],
    queryFn: () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/settings/office-hours`, {
        headers: {
          Authorization: `Bearer ${(() => {
            try {
              const raw = localStorage.getItem("hrm-auth");
              if (raw) return JSON.parse(raw)?.state?.token ?? "";
              return localStorage.getItem("token") ?? "";
            } catch { return ""; }
          })()}`,
        },
      }).then((r) => r.json()),
  });

  // Format office hours to 12hr for display
  const formatOfficeTime = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const graceDeadline = officeHours
    ? (() => {
      const [h, m] = officeHours.workdayStart.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m + (officeHours.graceMinutes ?? 0), 0, 0);
      return d.toLocaleTimeString("en-PK", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    })()
    : null;

  /* ── check-in mutation ── */
  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(userId),
    onSuccess: () => {
      setError(null);
      setSuccess("✅ Checked in successfully!");
      setTimeout(() => setSuccess(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["employee-attendance", userId] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-paginated", userId] });
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message || "Failed to check in");
    },
  });

  /* ── check-out mutation ── */
  const checkOutMutation = useMutation({
    mutationFn: () => attendanceApi.checkOut(userId),
    onSuccess: () => {
      setError(null);
      setSuccess("✅ Checked out successfully!");
      setTimeout(() => setSuccess(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["employee-attendance", userId] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-paginated", userId] });
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message || "Failed to check out");
    },
  });

  const isActing = checkInMutation.isPending || checkOutMutation.isPending;
  const weekendDisabled = isWeekend();

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl p-5">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/80 font-semibold text-sm">Today ({todayPKT()})</p>
          {officeHours && (
            <p className="text-white/35 text-xs mt-0.5">
              Office {formatOfficeTime(officeHours.workdayStart)}–
              {formatOfficeTime(officeHours.workdayEnd)}
              {graceDeadline && (
                <> · {officeHours.graceMinutes} min grace{" "}
                  <span className="text-emerald-400/70">
                    (PRESENT until {graceDeadline})
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Status badge — always use today's date-matched record for status */}
        {(todayRecord?.status ?? (openRecord && !todayRecord ? "IN SHIFT" : undefined)) && (
          <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
            (todayRecord?.status ?? "IN SHIFT") === "PRESENT"
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
              : (todayRecord?.status ?? "IN SHIFT") === "LATE"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                : (todayRecord?.status ?? "IN SHIFT") === "IN SHIFT"
                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/20"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/20"
            }`}>
            {todayRecord?.status ?? "IN SHIFT"}
          </span>
        )}
      </div>

      {/* Check-in / Check-out times — use activeRecord so overnight shifts show correctly */}
      {hasCheckedIn && (
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <p className="text-white/30 text-xs mb-0.5">Checked in</p>
            <p className="text-white/80 font-mono font-medium">
              {formatTimePKT(activeRecord?.checkIn)}
            </p>
            {/* Show the shift date if it's different from today (overnight) */}
            {activeRecord?.date && activeRecord.date !== todayPKT() && (
              <p className="text-indigo-400/70 text-[10px] mt-0.5">Shift started {activeRecord.date}</p>
            )}
          </div>
          {hasCheckedOut && (
            <div>
              <p className="text-white/30 text-xs mb-0.5">Checked out</p>
              <p className="text-white/80 font-mono font-medium">
                {formatTimePKT(activeRecord?.checkOut)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      {isLoading ? (
        <p className="text-white/30 text-xs mb-4">Loading today's record...</p>
      ) : weekendDisabled ? (
        <p className="text-amber-400/70 text-xs mb-4">
          📅 Weekend — check-in/check-out disabled on Saturday & Sunday
        </p>
      ) : hasCheckedIn && !hasCheckedOut ? (
        <p className="text-white/40 text-xs mb-4">
          Checked in — use Check out when you leave.
        </p>
      ) : hasCheckedOut ? (
        <p className="text-emerald-400/70 text-xs mb-4">
          ✅ Shift complete for today.
        </p>
      ) : (
        <p className="text-white/30 text-xs mb-4">
          You haven't checked in yet today.
        </p>
      )}

      {/* Error / Success messages */}
      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {success}
        </div>
      )}

      {/* Buttons — or biometric lock message */}
      {permLoading ? (
        <div className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
      ) : webCheckInAllowed === false ? (
        /* ── Biometric-only lock message ── */
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
          <span className="text-xl leading-none mt-0.5">🔒</span>
          <div>
            <p className="text-amber-300/90 text-sm font-medium">Web check-in disabled</p>
            <p className="text-amber-300/50 text-xs mt-0.5">
              Please use the biometric device to check in and out.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => checkInMutation.mutate()}
            disabled={isActing || isLoading || hasCheckedIn || weekendDisabled}
            className="px-5 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={weekendDisabled ? "Check-in disabled on weekends" : undefined}
          >
            {checkInMutation.isPending ? "Checking in..." : "Check in"}
          </button>

          <button
            onClick={() => checkOutMutation.mutate()}
            disabled={isActing || !hasCheckedIn || hasCheckedOut || weekendDisabled}
            className="px-5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/25 text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={weekendDisabled ? "Check-out disabled on weekends" : undefined}
          >
            {checkOutMutation.isPending ? "Checking out..." : "Check out"}
          </button>
        </div>
      )}
    </div>
  );
}