"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/services/attendanceApi";
import { officeHoursApi } from "@/services/officeHoursApi";
import { statusForCheckIn } from "@/lib/officeHours";

function localDateStr(d: Date) {
  return d.toLocaleDateString("en-CA");
}

/** Local wall-clock as `YYYY-MM-DDTHH:mm:00` for Spring `LocalDateTime`. */
function localDateTimeCompact(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export default function AttendanceClockCard({ userId }: { userId: number }) {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const policyQuery = useQuery({
    queryKey: ["office-hours"],
    queryFn: () => officeHoursApi.get(),
    staleTime: 60_000,
  });

  const recordsQuery = useQuery({
    queryKey: ["employee-attendance", userId],
    queryFn: () => attendanceApi.getByUserId(userId),
  });

  const policy = policyQuery.data;

  const today = localDateStr(new Date());

  const todayRow = useMemo(() => {
    const rows = recordsQuery.data ?? [];
    const sameDay = rows.filter((r) => (r.date ?? "").slice(0, 10) === today);
    if (sameDay.length === 0) return null;
    return sameDay.sort((a, b) => b.id - a.id)[0];
  }, [recordsQuery.data, today]);

  const hasCheckedIn = Boolean(todayRow?.checkIn);
  const hasCheckedOut = Boolean(todayRow?.checkOut);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const checkInMutation = useMutation({
    mutationFn: () => {
      const pol = policy ?? { workdayStart: "09:00", workdayEnd: "18:00", graceMinutes: 15 };
      return attendanceApi.create({
        userId,
        date: today,
        status: statusForCheckIn(new Date(), pol),
        checkIn: localDateTimeCompact(new Date()),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-attendance", userId] });
      setToast({ type: "success", message: "Checked in." });
    },
    onError: (e: Error) => {
      setToast({ type: "error", message: e.message || "Check-in failed." });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => {
      if (!todayRow) throw new Error("No attendance row for today.");
      return attendanceApi.create({
        id: todayRow.id,
        userId,
        date: (todayRow.date ?? today).slice(0, 10),
        status: todayRow.status || "PRESENT",
        checkIn: todayRow.checkIn,
        checkOut: localDateTimeCompact(new Date()),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-attendance", userId] });
      setToast({ type: "success", message: "Checked out." });
    },
    onError: (e: Error) => {
      setToast({
        type: "error",
        message:
          e.message ||
          "Check-out failed. If your API rejects POST with an existing id, add PUT /api/attendance/{id} on the server.",
      });
    },
  });

  const busy = checkInMutation.isPending || checkOutMutation.isPending;

  const policyLine = policy
    ? `Office ${policy.workdayStart}–${policy.workdayEnd} · ${policy.graceMinutes} min grace after start`
    : "Loading office hours…";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#13151e] p-5">
      {toast && (
        <p
          className={`mb-3 text-xs font-medium rounded-lg px-3 py-2 ${
            toast.type === "success"
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
              : "bg-rose-500/15 text-rose-300 border border-rose-500/25"
          }`}
        >
          {toast.message}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white/80">Today ({today})</h2>
          <p className="text-[11px] text-white/35 mt-1">{policyLine}</p>
          <p className="text-xs text-white/40 mt-1">
            {hasCheckedOut
              ? "You have completed check-in and check-out for today."
              : hasCheckedIn
                ? "Checked in — use Check out when you leave."
                : "Not checked in yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || hasCheckedIn || policyQuery.isLoading}
            onClick={() => checkInMutation.mutate()}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600/90 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {checkInMutation.isPending ? "…" : "Check in"}
          </button>
          <button
            type="button"
            disabled={busy || !hasCheckedIn || hasCheckedOut}
            onClick={() => checkOutMutation.mutate()}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600/90 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {checkOutMutation.isPending ? "…" : "Check out"}
          </button>
        </div>
      </div>
    </div>
  );
}
