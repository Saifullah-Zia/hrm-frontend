"use client";
import { Toast } from "@/app/components/Toast";

import { useEffect, useState, useMemo } from "react";
import {
  leaveApi,
  LeaveDto,
  normalizeLeaveStatus,
  isRejectedLeaveStatus,
} from "@/services/leaveApi";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastState = { message: string; type: "success" | "error" | "info" } | null;
type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-amber-500/15  text-amber-400  border-amber-500/25",
  APPROVED:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  REJECTED:  "bg-rose-500/15   text-rose-400   border-rose-500/25",
  REJECT:    "bg-rose-500/15   text-rose-400   border-rose-500/25",
  CANCELLED: "bg-white/10 text-white/50 border-white/15",
};

const STATUS_DOT: Record<string, string> = {
  PENDING:   "bg-amber-400",
  APPROVED:  "bg-emerald-400",
  REJECTED:  "bg-rose-400",
  REJECT:    "bg-rose-400",
  CANCELLED: "bg-white/40",
};

const LEAVE_TYPE_ICON: Record<string, string> = {
  SICK:       "🤒",
  CASUAL:     "🌴",
  ANNUAL:     "📅",
  MATERNITY:  "👶",
  PATERNITY:  "👨‍👦",
  EMERGENCY:  "🚨",
  UNPAID:     "💸",
  EIDULFITAR: "🌙",
  EIDULAZHA:  "🕌",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const daysBetween = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
};

function durationForLeave(leave: LeaveDto): number {
  if (leave.durationDays != null && leave.durationDays > 0) return leave.durationDays;
  return daysBetween(leave.startDate, leave.endDate);
}

// ─── View Details Modal ───────────────────────────────────────────────────────

