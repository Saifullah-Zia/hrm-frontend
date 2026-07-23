"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { attendanceApi, AttendanceDTO } from "@/services/attendanceApi";
import { attendanceCorrectionApi, AttendanceCorrectionRequestDTO } from "@/services/attendanceCorrectionApi";
import AttendanceClockCard from "@/app/components/employee/AttendanceClockCard";

/* ─── helpers ──────────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ABSENT: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  LATE: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const isAttended = (status: string) =>
  status === "PRESENT" || status === "LATE";

// ✅ Fixed: appends +05:00 so browser treats time as PKT regardless of local timezone
const formatTime = (dt: string) => {
  if (!dt) return "—";
  return new Date(dt + "+05:00").toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (d: string) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/** Returns Monday of the ISO week containing `date` */
const weekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
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
  label: string;
  dateRange: string;
  attended: number;
  workdays: number;
  pct: number;
}

/* ─── component ─────────────────────────────────────────────────────────────── */

export default function EmployeeAttendancePage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"logs" | "corrections">("logs");

  // Correction Form state
  const [showCorrModal, setShowCorrModal] = useState(false);
  const [corrForm, setCorrForm] = useState({
    date: "",
    checkInTime: "",
    checkOutTime: "",
    reason: "",
  });
  const [corrToast, setCorrToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!corrToast) return;
    const t = setTimeout(() => setCorrToast(null), 5000);
    return () => clearTimeout(t);
  }, [corrToast]);

  const recordsQuery = useQuery({
    queryKey: ["employee-attendance", userId],
    queryFn: () => attendanceApi.getByUserId(userId!),
    enabled: typeof userId === "number",
  });

  const paginatedQuery = useQuery({
    queryKey: ["employee-attendance-paginated", userId, page],
    queryFn: () => attendanceApi.getPaginatedByUserId(userId!, page, 10),
    enabled: typeof userId === "number",
  });

  const correctionsQuery = useQuery({
    queryKey: ["employee-corrections", userId],
    queryFn: () => attendanceCorrectionApi.getByUserId(userId!),
    enabled: typeof userId === "number",
  });

  const submitCorrectionMutation = useMutation({
    mutationFn: (dto: AttendanceCorrectionRequestDTO) => attendanceCorrectionApi.submit(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-corrections", userId] });
      setCorrForm({ date: "", checkInTime: "", checkOutTime: "", reason: "" });
      setShowCorrModal(false);
      setCorrToast({ message: "Correction request submitted successfully.", type: "success" });
    },
    onError: (err: Error) => {
      setCorrToast({ message: err.message || "Failed to submit correction request.", type: "error" });
    },
  });

  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrForm.date || !corrForm.reason.trim()) {
      setCorrToast({ message: "Date and reason are required.", type: "error" });
      return;
    }

    let requestedCheckIn: string | null = null;
    let requestedCheckOut: string | null = null;

    if (corrForm.checkInTime) {
      requestedCheckIn = `${corrForm.date}T${corrForm.checkInTime}:00`;
    }

    if (corrForm.checkOutTime) {
      let checkOutDate = corrForm.date;
      // Handle overnight shift crossing midnight
      if (corrForm.checkInTime && corrForm.checkOutTime < corrForm.checkInTime) {
        const d = new Date(corrForm.date + "T00:00:00");
        d.setDate(d.getDate() + 1);
        checkOutDate = d.toISOString().slice(0, 10);
      }
      requestedCheckOut = `${checkOutDate}T${corrForm.checkOutTime}:00`;
    }

    submitCorrectionMutation.mutate({
      userId: userId!,
      date: corrForm.date,
      requestedCheckIn,
      requestedCheckOut,
      reason: corrForm.reason,
    });
  };

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

  /* ── this-week stats ── */
  const weekStats = useMemo(() => {
    const allRows = recordsQuery.data ?? [];
    const today = new Date();
    const mon = weekStart(today);
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    fri.setHours(23, 59, 59, 999);

    const thisWeekRows = allRows.filter((r) => {
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

      const rangeStart = wMon < firstDay ? firstDay : wMon;
      const rangeEnd = wFri > lastDay ? lastDay : wFri;

      const rangeLabel = `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${rangeEnd.toLocaleDateString("en-US", { day: "numeric" })}`;

      const workdays = workdaysBetween(rangeStart, rangeEnd);
      const attended = filtered.filter((r) => {
        const d = new Date(r.date + "T00:00:00");
        return d >= rangeStart && d <= rangeEnd && isAttended(r.status);
      }).length;
      const pct = workdays ? Math.round((attended / workdays) * 100) : 0;

      buckets.push({ label: `Week ${weekNum}`, dateRange: rangeLabel, attended, workdays, pct });

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
        Your account is missing required user information. Please contact support.
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

      {/* ── stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="col-span-2 sm:col-span-2 bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col gap-3">
          <p className="text-indigo-300/70 text-xs font-semibold uppercase tracking-widest">This Week</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold text-white/90">{weekStats.attended}</p>
            <p className="text-white/40 text-sm mb-1">/ {weekStats.workdays} days</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${weekStats.rate}%` }}
            />
          </div>
          <p className="text-indigo-300/60 text-xs">{weekStats.rate}% attendance this week</p>
        </div>

        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Days in view</p>
          <p className="text-3xl font-bold text-white/80 mt-2">{monthStats.total}</p>
        </div>

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
                <div className="relative w-full flex-1 flex items-end justify-center gap-1">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                    style={{ height: `${(bucket.workdays / barMax) * 100}%` }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t from-indigo-600/80 to-violet-500/60 border border-indigo-500/30 transition-all duration-700"
                    style={{ height: `${(bucket.attended / barMax) * 100}%` }}
                  />
                  <span className="relative z-10 text-[10px] font-bold text-white/70 mb-1">
                    {bucket.pct}%
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-[11px] font-medium">{bucket.label}</p>
                  <p className="text-white/25 text-[10px]">{bucket.dateRange}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${weekBuckets.length}, 1fr)` }}>
            {weekBuckets.map((bucket) => (
              <div key={bucket.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
                <p className="text-white/60 text-[11px] font-semibold">{bucket.attended}/{bucket.workdays}</p>
                <p className="text-white/25 text-[10px]">days</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Toast message for corrections ── */}
      {corrToast && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            corrToast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
          }`}
        >
          {corrToast.message}
        </div>
      )}

      {/* ── tabs switcher and buttons ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "logs"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            Attendance Log
          </button>
          <button
            onClick={() => setActiveTab("corrections")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "corrections"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            Correction Requests
          </button>
        </div>
        <button
          onClick={() => setShowCorrModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors self-start sm:self-auto"
        >
          Request Correction
        </button>
      </div>

      {activeTab === "logs" ? (
        /* ── attendance table ── */
        paginatedQuery.isLoading ? (
          <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
        ) : paginatedQuery.isError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            Could not load attendance records. Please contact support.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#13151e]">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Check in</th>
                    <th className="px-4 py-3 font-medium">Check out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {!paginatedQuery.data?.content || paginatedQuery.data.content.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-white/40">
                        No attendance rows found.
                      </td>
                    </tr>
                  ) : (
                    paginatedQuery.data.content.map((row: AttendanceDTO) => (
                      <tr key={row.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white/80">{formatDate(row.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${STATUS_COLORS[row.status] ?? "bg-white/5 text-white/50 border-white/10"}`}>
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

            {paginatedQuery.data && paginatedQuery.data.totalPages > 0 && (
              <div className="flex items-center justify-between mt-4 text-sm text-white/50 px-2">
                <div>Page {page + 1} of {paginatedQuery.data.totalPages}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-[#13151e] hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={paginatedQuery.data.last || page >= paginatedQuery.data.totalPages - 1}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-[#13151e] hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )
      ) : (
        /* ── correction requests table ── */
        correctionsQuery.isLoading ? (
          <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
        ) : correctionsQuery.isError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            Could not load correction requests.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#13151e]">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Req. Check in</th>
                  <th className="px-4 py-3 font-medium">Req. Check out</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {!correctionsQuery.data || correctionsQuery.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                      No correction requests found.
                    </td>
                  </tr>
                ) : (
                  correctionsQuery.data.map((row: AttendanceCorrectionRequestDTO) => (
                    <tr key={row.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-white/60">{row.requestedCheckIn ? formatTime(row.requestedCheckIn) : "—"}</td>
                      <td className="px-4 py-3 text-white/60">{row.requestedCheckOut ? formatTime(row.requestedCheckOut) : "—"}</td>
                      <td className="px-4 py-3 text-white/50 max-w-[200px] truncate" title={row.reason}>{row.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${
                          row.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                            : row.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/25"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Correction Request Modal ── */}
      {showCorrModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-white/90 font-semibold text-lg">Request Attendance Correction</h3>
              <p className="text-white/40 text-xs mt-1">Specify correct times and a reason. Admin review is required.</p>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={corrForm.date}
                  onChange={(e) => setCorrForm({ ...corrForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={corrForm.checkInTime}
                    onChange={(e) => setCorrForm({ ...corrForm, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={corrForm.checkOutTime}
                    onChange={(e) => setCorrForm({ ...corrForm, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-1">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={corrForm.reason}
                  onChange={(e) => setCorrForm({ ...corrForm, reason: e.target.value })}
                  placeholder="e.g. Forgot to clock out / internet issue"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitCorrectionMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 font-medium"
                >
                  {submitCorrectionMutation.isPending ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}