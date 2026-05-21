"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi, AttendanceDTO } from "@/services/attendanceApi";

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

  // Find today's record in PKT
  const todayRecord: AttendanceDTO | undefined = allRecords?.find(
    (r) => r.date === todayPKT()
  );

  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;

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

        {/* Status badge */}
        {todayRecord?.status && (
          <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${todayRecord.status === "PRESENT"
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
            : todayRecord.status === "LATE"
              ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
              : "bg-rose-500/15 text-rose-400 border-rose-500/20"
            }`}>
            {todayRecord.status}
          </span>
        )}
      </div>

      {/* Check-in / Check-out times */}
      {hasCheckedIn && (
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <p className="text-white/30 text-xs mb-0.5">Checked in</p>
            <p className="text-white/80 font-mono font-medium">
              {formatTimePKT(todayRecord?.checkIn)}
            </p>
          </div>
          {hasCheckedOut && (
            <div>
              <p className="text-white/30 text-xs mb-0.5">Checked out</p>
              <p className="text-white/80 font-mono font-medium">
                {formatTimePKT(todayRecord?.checkOut)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      {isLoading ? (
        <p className="text-white/30 text-xs mb-4">Loading today's record...</p>
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

      {/* Buttons */}
      <div className="flex gap-3">
        {/* Check In — only show if not checked in yet */}
        {!hasCheckedIn && (
          <button
            onClick={() => checkInMutation.mutate()}
            disabled={isActing || isLoading}
            className="px-5 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkInMutation.isPending ? "Checking in..." : "Check in"}
          </button>
        )}

        {/* Check Out — only show if checked in but not yet checked out */}
        {hasCheckedIn && !hasCheckedOut && (
          <button
            onClick={() => checkOutMutation.mutate()}
            disabled={isActing}
            className="px-5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/25 text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkOutMutation.isPending ? "Checking out..." : "Check out"}
          </button>
        )}
      </div>
    </div>
  );
}