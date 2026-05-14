"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { leaveApi, LeaveBalanceDto } from "@/services/leaveApi";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export default function AdminLeaveBalancesPage() {
  const [rows, setRows] = useState<LeaveBalanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leaveApi.getAllBalancesPage(page, size);
      setRows(res.content);
      setTotalElements(res.totalElements);
      setTotalPages(
        res.totalElements === 0 ? 0 : Math.max(1, res.totalPages)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [size]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        (r.userName ?? "").toLowerCase().includes(s) ||
        (r.leaveType ?? "").toLowerCase().includes(s) ||
        String(r.userId ?? "").includes(s)
    );
  }, [rows, q]);

  const pageHuman = totalElements === 0 ? 0 : page + 1;
  const isFirst = page <= 0;
  const isLast = totalPages <= 0 ? true : page >= totalPages - 1;

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Leave balances</h1>
        <p className="text-white/40 text-sm mt-1">
          Current year —{" "}
          <code className="text-indigo-300/90">GET /api/leave/balance/all?page=&amp;size=</code>{" "}
          (Spring <code className="text-indigo-300/90">Page</code>)
        </p>

        <div className="mt-6 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter this page by employee, type, or user id…"
            className="w-full lg:max-w-md px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-white/40 text-xs">
              Per page
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="bg-[#13151e] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white/80 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {q.trim() && (
          <p className="text-white/25 text-xs mt-2">Search applies only to rows on the current page.</p>
        )}

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#13151e] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-white/40 text-sm">Loading…</div>
          ) : error ? (
            <div className="p-6 text-rose-400 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-white/40 text-sm">No balance rows on this page</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Year</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Used</th>
                    <th className="px-4 py-3 font-medium">Pending</th>
                    <th className="px-4 py-3 font-medium">Remaining</th>
                    <th className="px-4 py-3 font-medium">Carry fwd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((r) => (
                    <tr key={r.id ?? `${r.userId}-${r.leaveType}-${r.year}`} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">
                        <span className="font-medium">{r.userName ?? "—"}</span>
                        <span className="block text-[11px] text-white/35">ID {r.userId ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-white/70">{r.leaveType}</td>
                      <td className="px-4 py-3 text-white/50">{r.year ?? "—"}</td>
                      <td className="px-4 py-3 text-white/60">{r.totalDays}</td>
                      <td className="px-4 py-3 text-white/60">{r.usedDays}</td>
                      <td className="px-4 py-3 text-white/60">{r.pendingDays ?? 0}</td>
                      <td className="px-4 py-3 text-emerald-400/90 font-medium">{r.remainingDays}</td>
                      <td className="px-4 py-3 text-white/50">{r.carryForwardDays ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && totalElements > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-white/[0.06] text-white/35 text-xs">
              <span>
                Showing{" "}
                <span className="text-white/60">
                  {filtered.length === rows.length ? rows.length : `${filtered.length} / ${rows.length}`}
                </span>{" "}
                rows ·{" "}
                <span className="text-white/60">
                  {totalElements} total
                </span>{" "}
                · Page <span className="text-white/60">{pageHuman}</span> of{" "}
                <span className="text-white/60">{Math.max(1, totalPages)}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 text-xs font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-white/70 text-xs font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
