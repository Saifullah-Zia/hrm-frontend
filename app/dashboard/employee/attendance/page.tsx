"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { attendanceApi, AttendanceDTO } from "@/services/attendanceApi";
import AttendanceClockCard from "@/app/components/employee/AttendanceClockCard";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ABSENT: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  LATE: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const formatTime = (dt: string) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function EmployeeAttendancePage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const recordsQuery = useQuery({
    queryKey: ["employee-attendance", userId],
    queryFn: () => attendanceApi.getByUserId(userId!),
    enabled: typeof userId === "number",
  });

  const filtered = useMemo(() => {
    const rows = recordsQuery.data ?? [];
    if (!month) return rows;
    return rows.filter((r) => (r.date ?? "").startsWith(month));
  }, [recordsQuery.data, month]);

  const stats = useMemo(() => {
    const rows = filtered;
    const present = rows.filter((r) => r.status === "PRESENT").length;
    const total = rows.length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { present, total, rate };
  }, [filtered]);

  if (typeof userId !== "number") {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Missing <code className="text-amber-100">userId</code> in your JWT — attendance cannot be loaded.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">My attendance</h1>
          <p className="text-white/40 text-sm mt-1">Your recorded check-ins for the selected month.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      <AttendanceClockCard userId={userId} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Days in view</p>
          <p className="text-3xl font-bold text-white/80 mt-2">{stats.total}</p>
        </div>
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Present</p>
          <p className="text-3xl font-bold text-emerald-400/90 mt-2">{stats.present}</p>
        </div>
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Attendance %</p>
          <p className="text-3xl font-bold text-indigo-400/90 mt-2">{stats.rate}%</p>
        </div>
      </div>

      {recordsQuery.isLoading ? (
        <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
      ) : recordsQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          Could not load attendance. Confirm you are authenticated and that{" "}
          <code className="text-rose-100">GET /api/attendance</code> succeeds for your account.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#13151e]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Check in</th>
                <th className="px-4 py-3 font-medium">Check out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/40">
                    No attendance rows for this month.
                  </td>
                </tr>
              ) : (
                filtered.map((row: AttendanceDTO) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white/80">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${
                          STATUS_COLORS[row.status] ?? "bg-white/5 text-white/50 border-white/10"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{formatTime(row.checkIn)}</td>
                    <td className="px-4 py-3 text-white/60">{formatTime(row.checkOut)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
