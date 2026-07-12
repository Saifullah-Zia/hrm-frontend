"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { attendanceApi, AttendanceDTO } from "@/services/attendanceApi";
import apiClient from "@/lib/apiClient";
import { exportMonthlyAttendanceCsv } from "@/lib/attendanceExport";

/* ─── types ─────────────────────────────────────────────────────────────────── */

type SystemUser = { id: number; name: string; email: string; role: string; designation?: string };

/* ─── constants ─────────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ABSENT:  "bg-rose-500/15 text-rose-400 border-rose-500/20",
  LATE:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  ON_LEAVE: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};
const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-emerald-400",
  ABSENT:  "bg-rose-400",
  LATE:    "bg-amber-400",
  ON_LEAVE: "bg-blue-400",
};

/* ─── helpers ────────────────────────────────────────────────────────────────── */

const formatTime = (dt: string) => {
  if (!dt) return "—";
  // Backend sends a naive PKT wall-clock LocalDateTime string,
  // e.g. "2026-07-09T17:03:00" — this is ALREADY Pakistan time.
  // Do NOT use `new Date(dt)` here: without a timezone marker (no "Z", no offset),
  // the JS Date object interprets it in the browser's local timezone, then
  // re-applying `timeZone: "Asia/Karachi"` on top double-converts it and
  // produces the wrong hour (this was the bug — 5:03 PM showing as 12:03 PM).
  //
  // Instead, extract the hour/minute directly from the string — no Date
  // object, no timezone math, no ambiguity.
  const match = dt.match(/T(\d{2}):(\d{2})/);
  if (!match) return "—";

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${period}`;
};

const formatDate = (d: string) => {
  if (!d) return "—";
  // Force local-time parsing to avoid UTC-offset shifting the date back by one day
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

/** Monday of the ISO week containing date */
const weekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Count Mon–Fri days between start and end (inclusive) */
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

interface WeekBucket { label: string; dateRange: string; attended: number; absent: number; total: number; pct: number; }

/* ─── component ──────────────────────────────────────────────────────────────── */

export default function AttendanceOverviewPage() {
  const { user } = useAuthStore();

  const [records, setRecords]           = useState<AttendanceDTO[]>([]);
  const [users, setUsers]               = useState<SystemUser[]>([]);
  const [loading, setLoading]           = useState(true);

  // Pagination State
  const [pageRecords, setPageRecords]   = useState<AttendanceDTO[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [page, setPage]                 = useState(0);
  const [pageSize, setPageSize]         = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]     = useState(1);

  const [month, setMonth]               = useState(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch]             = useState("");
  const [idSearch, setIdSearch]         = useState("");
  const [nameSearch, setNameSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [actionLoading, setActionLoading]     = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [toast, setToast]               = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [exporting, setExporting]       = useState(false);
  const [form, setForm] = useState({
    userId: "",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    checkIn: "",
    checkOut: "",
  });

  // ── Manual attendance marking (admin backup for scheduled job) ──────────────
  const [showManualMark, setShowManualMark] = useState(false);
  const [manualRange, setManualRange]       = useState({ startDate: "", endDate: "" });
  const [manualUserIds, setManualUserIds]   = useState<number[]>([]); // empty = all tracked employees
  const [manualLoading, setManualLoading]   = useState(false);

  const isAdminOrSuperAdmin = () => {
    const role = user?.role?.toUpperCase();
    return role === "ADMIN" || role === "SUPERADMIN";
  };

  /* ── auto-hide toast ── */
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const fetchAllAndUsers = useCallback(async () => {
    try {
      const [att, usr] = await Promise.all([
        attendanceApi.getAll(),
        apiClient.get<SystemUser[]>("/api/users").then(r => Array.isArray(r.data) ? r.data : []),
      ]);
      setRecords(att);
      setUsers(usr);
    } catch {
      setToast({ message: "Failed to load overall stats", type: "error" });
    }
  }, []);

  const loadPageRecords = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await attendanceApi.getPaginated(page, pageSize, "date", "desc");
      setPageRecords(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(Math.max(1, res.totalPages));
    } catch {
      setToast({ message: "Failed to load page records", type: "error" });
    } finally {
      setTableLoading(false);
    }
  }, [page, pageSize]);

  /* ── fetch attendance + users in parallel ── */
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAllAndUsers(), loadPageRecords()])
      .finally(() => setLoading(false));
  }, [fetchAllAndUsers, loadPageRecords]);

  // Handle page or size changes
  useEffect(() => {
    loadPageRecords();
  }, [page, pageSize, loadPageRecords]);

  /* ── userId → name map ── */
  const userMap = useMemo(() => {
    const m = new Map<number, SystemUser>();
    users.forEach(u => m.set(u.id, u));
    return m;
  }, [users]);

  /* ── tracked (non-admin) employees, used for manual-mark employee picker ── */
  const trackedEmployees = useMemo(
    () => users.filter(u => u.role?.toUpperCase() !== "ADMIN" && u.role?.toUpperCase() !== "SUPERADMIN"),
    [users]
  );

  /* ── overall stats (all records) ── */
  const stats = useMemo(() => {
    const total   = records.length;
    const present = records.filter(r => r.status === "PRESENT").length;
    const absent  = records.filter(r => r.status === "ABSENT").length;
    const late    = records.filter(r => r.status === "LATE").length;
    const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, late, rate };
  }, [records]);

  /* ── monthly records (selected month) ── */
  const monthlyRecords = useMemo(() =>
    records.filter(r => (r.date ?? "").startsWith(month)),
  [records, month]);

  /* ── monthly stats (selected month) ── */
  const monthlyStats = useMemo(() => {
    const total   = monthlyRecords.length;
    const present = monthlyRecords.filter(r => r.status === "PRESENT").length;
    const absent  = monthlyRecords.filter(r => r.status === "ABSENT").length;
    const late    = monthlyRecords.filter(r => r.status === "LATE").length;
    const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, late, rate };
  }, [monthlyRecords]);

  /* ── this-week stats ── */
  const weekStats = useMemo(() => {
    const today = new Date();
    const mon = weekStart(today);
    const fri = new Date(mon); fri.setDate(mon.getDate() + 4); fri.setHours(23, 59, 59, 999);
    const rows = records.filter(r => {
      const d = new Date(r.date + "T00:00:00");
      return d >= mon && d <= fri;
    });
    const attended = rows.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
    const absent   = rows.filter(r => r.status === "ABSENT").length;
    const total    = rows.length;
    const rate     = total ? Math.round((attended / total) * 100) : 0;
    return { attended, absent, total, rate };
  }, [records]);

  const weekBuckets = useMemo((): WeekBucket[] => {
    if (!month) return [];
    const [y, m] = month.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay  = new Date(y, m, 0);
    const buckets: WeekBucket[] = [];
    let weekNum = 1, cur = new Date(firstDay);
    while (cur <= lastDay) {
      const wMon = weekStart(cur);
      const wFri = new Date(wMon); wFri.setDate(wMon.getDate() + 4);
      const rangeStart = wMon < firstDay ? firstDay : wMon;
      const rangeEnd   = wFri > lastDay  ? lastDay  : wFri;
      const rangeLabel = `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${rangeEnd.toLocaleDateString("en-US", { day: "numeric" })}`;
      const rows = monthlyRecords.filter(r => {
        const d = new Date(r.date + "T00:00:00");
        return d >= rangeStart && d <= rangeEnd;
      });
      const attended = rows.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
      const absent   = rows.filter(r => r.status === "ABSENT").length;
      const total    = rows.length;
      const pct      = total ? Math.round((attended / total) * 100) : 0;
      buckets.push({ label: `Week ${weekNum}`, dateRange: rangeLabel, attended, absent, total, pct });
      const nextMon = new Date(wMon); nextMon.setDate(wMon.getDate() + 7);
      cur = nextMon; weekNum++;
    }
    return buckets;
  }, [monthlyRecords, month]);

  /* ── filtered records ── */
  const filtered = useMemo(() => {
    return pageRecords.filter(r => {
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;

      // ID filter
      const matchId = idSearch === "" || String(r.userId).includes(idSearch.trim());

      // Name filter — look up the user name from the map
      const userName = userMap.get(Number(r.userId))?.name ?? "";
      const matchName = nameSearch === "" ||
        userName.toLowerCase().includes(nameSearch.trim().toLowerCase());

      // General search (date / status)
      const matchSearch = search === "" ||
        r.date?.includes(search) ||
        r.status?.toLowerCase().includes(search.toLowerCase()) ||
        String(r.userId).includes(search) ||
        userName.toLowerCase().includes(search.toLowerCase());

      return matchStatus && matchId && matchName && matchSearch;
    });
  }, [pageRecords, search, idSearch, nameSearch, statusFilter, userMap]);

  /* ── CRUD ── */
  // NOTE: This form doubles as the manual check-in / check-out tool for admins —
  // setting checkIn and/or checkOut here creates a record with those exact PKT
  // times for the given employee/date (via attendanceApi.create → POST /api/attendance).
  const handleCreate = async () => {
    if (!form.userId || !form.date) {
      setToast({ message: "Employee and date are required", type: "error" }); return;
    }
    setActionLoading(true);
    try {
      const payload: Partial<AttendanceDTO> = {
        userId: Number(form.userId), date: form.date, status: form.status,
        checkIn:  form.checkIn  ? `${form.date}T${form.checkIn}:00`  : undefined,
        checkOut: form.checkOut ? `${form.date}T${form.checkOut}:00` : undefined,
      };
      await attendanceApi.create(payload);
      setToast({ message: "✅ Record saved!", type: "success" });
      setShowForm(false);
      setForm({ userId: "", date: new Date().toISOString().split("T")[0], status: "PRESENT", checkIn: "", checkOut: "" });
      setPage(0); // Go back to first page to see the new entry
      await Promise.all([fetchAllAndUsers(), loadPageRecords()]);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to save record", type: "error" });
    } finally { setActionLoading(false); }
  };

  const handleExportCsv = () => {
    if (monthlyRecords.length === 0) {
      setToast({ message: "No attendance records for the selected month.", type: "error" });
      return;
    }
    setExporting(true);
    try {
      // Exclude ADMIN/SUPERADMIN — they are not tracked for daily attendance.
      const trackedUsers = users.filter(
        (u) => u.role?.toUpperCase() !== "ADMIN" && u.role?.toUpperCase() !== "SUPERADMIN"
      );
      const count = exportMonthlyAttendanceCsv({
        month,
        records: monthlyRecords,
        users: trackedUsers,
      });
      setToast({ message: `Exported ${count} record(s) for ${month}.`, type: "success" });
    } catch {
      setToast({ message: "Could not export attendance CSV.", type: "error" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await attendanceApi.delete(id);
      setToast({ message: "🗑️ Record deleted!", type: "success" });
      setDeleteConfirmId(null);
      await Promise.all([fetchAllAndUsers(), loadPageRecords()]);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete", type: "error" });
    } finally { setActionLoading(false); }
  };

  /* ── Manual attendance marking (backup for scheduled job) — admin/superadmin only ── */
  const handleManualMark = async () => {
    if (!manualRange.startDate || !manualRange.endDate) {
      setToast({ message: "Start and end date are required", type: "error" });
      return;
    }
    if (manualRange.endDate < manualRange.startDate) {
      setToast({ message: "End date cannot be before start date", type: "error" });
      return;
    }
    setManualLoading(true);
    try {
      const result = await attendanceApi.markManualAttendance(
        manualRange.startDate,
        manualRange.endDate,
        manualUserIds.length ? manualUserIds : undefined
      );
      setToast({
        message: `✅ Created: ${result.created} · Updated to leave: ${result.updatedToLeave} · Skipped: ${result.skippedAlreadyHandled} · Weekends skipped: ${result.skippedWeekend}`,
        type: "success",
      });
      setShowManualMark(false);
      setManualRange({ startDate: "", endDate: "" });
      setManualUserIds([]);
      setPage(0);
      await Promise.all([fetchAllAndUsers(), loadPageRecords()]);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to run manual attendance marking", type: "error" });
    } finally {
      setManualLoading(false);
    }
  };

  const toggleManualUser = (id: number) => {
    setManualUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  /* ────────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0f1117] p-4 sm:p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === "success"
            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/20 border border-rose-500/30 text-rose-400"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white/90 font-semibold text-lg mb-2">Delete Record?</h3>
            <p className="text-white/40 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/25 text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">

        {/* Header — stacks vertically on mobile, row on larger screens */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white/90">Attendance Overview</h1>
            <p className="text-white/40 text-sm mt-1">Track and manage employee attendance</p>
          </div>
          {isAdminOrSuperAdmin() && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <button
                onClick={() => { setShowManualMark(!showManualMark); setShowForm(false); }}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/25 text-sm font-medium hover:bg-amber-500/30 transition-colors w-full sm:w-auto"
              >
                <span className="text-lg">{showManualMark ? "×" : "🕓"}</span>
                {showManualMark ? "Cancel" : "Mark Attendance (Range)"}
              </button>
              <button
                onClick={() => { setShowForm(!showForm); setShowManualMark(false); }}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors w-full sm:w-auto"
                title="Create a record or set a manual check-in/check-out time for an employee"
              >
                <span className="text-lg">{showForm ? "×" : "+"}</span>
                {showForm ? "Cancel" : "Manual Check-In/Out"}
              </button>
            </div>
          )}
        </div>

        {/* ── Weekly Summary + Monthly picker ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* This week card */}
          <div className="sm:col-span-2 bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 rounded-2xl p-5 flex flex-col gap-3">
            <p className="text-indigo-300/70 text-xs font-semibold uppercase tracking-widest">This Week — All Employees</p>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-4xl font-bold text-white/90">{weekStats.attended}</p>
                <p className="text-white/30 text-xs mt-0.5">attended</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-400/80">{weekStats.absent}</p>
                <p className="text-white/30 text-xs mt-0.5">absent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white/50">{weekStats.total}</p>
                <p className="text-white/30 text-xs mt-0.5">total records</p>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700" style={{ width: `${weekStats.rate}%` }} />
            </div>
            <p className="text-indigo-300/60 text-xs">{weekStats.rate}% attendance rate this week</p>
          </div>
          {/* Month picker */}
          <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">Monthly View</p>
            <input
              type="month" value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
            {isAdminOrSuperAdmin() && (
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={loading || exporting || monthlyRecords.length === 0}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
            )}
            <p className="text-white/30 text-xs mt-2">{monthlyRecords.length} records in selected month</p>
          </div>
        </div>

        {/* ── Monthly weekly bar chart ── */}
        {weekBuckets.length > 0 && (
          <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-4 sm:p-6 mb-6 overflow-x-auto">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6 min-w-[420px]">
              <div>
                <p className="text-white/80 font-semibold text-sm">Weekly Breakdown</p>
                <p className="text-white/30 text-xs mt-0.5">Attendance per week for the selected month</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/70 inline-block" />Attended</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 inline-block" />Absent</span>
              </div>
            </div>
            <div className="flex items-end gap-4 h-36 min-w-[420px]">
              {weekBuckets.map(bucket => {
                const barMax = Math.max(...weekBuckets.map(b => b.total), 1);
                return (
                  <div key={bucket.label} className="flex-1 flex flex-col items-center gap-2 h-full">
                    <div className="relative w-full flex-1 flex items-end">
                      <div className="absolute bottom-0 left-0 right-0 rounded-lg bg-white/[0.04] border border-white/[0.06]" style={{ height: `${(bucket.total / barMax) * 100}%` }} />
                      <div className="absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t from-indigo-600/80 to-violet-500/60 border border-indigo-500/30 transition-all duration-700" style={{ height: `${(bucket.attended / barMax) * 100}%` }} />
                      <span className="relative z-10 w-full text-center text-[10px] font-bold text-white/70 mb-1">{bucket.pct}%</span>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-[11px] font-medium">{bucket.label}</p>
                      <p className="text-white/25 text-[10px]">{bucket.dateRange}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid gap-2 min-w-[420px]" style={{ gridTemplateColumns: `repeat(${weekBuckets.length}, 1fr)` }}>
              {weekBuckets.map(b => (
                <div key={b.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-2 py-2 text-center">
                  <p className="text-emerald-400/80 text-[11px] font-semibold">{b.attended} att</p>
                  <p className="text-rose-400/70 text-[10px]">{b.absent} abs</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Records",    value: monthlyStats.total,    color: "text-white/90",   bg: "bg-white/5" },
            { label: "Present",          value: monthlyStats.present,  color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Late",             value: monthlyStats.late,     color: "text-amber-400",   bg: "bg-amber-500/10" },
            { label: "Absent",           value: monthlyStats.absent,   color: "text-rose-400",    bg: "bg-rose-500/10" },
            { label: "Attendance Rate",  value: `${monthlyStats.rate}%`, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} border border-white/[0.06] rounded-2xl p-4`}>
              <p className="text-white/40 text-xs mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Manual Attendance Marking Panel (admin/superadmin) ── */}
        {showManualMark && isAdminOrSuperAdmin() && (
          <div className="bg-[#13151e] border border-amber-500/20 rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-white/90 font-semibold mb-1">Manual Attendance Marking</h2>
            <p className="text-white/40 text-xs mb-4">
              Backup for the nightly job. Creates missing records as ABSENT and updates stale ABSENT
              placeholders to ON_LEAVE / UNPAID_LEAVE where approved leave exists. Real check-ins are
              never touched, and weekends are skipped automatically.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Start Date *</label>
                <input
                  type="date" value={manualRange.startDate}
                  onChange={e => setManualRange(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">End Date *</label>
                <input
                  type="date" value={manualRange.endDate}
                  onChange={e => setManualRange(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-white/50 text-xs block">
                  Employees ({manualUserIds.length === 0 ? "all tracked employees" : `${manualUserIds.length} selected`})
                </label>
                {manualUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setManualUserIds([])}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
                  >
                    Clear (apply to all)
                  </button>
                )}
              </div>
              {/* Checkbox list instead of native <select multiple> — much easier to use on mobile/touch */}
              <div className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-2 py-2 max-h-48 overflow-y-auto">
                {trackedEmployees.length === 0 ? (
                  <p className="text-white/30 text-xs px-2 py-1.5">No employees found</p>
                ) : (
                  trackedEmployees.map(u => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={manualUserIds.includes(u.id)}
                        onChange={() => toggleManualUser(u.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 accent-amber-500 shrink-0"
                      />
                      <span className="text-white/80 text-sm truncate">{u.name}</span>
                      <span className="text-white/30 text-xs shrink-0">#{u.id}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={handleManualMark}
                disabled={manualLoading}
                className="px-6 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/25 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                {manualLoading ? "Processing..." : "Run"}
              </button>
              <button
                onClick={() => setShowManualMark(false)}
                className="px-6 py-2 rounded-xl bg-white/5 text-white/40 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors w-full sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Manual Check-In / Check-Out + Create Form (admin/superadmin) */}
        {showForm && isAdminOrSuperAdmin() && (
          <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-white/90 font-semibold mb-1">Manual Check-In / Check-Out</h2>
            <p className="text-white/40 text-xs mb-4">
              Create an attendance record for an employee and optionally set exact check-in / check-out
              times — useful when an employee forgot to clock in/out or for backfilling a record.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Employee *</label>
                <select
                  value={form.userId}
                  onChange={e => setForm(p => ({ ...p, userId: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="" className="bg-[#1a1d2e] text-white/40">Select an employee...</option>
                  {trackedEmployees.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#1a1d2e] text-white">
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Date *</label>
                <input
                  type="date" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Status *</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="PRESENT" className="bg-[#1a1d2e] text-white">Present</option>
                  <option value="ABSENT" className="bg-[#1a1d2e] text-white">Absent</option>
                  <option value="LATE" className="bg-[#1a1d2e] text-white">Late</option>
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Check In Time (manual check-in)</label>
                <input
                  type="time" value={form.checkIn}
                  onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Check Out Time (manual check-out)</label>
                <input
                  type="time" value={form.checkOut}
                  onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={handleCreate} disabled={actionLoading}
                className="px-6 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50 w-full sm:w-auto">
                {actionLoading ? "Saving..." : "Save Record"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-xl bg-white/5 text-white/40 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors w-full sm:w-auto">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="space-y-3 mb-6">
          {/* Row 1: specific filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter by ID */}
            <div className="relative sm:w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-semibold pointer-events-none">ID</span>
              <input
                type="text" value={idSearch}
                onChange={e => setIdSearch(e.target.value)}
                placeholder="Filter by user ID..."
                className="w-full bg-[#13151e] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            {/* Filter by Name */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text" value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                placeholder="Filter by employee name..."
                className="w-full bg-[#13151e] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            {/* General search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by date, status..."
                className="w-full bg-[#13151e] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: status pill filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/30 text-xs font-medium uppercase tracking-wider">Status:</span>
            {["ALL", "PRESENT", "LATE", "ABSENT", "ON_LEAVE"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? s === "PRESENT" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : s === "LATE"    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : s === "ABSENT"  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : s === "ON_LEAVE" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    : "bg-white/5 text-white/40 border-white/[0.08] hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
            {/* clear filters */}
            {(idSearch || nameSearch || search || statusFilter !== "ALL") && (
              <button
                onClick={() => { setIdSearch(""); setNameSearch(""); setSearch(""); setStatusFilter("ALL"); }}
                className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Table — horizontally scrollable on mobile */}
        {loading || tableLoading ? (
          <div className="text-center py-16 text-white/40">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-white/40">No attendance records found</p>
          </div>
        ) : (
          <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Employee", "User ID", "Date", "Status", "Check In", "Check Out", isAdminOrSuperAdmin() ? "Actions" : ""].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-white/30 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(record => {
                    const emp = userMap.get(Number(record.userId));
                    const initials = emp?.name
                      ? emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                      : String(record.userId).slice(0, 2);
                    return (
                      <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Employee name + avatar */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-white/80 text-sm font-medium leading-tight">
                                {emp?.name ?? "—"}
                              </p>
                              <p className="text-white/30 text-xs">{emp?.email ?? ""}</p>
                            </div>
                          </div>
                        </td>
                        {/* User ID */}
                        <td className="px-5 py-4">
                          <span className="text-white/50 text-sm font-mono">#{record.userId}</span>
                        </td>
                        {/* Date */}
                        <td className="px-5 py-4 text-white/70 text-sm whitespace-nowrap">
                          {formatDate(record.date)}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[record.status] ?? "bg-gray-400"}`} />
                            <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${STATUS_COLORS[record.status] ?? "bg-gray-500/15 text-gray-400"}`}>
                              {record.status}
                            </span>
                          </div>
                        </td>
                        {/* Check in */}
                        <td className="px-5 py-4 text-white/60 text-sm font-mono whitespace-nowrap">
                          {formatTime(record.checkIn)}
                        </td>
                        {/* Check out */}
                        <td className="px-5 py-4 text-white/60 text-sm font-mono whitespace-nowrap">
                          {formatTime(record.checkOut)}
                        </td>
                        {/* Actions */}
                        {isAdminOrSuperAdmin() && (
                          <td className="px-5 py-4">
                            <button
                              onClick={() => setDeleteConfirmId(record.id)}
                              className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.06] transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-white/35">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span>
                  Showing <span className="text-white/60">{filtered.length}</span> of <span className="text-white/60">{pageRecords.length}</span> page rows · <span className="text-white/60">{totalElements}</span> total · Page <span className="text-white/60">{page + 1}</span> of <span className="text-white/60">{totalPages}</span>
                </span>
                <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.04] sm:border-t-0 pt-2 sm:pt-0">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Present: {stats.present}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Late: {stats.late}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Absent: {stats.absent}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
                <label className="flex items-center gap-1.5">
                  <span>Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="rounded-lg border border-white/[0.08] bg-[#1a1d2e] px-2 py-1 text-xs text-white/90 focus:outline-none cursor-pointer"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n} className="bg-[#1a1d2e] text-white">
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

