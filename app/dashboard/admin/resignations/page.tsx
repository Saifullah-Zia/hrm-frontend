"use client";
import { Toast } from "@/app/components/Toast";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  resignationApi,
  ResignationResponse,
  ResignationStatus,
  ResignationApprovalRequest,
  resignationStatusBadgeClass,
  resignationStatusDotClass,
  resignationTypeLabel,
} from "@/services/resignationApi";
import AdminOffboardingTasks from "./AdminOffboardingTasks";

type SystemUser = { id: number; name: string; role: string; email: string };

type ToastState = { message: string; type: "success" | "error" } | null;
type FilterStatus = "ALL" | ResignationStatus;

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// ─── Process Modal ────────────────────────────────────────────────────────────

function ProcessModal({
  resignation,
  action,
  loading,
  onConfirm,
  onCancel,
}: {
  resignation: ResignationResponse;
  action: "APPROVED" | "REJECTED";
  loading: boolean;
  onConfirm: (req: ResignationApprovalRequest) => void;
  onCancel: () => void;
}) {
  const isApprove = action === "APPROVED";
  const [hrComments, setHrComments] = useState("");
  const [eligibleForRehire, setEligibleForRehire] = useState(true);
  const [noticePeriodEndDate, setNoticePeriodEndDate] = useState("");

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl"
        style={{ animation: "scaleIn 0.2s ease" }}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 ${isApprove ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
          {isApprove ? "✅" : "❌"}
        </div>
        <h3 className="text-white/90 font-semibold text-lg mb-1">
          {isApprove ? "Approve Resignation" : "Reject Resignation"}
        </h3>
        <p className="text-white/40 text-sm mb-5">
          {resignation.employeeName} · {resignationTypeLabel(resignation.resignationType)}
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider font-medium">HR Comments</label>
            <textarea
              value={hrComments}
              onChange={e => setHrComments(e.target.value)}
              rows={3}
              placeholder="Optional remarks…"
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
            />
          </div>
          {isApprove && (
            <>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-medium">Notice Period End Date</label>
                <input
                  type="date"
                  value={noticePeriodEndDate}
                  onChange={e => setNoticePeriodEndDate(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="rehire"
                  checked={eligibleForRehire}
                  onChange={e => setEligibleForRehire(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <label htmlFor="rehire" className="text-sm text-white/60">Eligible for rehire</label>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onConfirm({
              status: action,
              hrComments: hrComments || undefined,
              isEligibleForRehire: isApprove ? eligibleForRehire : undefined,
              noticePeriodEndDate: isApprove && noticePeriodEndDate ? noticePeriodEndDate : undefined,
            })}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
              isApprove
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/30"
                : "bg-rose-500/20 text-rose-400 border-rose-500/25 hover:bg-rose-500/30"
            }`}
          >
            {loading ? "Processing…" : isApprove ? "Approve" : "Reject"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/50 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  resignation,
  users,
  onClose,
  onTaskUpdate,
}: {
  resignation: ResignationResponse;
  users: SystemUser[];
  onClose: () => void;
  onTaskUpdate: () => void;
}) {
  const progress = resignation.totalTasks > 0
    ? Math.round((resignation.completedTasks / resignation.totalTasks) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#13151e] border-l border-white/[0.08] h-full overflow-y-auto p-6 space-y-5"
        style={{ animation: "slideInRight 0.25s ease" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white/90 font-semibold text-lg">Resignation Details</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-2xl leading-none">×</button>
        </div>

        {/* Employee */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-1">
          <p className="text-white/90 font-semibold">{resignation.employeeName}</p>
          <p className="text-white/40 text-xs">{resignation.employeeDepartment ?? "—"} · {resignation.employeePosition ?? "—"}</p>
          <span className={`inline-flex mt-2 px-2.5 py-1 rounded-lg border text-xs font-medium ${resignationStatusBadgeClass(resignation.status)}`}>
            {resignation.status}
          </span>
        </div>

        {/* Dates */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-2 text-sm">
          <Row label="Resignation Date" value={fmt(resignation.resignationDate)} />
          <Row label="Last Working Day" value={fmt(resignation.lastWorkingDay)} />
          <Row label="Notice Period End" value={fmt(resignation.noticePeriodEndDate)} />
          <Row label="Type" value={resignationTypeLabel(resignation.resignationType)} />
        </div>

        {/* Reason */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Reason</p>
          <p className="text-white/75 text-sm leading-relaxed">{resignation.reason}</p>
        </div>

        {/* HR Info */}
        {(resignation.hrComments || resignation.approvedByName) && (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-2 text-sm">
            {resignation.approvedByName && <Row label="Processed By" value={resignation.approvedByName} />}
            {resignation.approvedAt && <Row label="Processed At" value={fmt(resignation.approvedAt)} />}
            {resignation.hrComments && (
              <div>
                <p className="text-white/40 text-xs mb-0.5">HR Comments</p>
                <p className="text-white/70">{resignation.hrComments}</p>
              </div>
            )}
            {resignation.isEligibleForRehire !== undefined && (
              <Row label="Eligible for Rehire" value={resignation.isEligibleForRehire ? "Yes" : "No"} />
            )}
          </div>
        )}

        {/* Offboarding progress */}
        {resignation.totalTasks > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Offboarding Progress</p>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">{resignation.completedTasks} / {resignation.totalTasks} tasks</span>
              <span className="text-indigo-400 font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex gap-4 mt-3 text-xs mb-6">
              <span className="text-emerald-400">{resignation.completedTasks} done</span>
              <span className="text-amber-400">{resignation.pendingTasks} pending</span>
            </div>
          </div>
        )}

        {/* Offboarding Tasks Component (Always visible so admin can add the first task) */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
          <AdminOffboardingTasks
            resignation={resignation}
            users={users}
            onTaskUpdate={onTaskUpdate}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-white/40 text-xs shrink-0">{label}</span>
      <span className="text-white/75 text-xs text-right">{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminResignationsPage() {
  const { user } = useAuthStore();
  const adminId = user?.userId;

  const [resignations, setResignations] = useState<ResignationResponse[]>([]);
  const [pageRecords, setPageRecords] = useState<ResignationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [toast, setToast] = useState<ToastState>(null);
  const [selected, setSelected] = useState<ResignationResponse | null>(null);
  const [processModal, setProcessModal] = useState<{ resignation: ResignationResponse; action: "APPROVED" | "REJECTED" } | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch users for assignment dropdown
  useEffect(() => {
    // Basic fetch to /api/users, relying on getToken etc.
    const token = localStorage.getItem("token") || "";
    const raw = localStorage.getItem("hrm-auth");
    let actualToken = token;
    if (raw) {
      try {
        actualToken = JSON.parse(raw)?.state?.token ?? token;
      } catch { }
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/users`, {
      headers: { Authorization: `Bearer ${actualToken}` }
    })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setSystemUsers(d);
      })
      .catch(console.error);
  }, []);

  const loadData = useCallback(async (pageIndex = page) => {
    setLoading(true);
    try {
      // 1. Fetch total list in background for stats
      const allData = await resignationApi.getAll();
      setResignations(allData.sort((a, b) => (a.status === "PENDING" ? -1 : b.status === "PENDING" ? 1 : 0)));

      // 2. Fetch page slice
      const pageData = await resignationApi.getPaginated(pageIndex, pageSize, "id", "desc");
      setPageRecords(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(Math.max(1, pageData.totalPages));
      setPage(pageIndex);
    } catch {
      setToast({ message: "Failed to load resignations", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => ({
    total:     resignations.length,
    pending:   resignations.filter(r => r.status === "PENDING").length,
    approved:  resignations.filter(r => r.status === "APPROVED").length,
    rejected:  resignations.filter(r => r.status === "REJECTED").length,
    withdrawn: resignations.filter(r => r.status === "WITHDRAWN").length,
    completed: resignations.filter(r => r.status === "COMPLETED").length,
  }), [resignations]);

  const filtered = useMemo(() =>
    pageRecords.filter(r => {
      const matchStatus = filter === "ALL" || r.status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q || r.employeeName.toLowerCase().includes(q) ||
        r.employeeDepartment?.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    }), [pageRecords, filter, search]);

  const handleProcess = async (req: ResignationApprovalRequest) => {
    if (!processModal || adminId == null) return;
    setActionLoading(true);
    try {
      const updated = await resignationApi.process(processModal.resignation.id, req, adminId);
      setResignations(prev => prev.map(r => r.id === updated.id ? updated : r));
      setPageRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
      setToast({ message: `Resignation ${updated.status.toLowerCase()} successfully`, type: "success" });
      setProcessModal(null);
    } catch (err: any) {
      setToast({ message: err.message || "Action failed", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    setActionLoading(true);
    try {
      const updated = await resignationApi.complete(id);
      setResignations(prev => prev.map(r => r.id === updated.id ? updated : r));
      setPageRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
      setToast({ message: "Offboarding marked complete", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Could not complete offboarding", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const FILTERS: { key: FilterStatus; label: string; count: number }[] = [
    { key: "ALL",       label: "All",       count: stats.total },
    { key: "PENDING",   label: "Pending",   count: stats.pending },
    { key: "APPROVED",  label: "Approved",  count: stats.approved },
    { key: "REJECTED",  label: "Rejected",  count: stats.rejected },
    { key: "WITHDRAWN", label: "Withdrawn", count: stats.withdrawn },
    { key: "COMPLETED", label: "Completed", count: stats.completed },
  ];

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
        @keyframes scaleIn      { from { opacity:0; transform:scale(0.95);      } to { opacity:1; transform:scale(1);    } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-md text-sm font-medium transition-all ${
          toast.type === "success"
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
            : "bg-rose-500/20 border-rose-500/30 text-rose-300"
        }`} style={{ animation: "slideInRight 0.3s ease" }}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      {/* Process Modal */}
      {processModal && (
        <ProcessModal
          resignation={processModal.resignation}
          action={processModal.action}
          loading={actionLoading}
          onConfirm={handleProcess}
          onCancel={() => setProcessModal(null)}
        />
      )}

      {/* Detail Drawer */}
      {selected && (
        <DetailDrawer 
          resignation={selected} 
          users={systemUsers}
          onClose={() => setSelected(null)} 
          onTaskUpdate={() => {
            // Reload resignations to update the progress bar stats
            loadData();
            // Also need to update `selected` so progress bar updates locally immediately
            resignationApi.getById(selected.id).then(setSelected).catch(console.error);
          }}
        />
      )}

      <div className="min-h-screen bg-[#0f1117] p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Resignations</h1>
            <p className="text-white/40 text-sm mt-1">Manage employee resignation requests and offboarding</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Total",     value: stats.total,     color: "text-white/80",    bg: "bg-white/5",          dot: "bg-white/30"   },
              { label: "Pending",   value: stats.pending,   color: "text-amber-400",   bg: "bg-amber-500/10",     dot: "bg-amber-400"  },
              { label: "Approved",  value: stats.approved,  color: "text-emerald-400", bg: "bg-emerald-500/10",   dot: "bg-emerald-400"},
              { label: "Rejected",  value: stats.rejected,  color: "text-rose-400",    bg: "bg-rose-500/10",      dot: "bg-rose-400"   },
              { label: "Withdrawn", value: stats.withdrawn, color: "text-white/50",    bg: "bg-white/5",          dot: "bg-white/30"   },
              { label: "Completed", value: stats.completed, color: "text-sky-400",     bg: "bg-sky-500/10",       dot: "bg-sky-400"    },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-white/[0.06] rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>
                  {loading ? <span className="inline-block w-8 h-7 rounded-lg bg-white/10 animate-pulse" /> : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, department, reason…"
                className="w-full bg-[#13151e] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    filter === f.key
                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                      : "bg-white/5 text-white/40 border-white/[0.08] hover:bg-white/10"
                  }`}
                >
                  {f.label} <span className="ml-1 opacity-60">({f.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-white/40 text-sm">Loading resignations…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-white/40 text-sm">No resignations found</p>
            </div>
          ) : (
            <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Employee", "Type", "Dates", "Offboarding", "Status", "Actions"].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered.map(r => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelected(r)}>

                        {/* Employee */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-sm font-bold shrink-0">
                              {r.employeeName?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="text-white/80 text-sm font-medium">{r.employeeName}</p>
                              <p className="text-white/30 text-xs">{r.employeeDepartment ?? "—"}</p>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <span className="text-white/60 text-sm">{resignationTypeLabel(r.resignationType)}</span>
                        </td>

                        {/* Dates */}
                        <td className="px-5 py-4">
                          <p className="text-white/70 text-sm">Submitted: {fmt(r.resignationDate)}</p>
                          <p className="text-white/30 text-xs">Last day: {fmt(r.lastWorkingDay)}</p>
                        </td>

                        {/* Offboarding */}
                        <td className="px-5 py-4">
                          {r.totalTasks > 0 ? (
                            <div className="min-w-[100px]">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-white/40">{r.completedTasks}/{r.totalTasks}</span>
                                <span className="text-indigo-400">{Math.round((r.completedTasks/r.totalTasks)*100)}%</span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${Math.round((r.completedTasks/r.totalTasks)*100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs">No tasks yet</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${resignationStatusDotClass(r.status)}`} />
                            <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${resignationStatusBadgeClass(r.status)}`}>
                              {r.status}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {r.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => setProcessModal({ resignation: r, action: "APPROVED" })}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setProcessModal({ resignation: r, action: "REJECTED" })}
                                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-medium hover:bg-rose-500/25 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {r.status === "APPROVED" && (
                              <button
                                onClick={() => handleComplete(r.id)}
                                disabled={actionLoading || r.pendingTasks > 0}
                                title={r.pendingTasks > 0 ? `${r.pendingTasks} tasks still pending` : "Mark offboarding complete"}
                                className="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/25 text-xs font-medium hover:bg-sky-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Complete
                              </button>
                            )}
                            {(r.status === "REJECTED" || r.status === "WITHDRAWN" || r.status === "COMPLETED") && (
                              <span className="text-white/20 text-xs italic">{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-white/40">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span>
                    Showing <span className="text-white/70">{filtered.length}</span> of{" "}
                    <span className="text-white/70">{pageRecords.length}</span> page rows ·{" "}
                    <span className="text-white/70">{totalElements}</span> total
                  </span>
                  {stats.pending > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-400 border-t border-white/[0.06] sm:border-t-0 pt-2 sm:pt-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {stats.pending} pending review
                    </span>
                  )}
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
                      className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="flex items-center px-1 text-white/60">
                      Page {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
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
    </>
  );
}