function ViewDetailsModal({
  leave,
  loading,
  onApprove,
  onReject,
  onClose,
}: {
  leave: LeaveDto;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ animation: "scaleIn 0.2s ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white/90 font-semibold text-lg">Leave Request Details</h3>
            <p className="text-white/40 text-sm">Review the complete leave request information</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Leave Details */}
        <div className="space-y-4 mb-6">
          {/* Employee Info */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Employee Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/40 block text-xs">Name</span>
                <span className="text-white/80 font-medium">{leave.userName}</span>
              </div>
              <div>
                <span className="text-white/40 block text-xs">Employee ID</span>
                <span className="text-white/80 font-medium">{leave.userId}</span>
              </div>
            </div>
          </div>

          {/* Leave Info */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Leave Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/40 block text-xs">Leave Type</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{LEAVE_TYPE_ICON[leave.leaveType] ?? "📋"}</span>
                  <span className="text-white/80 font-medium">{leave.leaveType}</span>
                </div>
              </div>
              <div>
                <span className="text-white/40 block text-xs">Status</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      STATUS_DOT[normalizeLeaveStatus(leave.status)] ??
                      STATUS_DOT[leave.status] ??
                      "bg-gray-400"
                    }`}
                  />
                  <span className="text-white/80 font-medium">{leave.status}</span>
                </div>
              </div>
              <div>
                <span className="text-white/40 block text-xs">Start Date</span>
                <span className="text-white/80 font-medium">{fmt(leave.startDate)}</span>
              </div>
              <div>
                <span className="text-white/40 block text-xs">End Date</span>
                <span className="text-white/80 font-medium">{fmt(leave.endDate)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <span className="text-white/40 text-xs">Duration</span>
              <span className="text-indigo-400/70 text-sm ml-2">
                {durationForLeave(leave)} day{durationForLeave(leave) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Reason for Leave</h4>
            <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">
                {leave.reason || "No reason provided"}
              </p>
            </div>
          </div>

          {/* Attachment */}
          {leave.attachmentUrl && (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
              <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Attachment</h4>
              <a
                href={`${BASE_URL}${leave.attachmentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                View Attachment
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        {normalizeLeaveStatus(leave.status) === "PENDING" && (
          <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 bg-emerald-500/20 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/30"
            >
              {loading ? "Approving…" : "Approve Leave"}
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 bg-rose-500/20 text-rose-400 border-rose-500/25 hover:bg-rose-500/30"
            >
              {loading ? "Rejecting…" : "Reject Leave"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminLeavePage() {
  const [leaves, setLeaves]               = useState<LeaveDto[]>([]);
  const [pageRecords, setPageRecords]     = useState<LeaveDto[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch]               = useState("");
  const [filter, setFilter]               = useState<FilterStatus>("ALL");
  const [toast, setToast]                 = useState<ToastState>(null);
  const [viewDetails, setViewDetails]     = useState<LeaveDto | null>(null);

  // Pagination states
  const [page, setPage]               = useState(0);
  const [pageSize, setPageSize]       = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]   = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadData = async (pageIndex = page) => {
    setLoading(true);
    try {
      const allData = await leaveApi.getAll();
      setLeaves(
        allData.sort((a, b) => {
          const ap = normalizeLeaveStatus(a.status) === "PENDING";
          const bp = normalizeLeaveStatus(b.status) === "PENDING";
          if (ap && !bp) return -1;
          if (!ap && bp) return 1;
          return 0;
        })
      );

      const pageData = await leaveApi.getPaginated(pageIndex, pageSize, filter);
      setPageRecords(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(Math.max(1, pageData.totalPages));
      setPage(pageIndex);
    } catch {
      setToast({ message: "Failed to load leave requests", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filter]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:     leaves.length,
    pending:   leaves.filter((l) => normalizeLeaveStatus(l.status) === "PENDING").length,
    approved:  leaves.filter((l) => normalizeLeaveStatus(l.status) === "APPROVED").length,
    rejected:  leaves.filter((l) => isRejectedLeaveStatus(l.status)).length,
    cancelled: leaves.filter((l) => normalizeLeaveStatus(l.status) === "CANCELLED").length,
  }), [leaves]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return pageRecords.filter((l) => {
      const st = normalizeLeaveStatus(l.status);
      const matchFilter =
        filter === "ALL" ||
        (filter === "REJECTED" ? isRejectedLeaveStatus(l.status) : st === filter);
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.userName?.toLowerCase().includes(q) ||
        l.leaveType?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [pageRecords, filter, search]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = async (leave: LeaveDto) => {
    setActionLoading(true);
    try {
      const updated = await leaveApi.approveLeave(leave.id);
      setLeaves((prev) => prev.map((l) => (l.id === leave.id ? { ...l, status: updated.status } : l)));
      setPageRecords((prev) => prev.map((l) => (l.id === leave.id ? { ...l, status: updated.status } : l)));
      setToast({ message: `✅ ${leave.userName}'s ${leave.leaveType} leave has been approved.`, type: "success" });
      setViewDetails(null);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to approve leave", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (leave: LeaveDto) => {
    setActionLoading(true);
    try {
      const updated = await leaveApi.rejectLeave(leave.id);
      setLeaves((prev) => prev.map((l) => (l.id === leave.id ? { ...l, status: updated.status } : l)));
      setPageRecords((prev) => prev.map((l) => (l.id === leave.id ? { ...l, status: updated.status } : l)));
      setToast({ message: `✅ ${leave.userName}'s ${leave.leaveType} leave has been rejected.`, type: "success" });
      setViewDetails(null);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to reject leave", type: "error" });
    } finally {
      setActionLoading(false);
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* View Details Modal */}
      {viewDetails && (
        <ViewDetailsModal
          leave={viewDetails}
          loading={actionLoading}
          onApprove={() => handleApprove(viewDetails)}
          onReject={() => handleReject(viewDetails)}
          onClose={() => setViewDetails(null)}
        />
      )}

      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">Leave Approvals</h1>
          <p className="text-white/40 text-sm mt-1">Super Admin view — review and manage all employee leave requests</p>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total",     value: stats.total,     color: "text-white/80",    bg: "bg-white/5",          dot: "bg-white/30"    },
            { label: "Pending",   value: stats.pending,   color: "text-amber-400",   bg: "bg-amber-500/10",     dot: "bg-amber-400"   },
            { label: "Approved",  value: stats.approved,  color: "text-emerald-400", bg: "bg-emerald-500/10",   dot: "bg-emerald-400" },
            { label: "Rejected",  value: stats.rejected,  color: "text-rose-400",    bg: "bg-rose-500/10",      dot: "bg-rose-400"    },
            { label: "Cancelled", value: stats.cancelled, color: "text-white/50",    bg: "bg-white/5",          dot: "bg-white/40"    },
          ].map((s) => (
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
          <div className="flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, type, reason…"
              className="w-full bg-[#13151e] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s); setPage(0); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  filter === s
                    ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    : "bg-white/5 text-white/40 border-white/[0.08] hover:bg-white/10"
                }`}
              >
                {s}
                {s !== "ALL" && (
                  <span className="ml-1.5 opacity-60">
                    ({s === "PENDING" ? stats.pending : s === "APPROVED" ? stats.approved : s === "CANCELLED" ? stats.cancelled : stats.rejected})
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
                    {["Employee", "Leave Type", "Duration", "Reason", "Attachment", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((leave) => (
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
                          {durationForLeave(leave)} day{durationForLeave(leave) !== 1 ? "s" : ""}
                        </p>
                      </td>

                      {/* Reason */}
                      <td className="px-5 py-4 max-w-[300px]">
                        <p className="text-white/50 text-sm truncate" title={leave.reason}>
                          {leave.reason ? (leave.reason.length > 60 ? leave.reason.slice(0, 60) + "…" : leave.reason) : "—"}
                        </p>
                      </td>

                      {/* Attachment */}
                      <td className="px-5 py-4">
                        {leave.attachmentUrl ? (
                          <a
                            href={`${BASE_URL}${leave.attachmentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline text-xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                            Attachment
                          </a>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              STATUS_DOT[normalizeLeaveStatus(leave.status)] ??
                              STATUS_DOT[leave.status] ??
                              "bg-gray-400"
                            }`}
                          />
                          <span
                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${
                              STATUS_STYLES[normalizeLeaveStatus(leave.status)] ??
                              STATUS_STYLES[leave.status] ??
                              "bg-gray-500/15 text-gray-400 border-gray-500/25"
                            }`}
                          >
                            {leave.status}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setViewDetails(leave)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 text-xs font-medium hover:bg-indigo-500/25 transition-colors"
                          title="View details"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer / Pagination */}
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
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                    className="rounded-lg border border-white/[0.08] bg-[#1a1d2e] px-2 py-1 text-xs text-white/90 focus:outline-none cursor-pointer"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n} className="bg-[#1a1d2e] text-white">{n}</option>
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
    </>
  );
}
