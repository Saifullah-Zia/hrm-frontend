"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { attendanceApi, AttendanceDTO } from "@/services/attendanceApi";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ABSENT:  "bg-rose-500/15 text-rose-400 border-rose-500/20",
  LATE:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-emerald-400",
  ABSENT:  "bg-rose-400",
  LATE:    "bg-amber-400",
};

export default function AttendanceOverviewPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<AttendanceDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [pageRecords, setPageRecords]   = useState<AttendanceDTO[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [page, setPage]                 = useState(0);
  const [pageSize, setPageSize]         = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]     = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({
    userId: "",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    checkIn: "",
    checkOut: "",
  });

  const isAdminOrSuperAdmin = () => {
    const role = user?.role?.toUpperCase();
    return role === "ADMIN" || role === "SUPERADMIN";
  };

  // Auto hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await attendanceApi.getAll();
      setRecords(data);
    } catch (err) {
      setToast({ message: "Failed to load attendance records", type: "error" });
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

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRecords(), loadPageRecords()])
      .finally(() => setLoading(false));
  }, [fetchRecords, loadPageRecords]);

  // Handle page/pageSize changes
  useEffect(() => {
    loadPageRecords();
  }, [page, pageSize, loadPageRecords]);

  const handleCreate = async () => {
    if (!form.userId || !form.date) {
      setToast({ message: "User ID and date are required", type: "error" });
      return;
    }
    setActionLoading(true);
    try {
      const payload: Partial<AttendanceDTO> = {
        userId: Number(form.userId),
        date: form.date,
        status: form.status,
        checkIn:  form.checkIn  ? `${form.date}T${form.checkIn}:00`  : undefined,
        checkOut: form.checkOut ? `${form.date}T${form.checkOut}:00` : undefined,
      };
      await attendanceApi.create(payload);
      setToast({ message: "✅ Attendance record created!", type: "success" });
      setShowForm(false);
      setForm({ userId: "", date: new Date().toISOString().split("T")[0], status: "PRESENT", checkIn: "", checkOut: "" });
      setPage(0);
      await Promise.all([fetchRecords(), loadPageRecords()]);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to create record", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await attendanceApi.delete(id);
      setToast({ message: "🗑️ Record deleted!", type: "success" });
      setDeleteConfirmId(null);
      await Promise.all([fetchRecords(), loadPageRecords()]);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === "PRESENT").length;
    const absent = records.filter(r => r.status === "ABSENT").length;
    const late = records.filter(r => r.status === "LATE").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, rate };
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    return pageRecords.filter(r => {
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchSearch = search === "" ||
        String(r.userId).includes(search) ||
        r.date?.includes(search) ||
        r.status?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [pageRecords, search, statusFilter]);

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
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
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

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white/90">Attendance Overview</h1>
            <p className="text-white/40 text-sm mt-1">Track and manage employee attendance</p>
          </div>
          {isAdminOrSuperAdmin() && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
            >
              <span className="text-lg">{showForm ? "×" : "+"}</span>
              {showForm ? "Cancel" : "Add Record"}
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Records", value: stats.total, color: "text-white/90", bg: "bg-white/5" },
            { label: "Present", value: stats.present, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Absent", value: stats.absent, color: "text-rose-400", bg: "bg-rose-500/10" },
            { label: "Attendance Rate", value: `${stats.rate}%`, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} border border-white/[0.06] rounded-2xl p-4`}>
              <p className="text-white/40 text-xs mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Create Form */}
        {showForm && isAdminOrSuperAdmin() && (
          <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl p-6 mb-6">
            <h2 className="text-white/90 font-semibold mb-4">Add Attendance Record</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">User ID *</label>
                <input
                  type="number"
                  value={form.userId}
                  onChange={e => setForm(p => ({ ...p, userId: e.target.value }))}
                  placeholder="Enter user ID..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={form.date}
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
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                </select>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Check In Time</label>
                <input
                  type="time"
                  value={form.checkIn}
                  onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Check Out Time</label>
                <input
                  type="time"
                  value={form.checkOut}
                  onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCreate}
                disabled={actionLoading}
                className="px-6 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Record"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-xl bg-white/5 text-white/40 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user ID, date or status..."
              className="flex-1 bg-[#13151e] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <div className="flex gap-2">
              {["ALL", "PRESENT", "ABSENT", "LATE"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                      : "bg-white/5 text-white/40 border-white/[0.08] hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["User ID", "Date", "Status", "Check In", "Check Out", isAdminOrSuperAdmin() ? "Actions" : ""].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-white/30 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(record => (
                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                            {record.userId}
                          </div>
                          <span className="text-white/60 text-sm">ID: {record.userId}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white/70 text-sm">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[record.status] ?? "bg-gray-400"}`} />
                          <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${STATUS_COLORS[record.status] ?? "bg-gray-500/15 text-gray-400"}`}>
                            {record.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white/60 text-sm font-mono font-medium">
                        {formatTime(record.checkIn)}
                      </td>
                      <td className="px-5 py-4 text-white/60 text-sm font-mono font-medium">
                        {formatTime(record.checkOut)}
                      </td>
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-white/35">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span>
                  Showing <span className="text-white/60">{filtered.length}</span> of <span className="text-white/60">{pageRecords.length}</span> page rows · <span className="text-white/60">{totalElements}</span> total · Page <span className="text-white/60">{page + 1}</span> of <span className="text-white/60">{totalPages}</span>
                </span>
                <div className="flex items-center gap-3 border-t border-white/[0.04] sm:border-t-0 pt-2 sm:pt-0">
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

              <div className="flex items-center gap-3 self-end sm:self-auto">
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