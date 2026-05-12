"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { leaveApi, LeaveDto } from "@/services/leaveApi";
import { notificationApi } from "@/services/notificationApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastState = { message: string; type: "success" | "error" | "info" } | null;
type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECT"; // ✅ Changed from REJECTED

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-amber-500/15  text-amber-400  border-amber-500/25",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  REJECT:   "bg-rose-500/15   text-rose-400   border-rose-500/25", // ✅ Changed key from REJECTED
};

const STATUS_DOT: Record<string, string> = {
  PENDING:  "bg-amber-400",
  APPROVED: "bg-emerald-400",
  REJECT: "bg-rose-400",
};

const LEAVE_TYPE_ICON: Record<string, string> = {
  SICK:       "🤒",
  CASUAL:     "🌴",
  ANNUAL:     "📅",
  MATERNITY:  "👶",
  PATERNITY:  "👨‍👦",
  EMERGENCY:  "🚨",
  UNPAID:     "💸",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const daysBetween = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const colors = {
    success: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
    error:   "bg-rose-500/20    border-rose-500/30    text-rose-300",
    info:    "bg-indigo-500/20  border-indigo-500/30  text-indigo-300",
  };

  const icons = { success: "✅", error: "❌", info: "ℹ️" };

  return (
    <div
      className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-md text-sm font-medium transition-all ${colors[toast.type]}`}
      style={{ animation: "slideInRight 0.3s ease" }}
    >
      <span>{icons[toast.type]}</span>
      <span>{toast.message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-lg leading-none">×</button>
    </div>
  );
}

function ConfirmModal({
  leave,
  action,
  loading,
  onConfirm,
  onCancel,
}: {
  leave: LeaveDto;
  action: "APPROVE" | "REJECT";
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isApprove = action === "APPROVE";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl"
        style={{ animation: "scaleIn 0.2s ease" }}
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 ${
          isApprove ? "bg-emerald-500/15" : "bg-rose-500/15"
        }`}>
          {isApprove ? "✅" : "❌"}
        </div>

        <h3 className="text-white/90 font-semibold text-lg mb-1">
          {isApprove ? "Approve Leave Request" : "Reject Leave Request"}
        </h3>
        <p className="text-white/40 text-sm mb-5">
          {isApprove
            ? `You're about to approve ${leave.userName}'s leave request.`
            : `You're about to reject ${leave.userName}'s leave request.`}
        </p>

        {/* Leave Summary */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/40">Employee</span>
            <span className="text-white/80 font-medium">{leave.userName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Leave Type</span>
            <span className="text-white/80">{leave.leaveType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Duration</span>
            <span className="text-white/80">
              {fmt(leave.startDate)} → {fmt(leave.endDate)}{" "}
              <span className="text-white/40">({daysBetween(leave.startDate, leave.endDate)} days)</span>
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
              isApprove
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/30"
                : "bg-rose-500/20 text-rose-400 border-rose-500/25 hover:bg-rose-500/30"
            }`}
          >
            {loading ? (isApprove ? "Approving…" : "Rejecting…") : (isApprove ? "Yes, Approve" : "Yes, Reject")}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLeavePage() {
  const { user } = useAuthStore();

  const [leaves, setLeaves]               = useState<LeaveDto[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch]               = useState("");
  const [filter, setFilter]               = useState<FilterStatus>("ALL");
  const [toast, setToast]                 = useState<ToastState>(null);
  const [confirm, setConfirm]             = useState<{ leave: LeaveDto; action: "APPROVE" | "REJECT" } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await leaveApi.getAll();
      // Sort: PENDING first, then newest
      setLeaves(data.sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
        return 0;
      }));
    } catch {
      setToast({ message: "Failed to load leave requests", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:    leaves.length,
    pending:  leaves.filter(l => l.status === "PENDING").length,
    approved: leaves.filter(l => l.status === "APPROVED").length,
    rejected: leaves.filter(l => l.status === "REJECT").length, // uses REJECT (matches backend)
  }), [leaves]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return leaves.filter(l => {
      const matchFilter = filter === "ALL" || l.status === filter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.userName?.toLowerCase().includes(q) ||
        l.leaveType?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [leaves, filter, search]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAction = async () => {
    if (!confirm) return;
    const { leave, action } = confirm;

    setActionLoading(true);
    try {
      const updated =
        action === "APPROVE"
          ? await leaveApi.approveLeave(leave.id)
          : await leaveApi.rejectLeave(leave.id);

      setLeaves(prev =>
        prev.map(l => (l.id === leave.id ? { ...l, status: updated.status } : l))
      );

      const verb = action === "APPROVE" ? "approved" : "rejected";
      setToast({
        message: `✅ ${leave.userName}'s ${leave.leaveType} leave has been ${verb}.`,
        type: "success",
      });

    } catch (err: any) {
      setToast({
        message: err.message || `Failed to ${action.toLowerCase()} leave`,
        type: "error",
      });
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          leave={confirm.leave}
          action={confirm.action}
          loading={actionLoading}
          onConfirm={handleAction}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="min-h-screen bg-[#0f1117] p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div>
            <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Leave Requests</h1>
            <p className="text-white/40 text-sm mt-1">Review and manage employee leave applications</p>
          </div>

          {/* ── Stats ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total",    value: stats.total,    color: "text-white/80",   bg: "bg-white/5",          dot: "bg-white/30"      },
              { label: "Pending",  value: stats.pending,  color: "text-amber-400",  bg: "bg-amber-500/10",     dot: "bg-amber-400"     },
              { label: "Approved", value: stats.approved, color: "text-emerald-400",bg: "bg-emerald-500/10",   dot: "bg-emerald-400"   },
              { label: "Rejected", value: stats.rejected, color: "text-rose-400",   bg: "bg-rose-500/10",      dot: "bg-rose-400"      },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-white/[0.06] rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-white/40 text-xs font-medium uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={`text-3xl font-bold ${s.color}`}>
                  {loading
                    ? <span className="inline-block w-10 h-8 rounded-lg bg-white/10 animate-pulse" />
                    : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, type, reason…"
              className="flex-1 bg-[#13151e] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <div className="flex gap-2 flex-wrap">
              {/* ✅ Changed array values to match correct status strings */}
              {(["ALL", "PENDING", "APPROVED", "REJECT"] as FilterStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    filter === s
                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                      : "bg-white/5 text-white/40 border-white/[0.08] hover:bg-white/10"
                  }`}
                >
                  {s}
                  {s !== "ALL" && (
                    <span className="ml-1.5 opacity-60">
                      ({s === "PENDING" ? stats.pending : s === "APPROVED" ? stats.approved : stats.rejected})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ───────────────────────────────────────────────────── */}
          {loading ? (
            <div className="text-center py-16 text-white/40 text-sm">Loading leave requests…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-white/40 text-sm">No leave requests found</p>
            </div>
          ) : (
            <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Employee", "Leave Type", "Duration", "Reason", "Status", "Actions"].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered.map(leave => (
                      <tr key={leave.id} className="hover:bg-white/[0.02] transition-colors group">

                        {/* Employee */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold shrink-0">
                              {leave.userName?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="text-white/80 text-sm font-medium">{leave.userName}</p>
                              <p className="text-white/30 text-xs">ID: {leave.userId}</p>
                            </div>
                          </div>
                        </td>

                        {/* Leave Type */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{LEAVE_TYPE_ICON[leave.leaveType] ?? "📋"}</span>
                            <span className="text-white/70 text-sm">{leave.leaveType}</span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-5 py-4">
                          <p className="text-white/70 text-sm">{fmt(leave.startDate)}</p>
                          <p className="text-white/30 text-xs">→ {fmt(leave.endDate)}</p>
                          <p className="text-indigo-400/70 text-xs mt-0.5">
                            {daysBetween(leave.startDate, leave.endDate)} day{daysBetween(leave.startDate, leave.endDate) !== 1 ? "s" : ""}
                          </p>
                        </td>

                        {/* Reason */}
                        <td className="px-5 py-4 max-w-[200px]">
                          <p className="text-white/50 text-sm truncate" title={leave.reason}>
                            {leave.reason || "—"}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[leave.status] ?? "bg-gray-400"}`} />
                            <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${STATUS_STYLES[leave.status] ?? "bg-gray-500/15 text-gray-400 border-gray-500/25"}`}>
                              {leave.status}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          {leave.status === "PENDING" ? (
                            <div className="flex items-center gap-2">
                              {/* Approve */}
                              <button
                                onClick={() => setConfirm({ leave, action: "APPROVE" })}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
                                title="Approve leave"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                Approve
                              </button>

                              {/* Reject */}
                              <button
                                onClick={() => setConfirm({ leave, action: "REJECT" })}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-medium hover:bg-rose-500/25 transition-colors"
                                title="Reject leave"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs italic">
                              {leave.status === "APPROVED" ? "Approved" : "Rejected"}
                            </span>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-white/30 text-xs">
                  Showing {filtered.length} of {leaves.length} requests
                </span>
                {stats.pending > 0 && (
                  <span className="flex items-center gap-2 text-amber-400/70 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {stats.pending} pending review
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}