"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { leaveApi, LeaveDto, LeaveBalanceDto } from "@/services/leaveApi";

const LEAVE_TYPES = ["SICK", "CASUAL", "ANNUAL", "MATERNITY", "PATERNITY", "EMERGENCY", "UNPAID"] as const;

/** Used only when the backend does not provide `GET /api/leave/balance/user/{userId}`. Adjust to match your HR policy. */
const DEFAULT_ENTITLEMENT_DAYS: Partial<Record<(typeof LEAVE_TYPES)[number], number>> = {
  ANNUAL: 14,
  SICK: 10,
  CASUAL: 7,
  MATERNITY: 90,
  PATERNITY: 15,
  EMERGENCY: 5,
  UNPAID: Number.POSITIVE_INFINITY,
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  REJECT: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  REJECTED: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function countsTowardBalance(status: string) {
  const s = status?.toUpperCase();
  return s === "PENDING" || s === "APPROVED";
}

/** Inclusive calendar days overlapping [year Jan 1 … Dec 31]. */
function overlapDaysInYear(startStr: string, endStr: string, year: number): number {
  const start = new Date(`${startStr.slice(0, 10)}T12:00:00`);
  const end = new Date(`${endStr.slice(0, 10)}T12:00:00`);
  const y0 = new Date(year, 0, 1);
  const y1 = new Date(year, 11, 31, 23, 59, 59);
  const lo = start.getTime() > y0.getTime() ? start : y0;
  const hi = end.getTime() < y1.getTime() ? end : y1;
  if (lo.getTime() > hi.getTime()) return 0;
  return Math.floor((hi.getTime() - lo.getTime()) / 86_400_000) + 1;
}

function estimateBalancesFromLeaves(leaves: LeaveDto[], year: number): LeaveBalanceDto[] {
  const used: Partial<Record<string, number>> = {};
  for (const l of leaves) {
    if (!countsTowardBalance(l.status)) continue;
    const t = (l.leaveType ?? "").toUpperCase();
    const d = overlapDaysInYear(l.startDate, l.endDate, year);
    used[t] = (used[t] ?? 0) + d;
  }
  return LEAVE_TYPES.map((type) => {
    const entitlement = DEFAULT_ENTITLEMENT_DAYS[type] ?? 0;
    const u = used[type] ?? 0;
    if (!Number.isFinite(entitlement)) {
      return { leaveType: type, totalDays: 0, usedDays: u, remainingDays: u };
    }
    return {
      leaveType: type,
      totalDays: entitlement,
      usedDays: u,
      remainingDays: Math.max(0, entitlement - u),
    };
  });
}

export default function EmployeeLeavePage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({
    leaveType: "CASUAL" as (typeof LEAVE_TYPES)[number],
    startDate: "",
    endDate: "",
    reason: "",
  });

  const year = new Date().getFullYear();

  const leavesQuery = useQuery({
    queryKey: ["employee-leaves", userId],
    queryFn: () => leaveApi.getByUserId(userId!),
    enabled: typeof userId === "number",
  });

  const serverBalanceQuery = useQuery({
    queryKey: ["employee-leave-balance", userId],
    queryFn: () => leaveApi.getBalanceByUserId(userId!),
    enabled: typeof userId === "number",
  });

  const balanceRows: { source: "server" | "estimated"; rows: LeaveBalanceDto[] } = useMemo(() => {
    const server = serverBalanceQuery.data;
    if (server && server.length > 0) {
      return { source: "server", rows: server };
    }
    return {
      source: "estimated",
      rows: estimateBalancesFromLeaves(leavesQuery.data ?? [], year),
    };
  }, [serverBalanceQuery.data, leavesQuery.data, year]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const applyMutation = useMutation({
    mutationFn: () =>
      leaveApi.apply({
        userId: userId!,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-leaves", userId] });
      qc.invalidateQueries({ queryKey: ["employee-leave-balance", userId] });
      setForm((f) => ({ ...f, startDate: "", endDate: "", reason: "" }));
      setToast({ message: "Leave request submitted.", type: "success" });
    },
    onError: () => {
      setToast({ message: "Could not submit leave. Check dates and try again.", type: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setToast({ message: "Start date, end date, and reason are required.", type: "error" });
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setToast({ message: "End date cannot be before start date.", type: "error" });
      return;
    }
    applyMutation.mutate();
  };

  if (typeof userId !== "number") {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Missing <code className="text-amber-100">userId</code> in your JWT — leave cannot be tied to your account.
      </div>
    );
  }

  const leaves = leavesQuery.data ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Apply for leave</h1>
        <p className="text-white/40 text-sm mt-1">Submit a request and track approval status.</p>
      </div>

      {/* Leave balance */}
      <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-white/80">Leave balance ({year})</h2>
          <p className="text-[11px] text-white/35">
            {balanceRows.source === "server"
              ? "From HR (API)"
              : "Estimated: approved + pending this year vs default entitlements (configure in code or add GET /api/leave/balance/user/{userId})."}
          </p>
        </div>
        {leavesQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-white/[0.06] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {balanceRows.rows.map((row) => {
              const isUnlimited = row.leaveType === "UNPAID" && balanceRows.source === "estimated";
              return (
                <div
                  key={row.leaveType}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{row.leaveType}</p>
                  <p className="text-xl font-bold text-white/90 mt-1">
                    {isUnlimited ? "—" : row.remainingDays}
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    {isUnlimited
                      ? `${row.usedDays} day(s) used (unpaid)`
                      : `${row.usedDays} / ${row.totalDays} days used`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-white/80">New request</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Leave type</label>
            <select
              value={form.leaveType}
              onChange={(e) =>
                setForm((f) => ({ ...f, leaveType: e.target.value as (typeof LEAVE_TYPES)[number] }))
              }
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#1a1d28]">
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Start date</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider">End date</label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Reason</label>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Brief reason for your leave"
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={applyMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {applyMutation.isPending ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-white/80 mb-3">My requests</h2>
        {leavesQuery.isLoading ? (
          <div className="animate-pulse h-32 rounded-2xl bg-white/[0.04]" />
        ) : leavesQuery.isError ? (
          <p className="text-rose-400 text-sm">Could not load your leave history.</p>
        ) : leaves.length === 0 ? (
          <p className="text-white/40 text-sm">No leave requests yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#13151e]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leaves.map((row: LeaveDto) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white/80">{row.leaveType}</td>
                    <td className="px-4 py-3 text-white/60">
                      {fmt(row.startDate)} → {fmt(row.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${
                          STATUS_STYLES[row.status] ?? "bg-white/5 text-white/50 border-white/10"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50 max-w-xs truncate" title={row.reason}>
                      {row.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
