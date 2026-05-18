"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { attendanceApi, AttendanceDTO } from "@/services/attendanceApi";
import AttendanceClockCard from "@/app/components/employee/AttendanceClockCard";

/* ─── helpers ──────────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ABSENT: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  LATE: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const isAttended = (status: string) =>
  status === "PRESENT" || status === "LATE";

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

/** Returns Monday of the ISO week containing `date` */
const weekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Number of weekdays (Mon–Fri) between two dates (inclusive) */
const workdaysBetween = (start: Date, end: Date): number => {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

interface WeekBucket {
  label: string; // "Week 1", "Week 2" …
  dateRange: string; // "May 1 – 7"
  attended: number;
  workdays: number;
  pct: number;
}

/* ─── component ─────────────────────────────────────────────────────────────── */

export default function EmployeeAttendancePage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const recordsQuery = useQuery({
    queryKey: ["employee-attendance", userId],
    queryFn: () => attendanceApi.getByUserId(userId!),
    enabled: typeof userId === "number",
  });

  /* ── filtered rows for selected month ── */
  const filtered = useMemo(() => {
    const rows = recordsQuery.data ?? [];
    if (!month) return rows;
    return rows.filter((r) => (r.date ?? "").startsWith(month));
  }, [recordsQuery.data, month]);

  /* ── overall monthly stats ── */
  const monthStats = useMemo(() => {
    const attended = filtered.filter((r) => isAttended(r.status)).length;
    const total = filtered.length;
    const rate = total ? Math.round((attended / total) * 100) : 0;
    return { attended, total, rate };
  }, [filtered]);

  /* ── this-week stats (always uses today's real week, not month filter) ── */
  const weekStats = useMemo(() => {
    const allRows = recordsQuery.data ?? [];
    const today = new Date();
    const mon = weekStart(today);
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    fri.setHours(23, 59, 59, 999); // end of Friday

    const thisWeekRows = allRows.filter((r) => {
      // Append T00:00:00 so the string is parsed as LOCAL time, not UTC
      const d = new Date(r.date + "T00:00:00");
      return d >= mon && d <= fri;
    });

    const attended = thisWeekRows.filter((r) => isAttended(r.status)).length;
    const capDay = today > fri ? fri : today;
    const workdays = workdaysBetween(mon, capDay);
    const rate = workdays ? Math.round((attended / workdays) * 100) : 0;
    return { attended, workdays: 5, rate };
  }, [recordsQuery.data]);

  /* ── per-week buckets for the selected month ── */
  const weekBuckets = useMemo((): WeekBucket[] => {
    if (!month) return [];
    const [y, m] = month.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);

    const buckets: WeekBucket[] = [];
    let weekNum = 1;
    let cur = new Date(firstDay);

    while (cur <= lastDay) {
      const wMon = weekStart(cur);
      const wFri = new Date(wMon);
      wFri.setDate(wMon.getDate() + 4);

      // Clamp to month boundaries
      const rangeStart = wMon < firstDay ? firstDay : wMon;
      const rangeEnd = wFri > lastDay ? lastDay : wFri;

      const rangeLabel = `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${rangeEnd.toLocaleDateString("en-US", { day: "numeric" })}`;

      const workdays = workdaysBetween(rangeStart, rangeEnd);
      const attended = filtered.filter((r) => {
        // Force local-time parsing to avoid UTC-offset shifting the date
        const d = new Date(r.date + "T00:00:00");
        return d >= rangeStart && d <= rangeEnd && isAttended(r.status);
      }).length;
      const pct = workdays ? Math.round((attended / workdays) * 100) : 0;

      buckets.push({
        label: `Week ${weekNum}`,
        dateRange: rangeLabel,
        attended,
        workdays,
        pct,
      });

      // Move to next Monday
      const nextMon = new Date(wMon);
      nextMon.setDate(wMon.getDate() + 7);
      cur = nextMon;
      weekNum++;
    }

    return buckets;
  }, [filtered, month]);

  /* ── guard ── */
  if (typeof userId !== "number") {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Missing <code className="text-amber-100">userId</code> in your JWT — attendance cannot be loaded.
      </div>
    );
  }

  const barMax = Math.max(...weekBuckets.map((b) => b.workdays), 1);

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── header + month picker ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">My Attendance</h1>
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

      {/* ── check-in / check-out card ── */}
      <AttendanceClockCard userId={userId} />

      {/* ── stat cards: this week + monthly ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* This week */}
        <div className="col-span-2 sm:col-span-2 bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-indigo-300/70 text-xs font-semibold uppercase tracking-widest">This Week</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold text-white/90">{weekStats.attended}</p>
            <p className="text-white/40 text-sm mb-1">/ {weekStats.workdays} days</p>
          </div>
          {/* mini progress bar */}
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${weekStats.rate}%` }}
            />
          </div>
          <p className="text-indigo-300/60 text-xs">{weekStats.rate}% attendance this week</p>
        </div>

        {/* Days in view */}
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Days in view</p>
          <p className="text-3xl font-bold text-white/80 mt-2">{monthStats.total}</p>
        </div>

        {/* Monthly attendance % */}
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Monthly %</p>
          <p className="text-3xl font-bold text-emerald-400/90 mt-2">{monthStats.rate}%</p>
          <p className="text-white/30 text-xs mt-1">{monthStats.attended} days attended</p>
        </div>
      </div>

      {/* ── weekly bar chart ── */}
      {weekBuckets.length > 0 && (
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/80 font-semibold text-sm">Weekly Breakdown</p>
              <p className="text-white/30 text-xs mt-0.5">Attendance per week for the selected month</p>
            </div>
            {/* legend */}
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/70 inline-block" />
                Attended
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-white/[0.06] inline-block" />
                Workdays
              </span>
            </div>
          </div>

          <div className="flex items-end gap-4 h-40">
            {weekBuckets.map((bucket) => (
              <div key={bucket.label} className="flex-1 flex flex-col items-center gap-2 h-full">
                {/* bar area */}
                <div className="relative w-full flex-1 flex items-end justify-center gap-1">
                  {/* background (total workdays) */}
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                    style={{ height: `${(bucket.workdays / barMax) * 100}%` }}
                  />
                  {/* foreground (attended) */}
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t from-indigo-600/80 to-violet-500/60 border border-indigo-500/30 transition-all duration-700"
                    style={{ height: `${(bucket.attended / barMax) * 100}%` }}
                  />
                  {/* % label */}
                  <span className="relative z-10 text-[10px] font-bold text-white/70 mb-1">
                    {bucket.pct}%
                  </span>
                </div>
                {/* x-axis labels */}
                <div className="text-center">
                  <p className="text-white/60 text-[11px] font-medium">{bucket.label}</p>
                  <p className="text-white/25 text-[10px]">{bucket.dateRange}</p>
                </div>
              </div>
            ))}
          </div>

          {/* week detail row */}
          <div className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${weekBuckets.length}, 1fr)` }}>
            {weekBuckets.map((bucket) => (
              <div
                key={bucket.label}
                className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center"
              >
                <p className="text-white/60 text-[11px] font-semibold">
                  {bucket.attended}/{bucket.workdays}
                </p>
                <p className="text-white/25 text-[10px]">days</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── attendance table ── */}
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
