"use client";

import { useEffect, useState, useMemo } from "react";
import { leaveApi, LeaveBalanceDto } from "@/services/leaveApi";

export default function AdminLeaveBalancesPage() {
  const [rows, setRows] = useState<LeaveBalanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await leaveApi.getAllBalances();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load balances");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Leave balances</h1>
        <p className="text-white/40 text-sm mt-1">
          Current year from <code className="text-indigo-300/90">GET /api/leave/balance/all</code>
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by employee, type, or user id…"
            className="w-full sm:max-w-md px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#13151e] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-white/40 text-sm">Loading…</div>
          ) : error ? (
            <div className="p-6 text-rose-400 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-white/40 text-sm">No balance rows</div>
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
                    <tr key={`${r.userId}-${r.leaveType}-${r.year}`} className="hover:bg-white/[0.02]">
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
        </div>
      </div>
    </div>
  );
}
