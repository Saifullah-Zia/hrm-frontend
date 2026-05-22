"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  auditLogApi,
  AuditAction,
  AuditLogFilter,
  AuditLogResponse,
} from "@/services/auditLogApi";

/* ─── constants ──────────────────────────────────────────────────────────────── */

const ALL_ACTIONS: AuditAction[] = [
  "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT",
  "WITHDRAW", "SUBMIT", "COMPLETE", "LOGIN", "LOGOUT",
];

const ACTION_STYLE: Record<string, string> = {
  CREATE:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  UPDATE:   "bg-sky-500/15 text-sky-400 border-sky-500/25",
  DELETE:   "bg-rose-500/15 text-rose-400 border-rose-500/25",
  APPROVE:  "bg-green-500/15 text-green-400 border-green-500/25",
  REJECT:   "bg-orange-500/15 text-orange-400 border-orange-500/25",
  WITHDRAW: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  SUBMIT:   "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  COMPLETE: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  LOGIN:    "bg-violet-500/15 text-violet-400 border-violet-500/25",
  LOGOUT:   "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

const ACTION_ICON: Record<string, string> = {
  CREATE:   "M12 4v16m8-8H4",
  UPDATE:   "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  DELETE:   "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  APPROVE:  "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  REJECT:   "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  WITHDRAW: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
  SUBMIT:   "M9 5l7 7-7 7",
  COMPLETE: "M5 13l4 4L19 7",
  LOGIN:    "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1",
  LOGOUT:   "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
};

/* ─── SVG icon helper ────────────────────────────────────────────────────────── */

const SvgIcon = ({ d, className = "w-4 h-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

/* ─── helpers ────────────────────────────────────────────────────────────────── */

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return s; }
}

function fmtRelative(s: string | null | undefined): string {
  if (!s) return "";
  try {
    const diff = Date.now() - new Date(s).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return "";
  } catch { return ""; }
}

/** Try to pretty-print a JSON string; return raw text on failure */
function prettyJson(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try { return JSON.stringify(JSON.parse(raw), null, 2); }
  catch { return raw; }
}

/* ─── Expandable JSON Diff Panel ─────────────────────────────────────────────── */

function JsonDiffPanel({ oldValue, newValue }: { oldValue?: string | null; newValue?: string | null }) {
  const oldPretty = prettyJson(oldValue);
  const newPretty = prettyJson(newValue);
  if (!oldPretty && !newPretty) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      {oldPretty && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-rose-400/60 font-semibold mb-1.5">Old Value</p>
          <pre className="text-xs text-white/50 bg-rose-500/[0.04] border border-rose-500/10 rounded-xl p-3 overflow-x-auto max-h-60 whitespace-pre-wrap break-all">
            {oldPretty}
          </pre>
        </div>
      )}
      {newPretty && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-semibold mb-1.5">New Value</p>
          <pre className="text-xs text-white/50 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-3 overflow-x-auto max-h-60 whitespace-pre-wrap break-all">
            {newPretty}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─── main page component ────────────────────────────────────────────────────── */

export default function AuditLogsPage() {
  /* state */
  const [logs, setLogs]               = useState<AuditLogResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(0);
  const [pageSize]                    = useState(20);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  /* filters */
  const [entityName, setEntityName]   = useState("");
  const [action, setAction]           = useState<AuditAction | "">("");
  const [fromDate, setFromDate]       = useState("");
  const [toDate, setToDate]           = useState("");
  const [searchText, setSearchText]   = useState("");

  /* expanded row */
  const [expandedId, setExpandedId]   = useState<number | null>(null);

  /* drill-down: user activity */
  const [drillUserId, setDrillUserId]       = useState<number | null>(null);
  const [drillUserName, setDrillUserName]   = useState("");
  const [drillLogs, setDrillLogs]           = useState<AuditLogResponse[]>([]);
  const [drillLoading, setDrillLoading]     = useState(false);
  const [drillPage, setDrillPage]           = useState(0);
  const [drillTotalPages, setDrillTotalPages] = useState(1);

  /* ── fetch main logs ── */
  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const filter: AuditLogFilter = {};
      if (entityName.trim()) filter.entityName = entityName.trim();
      if (action) filter.action = action as AuditAction;
      if (fromDate) filter.from = new Date(fromDate).toISOString();
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filter.to = end.toISOString();
      }
      const data = await auditLogApi.getFiltered(filter, p, pageSize);
      setLogs(data.content ?? []);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      setTotalElements(data.totalElements ?? 0);
      setPage(p);
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
      if (err.response?.data) {
        setError(
          typeof err.response.data === "string"
            ? err.response.data
            : JSON.stringify(err.response.data)
        );
      } else {
        setError(err.message || "Failed to fetch audit logs");
      }
    } finally {
      setLoading(false);
    }
  }, [entityName, action, fromDate, toDate, pageSize, page]);

  useEffect(() => { fetchLogs(0); }, [entityName, action, fromDate, toDate]);
  useEffect(() => { fetchLogs(page); }, [page]);

  /* ── local search on current page ── */
  const filtered = useMemo(() => {
    if (!searchText.trim()) return logs;
    const q = searchText.toLowerCase();
    return logs.filter(
      (l) =>
        l.description?.toLowerCase().includes(q) ||
        l.entityName?.toLowerCase().includes(q) ||
        l.performedByName?.toLowerCase().includes(q) ||
        String(l.entityId).includes(q)
    );
  }, [logs, searchText]);

  /* ── unique entity names for filter dropdown ── */
  const entityNames = useMemo(() => {
    const set = new Set(logs.map((l) => l.entityName).filter(Boolean));
    return [...set].sort();
  }, [logs]);

  /* ── stats counters ── */
  const stats = useMemo(() => ({
    total: totalElements,
    creates: logs.filter((l) => l.action === "CREATE").length,
    updates: logs.filter((l) => l.action === "UPDATE").length,
    deletes: logs.filter((l) => l.action === "DELETE").length,
  }), [logs, totalElements]);

  /* ── drill-down: user activity ── */
  const openUserDrill = async (userId: number, userName: string) => {
    setDrillUserId(userId);
    setDrillUserName(userName);
    setDrillPage(0);
    setDrillLoading(true);
    try {
      const data = await auditLogApi.getUserActivity(userId, 0, 20);
      setDrillLogs(data.content ?? []);
      setDrillTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch { setDrillLogs([]); }
    finally { setDrillLoading(false); }
  };

  const fetchDrillPage = async (p: number) => {
    if (drillUserId === null) return;
    setDrillLoading(true);
    setDrillPage(p);
    try {
      const data = await auditLogApi.getUserActivity(drillUserId, p, 20);
      setDrillLogs(data.content ?? []);
      setDrillTotalPages(Math.max(1, data.totalPages ?? 1));
    } catch { /* keep existing */ }
    finally { setDrillLoading(false); }
  };

  const clearFilters = () => {
    setEntityName("");
    setAction("");
    setFromDate("");
    setToDate("");
    setSearchText("");
  };

  const hasActiveFilters = !!(entityName || action || fromDate || toDate || searchText);

  /* ────────────────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/25 flex items-center justify-center">
                <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Audit Logs</h1>
                <p className="text-white/40 text-sm mt-0.5">Track every change across the system</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm font-medium hover:bg-white/[0.07] hover:text-white/90 transition-colors disabled:opacity-40"
          >
            <SvgIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Events",  value: stats.total,   accent: "text-white/80",    bg: "bg-white/[0.03]",       border: "border-white/[0.06]" },
            { label: "Creates",       value: stats.creates, accent: "text-emerald-400",  bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/15" },
            { label: "Updates",       value: stats.updates, accent: "text-sky-400",      bg: "bg-sky-500/[0.06]",     border: "border-sky-500/15" },
            { label: "Deletes",       value: stats.deletes, accent: "text-rose-400",     bg: "bg-rose-500/[0.06]",    border: "border-rose-500/15" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 hover:bg-white/[0.05] transition-colors`}>
              <p className="text-[11px] font-medium text-white/35 uppercase tracking-wider mb-1.5">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Filters</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by description, entity, user…"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors"
              />
            </div>

            {/* Entity */}
            <select
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl bg-[#1a1d2e] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
            >
              <option value="" className="bg-[#1a1d2e] text-white">All entities</option>
              {entityNames.map((n) => (
                <option key={n} value={n} className="bg-[#1a1d2e] text-white">{n}</option>
              ))}
            </select>

            {/* Action */}
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as AuditAction | "")}
              className="px-3 py-2.5 text-sm rounded-xl bg-[#1a1d2e] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
            >
              <option value="" className="bg-[#1a1d2e] text-white">All actions</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a} className="bg-[#1a1d2e] text-white">{a}</option>
              ))}
            </select>

            {/* Date range toggle / quick shortcut */}
            <div className="flex gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                title="From date"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
                title="To date"
              />
            </div>
          </div>

          {/* Action pill quick-filter row */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-white/25 text-[10px] font-semibold uppercase tracking-wider mr-1">Quick:</span>
            {ALL_ACTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setAction(action === a ? "" : a)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  action === a
                    ? ACTION_STYLE[a]
                    : "bg-white/[0.03] text-white/30 border-white/[0.06] hover:text-white/60 hover:bg-white/[0.06]"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30 gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin" />
            <span className="text-sm">Loading audit logs…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="w-10 h-10 mb-3 text-white/15" />
            <p className="text-sm">No audit log entries found</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["", "Time", "Action", "Entity", "Description", "User", "IP"].map((h) => (
                      <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((log) => {
                    const isExpanded = expandedId === log.id;
                    const hasValues = !!(log.oldValue || log.newValue);
                    const style = ACTION_STYLE[log.action] ?? "bg-white/10 text-white/40 border-white/15";
                    const iconD = ACTION_ICON[log.action] ?? "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
                    const relTime = fmtRelative(log.createdAt);

                    return (
                      <tr key={log.id} className="group">
                        <td colSpan={7} className="p-0">
                          <div
                            className={`px-4 py-3.5 grid grid-cols-[24px_140px_100px_130px_1fr_150px_100px] gap-4 items-center cursor-pointer hover:bg-white/[0.02] transition-colors ${isExpanded ? "bg-white/[0.02]" : ""}`}
                            onClick={() => hasValues && setExpandedId(isExpanded ? null : log.id)}
                          >
                            {/* Expand chevron */}
                            <div className="flex items-center justify-center">
                              {hasValues ? (
                                <svg
                                  className={`w-3.5 h-3.5 text-white/25 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              ) : <div className="w-3.5" />}
                            </div>

                            {/* Time */}
                            <div>
                              <p className="text-white/60 text-xs">{fmtDateTime(log.createdAt)}</p>
                              {relTime && <p className="text-white/25 text-[10px] mt-0.5">{relTime}</p>}
                            </div>

                            {/* Action badge */}
                            <div>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${style}`}>
                                <SvgIcon d={iconD} className="w-3 h-3" />
                                {log.action}
                              </span>
                            </div>

                            {/* Entity */}
                            <div>
                              <p className="text-white/70 text-xs font-medium">{log.entityName}</p>
                              <p className="text-white/30 text-[10px] font-mono">#{log.entityId}</p>
                            </div>

                            {/* Description */}
                            <p className="text-white/55 text-xs leading-relaxed truncate pr-4">
                              {log.description}
                            </p>

                            {/* User */}
                            <div>
                              <button
                                onClick={(e) => { e.stopPropagation(); openUserDrill(log.performedById, log.performedByName); }}
                                className="text-indigo-400/80 hover:text-indigo-300 text-xs font-medium transition-colors text-left"
                                title={`View all activity by ${log.performedByName}`}
                              >
                                {log.performedByName}
                              </button>
                              <p className="text-white/20 text-[10px] font-mono">ID #{log.performedById}</p>
                            </div>

                            {/* IP */}
                            <p className="text-white/30 text-[10px] font-mono">{log.ipAddress ?? "—"}</p>
                          </div>

                          {/* Expanded diff panel */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pl-12 border-t border-white/[0.03]">
                              <JsonDiffPanel oldValue={log.oldValue} newValue={log.newValue} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/35">
              <span>
                Page <span className="text-white/60">{page + 1}</span> of <span className="text-white/60">{totalPages}</span>
                {" · "}
                <span className="text-white/60">{totalElements}</span> total events
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
         User Activity Drill-Down Modal
      ──────────────────────────────────────────────────────────────────────── */}
      {drillUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDrillUserId(null)}>
          <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-semibold text-white/90">User Activity</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  All actions by <span className="text-indigo-400">{drillUserName}</span>
                  <span className="text-white/25 ml-1">(ID #{drillUserId})</span>
                </p>
              </div>
              <button onClick={() => setDrillUserId(null)} className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all">
                <SvgIcon d="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {drillLoading ? (
                <div className="flex items-center justify-center py-12 text-white/30 gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : drillLogs.length === 0 ? (
                <p className="text-center py-12 text-white/30 text-sm">No activity found for this user.</p>
              ) : (
                drillLogs.map((l) => {
                  const style = ACTION_STYLE[l.action] ?? "bg-white/10 text-white/40 border-white/15";
                  return (
                    <div key={l.id} className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 hover:bg-white/[0.04] transition-colors">
                      <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold shrink-0 ${style}`}>
                        {l.action}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-white/60 text-xs leading-relaxed">{l.description}</p>
                        <p className="text-white/25 text-[10px] mt-1">
                          {l.entityName}#{l.entityId} · {fmtDateTime(l.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal footer — pagination */}
            <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/35">
              <span>Page {drillPage + 1} of {drillTotalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={drillPage <= 0}
                  onClick={() => fetchDrillPage(drillPage - 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={drillPage >= drillTotalPages - 1}
                  onClick={() => fetchDrillPage(drillPage + 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
