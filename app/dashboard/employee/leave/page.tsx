"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import {
  leaveApi,
  leavePolicyApi,
  LeaveDto,
  LeaveBalanceDto,
  LeavePolicyDto,
} from "@/services/leaveApi";

/** Shown only if policy API fails (offline / old server). */
const FALLBACK_LEAVE_TYPES = ["SICK", "CASUAL", "ANNUAL", "EIDULFITAR", "EIDULAZHA"] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  REJECT: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  REJECTED: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  CANCELLED: "bg-white/10 text-white/50 border-white/15",
};

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function countsTowardBalance(status: string) {
  const s = status?.toUpperCase();
  return s === "PENDING" || s === "APPROVED";
}

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

function estimateBalancesFromLeaves(
  leaves: LeaveDto[],
  year: number,
  types: readonly string[],
  defaultQuota: (t: string) => number
): LeaveBalanceDto[] {
  const used: Partial<Record<string, number>> = {};
  for (const l of leaves) {
    if (!countsTowardBalance(l.status)) continue;
    const t = (l.leaveType ?? "").toUpperCase();
    const d = overlapDaysInYear(l.startDate, l.endDate, year);
    used[t] = (used[t] ?? 0) + d;
  }
  return types.map((type) => {
    const entitlement = defaultQuota(type);
    const u = used[type] ?? 0;
    return {
      leaveType: type,
      totalDays: entitlement,
      usedDays: u,
      pendingDays: 0,
      remainingDays: Math.max(0, entitlement - u),
      carryForwardDays: 0,
    };
  });
}

function inclusiveDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = new Date(`${start}T12:00:00`).getTime();
  const b = new Date(`${end}T12:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

function policySummary(p: LeavePolicyDto): string[] {
  const lines: string[] = [`${p.totalDaysPerYear} day(s) per year.`];
  if (p.requiresOneYear) lines.push("Requires 1 year of service (annual eligibility).");
  if (p.carryForward) lines.push(`Carry forward up to ${p.maxCarryForwardDays} unused day(s).`);
  if (p.isPublicHoliday && p.applyBeforeDays != null) {
    lines.push(
      `Public holiday leave: you may apply at most ${p.applyBeforeDays} day(s) before your chosen leave start date (see server validation).`
    );
  }
  return lines;
}

export default function EmployeeLeavePage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [withdrawId, setWithdrawId] = useState<number | null>(null);
  const [form, setForm] = useState({
    leaveType: "CASUAL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const year = new Date().getFullYear();

  const policiesQuery = useQuery({
    queryKey: ["leave-policies"],
    queryFn: () => leavePolicyApi.getAll(),
    staleTime: 5 * 60_000,
  });

  const serverBalanceQuery = useQuery({
    queryKey: ["employee-leave-balance", userId],
    queryFn: () => leaveApi.getBalancesForEmployee(userId!),
    enabled: typeof userId === "number",
  });

  const leaveTypes = useMemo(() => {
    const policies = policiesQuery.data;
    if (!policies || policies.length === 0) return [...FALLBACK_LEAVE_TYPES];

    const allTypes = [...policies].sort((a, b) => a.leaveType.localeCompare(b.leaveType)).map((p) => p.leaveType);

    // If the server has returned balance data, only show leave types that
    // the employee actually has a balance for (e.g. ANNUAL won't appear
    // until they've completed 1 year of service).
    const serverBalances = serverBalanceQuery.data;
    if (serverBalanceQuery.isSuccess && Array.isArray(serverBalances) && serverBalances.length > 0) {
      const balanceTypes = new Set(serverBalances.map((b: LeaveBalanceDto) => b.leaveType.toUpperCase()));
      const filtered = allTypes.filter((t) => balanceTypes.has(t.toUpperCase()));
      return filtered.length > 0 ? filtered : allTypes;
    }

    return allTypes;
  }, [policiesQuery.data, serverBalanceQuery.isSuccess, serverBalanceQuery.data]);

  useEffect(() => {
    if (leaveTypes.length === 0) return;
    setForm((f) => (leaveTypes.includes(f.leaveType) ? f : { ...f, leaveType: leaveTypes[0]! }));
  }, [leaveTypes]);

  const policiesByType = useMemo(() => {
    const m = new Map<string, LeavePolicyDto>();
    for (const p of policiesQuery.data ?? []) m.set(p.leaveType.toUpperCase(), p);
    return m;
  }, [policiesQuery.data]);

  const selectedPolicy = policiesByType.get(form.leaveType.toUpperCase()) ?? null;

  const leavesQuery = useQuery({
    queryKey: ["employee-leaves", userId],
    queryFn: () => leaveApi.getByUserId(userId!),
    enabled: typeof userId === "number",
  });



  const defaultQuota = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of policiesQuery.data ?? []) m[p.leaveType.toUpperCase()] = p.totalDaysPerYear;
    return (t: string) => m[t] ?? 0;
  }, [policiesQuery.data]);

  const balanceRows: { source: "server" | "estimated"; rows: LeaveBalanceDto[] } = useMemo(() => {
    const raw = serverBalanceQuery.data;
    const serverReturned = serverBalanceQuery.isSuccess && raw !== null && raw !== undefined;
    if (serverReturned) {
      return { source: "server", rows: raw };
    }
    const types = leaveTypes.length ? leaveTypes : [...FALLBACK_LEAVE_TYPES];
    return {
      source: "estimated",
      rows: estimateBalancesFromLeaves(leavesQuery.data ?? [], year, types, defaultQuota),
    };
  }, [serverBalanceQuery.isSuccess, serverBalanceQuery.data, leavesQuery.data, year, leaveTypes, defaultQuota]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employee-leaves", userId] });
      qc.invalidateQueries({ queryKey: ["employee-leave-balance", userId] });
      setForm((f) => ({ ...f, startDate: "", endDate: "", reason: "" }));
      const extra =
        data.remainingDaysAfterRequest != null
          ? ` Remaining ${data.leaveType ?? "leave"}: ${data.remainingDaysAfterRequest} day(s).`
          : "";
      setToast({ message: `Leave request submitted.${extra}`, type: "success" });
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Could not submit leave.", type: "error" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: number) => leaveApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-leaves", userId] });
      qc.invalidateQueries({ queryKey: ["employee-leave-balance", userId] });
      setWithdrawId(null);
      setToast({ message: "Leave withdrawn.", type: "success" });
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Could not withdraw leave.", type: "error" });
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

  const requestedDays = inclusiveDays(form.startDate, form.endDate);

  if (typeof userId !== "number") {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Your account is missing required user information. Please contact support.
      </div>
    );
  }

  const leaves = leavesQuery.data ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
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
        <p className="text-white/40 text-sm mt-1">Policies and balances follow HR rules on the server.</p>
      </div>

      {/* Leave balance */}
      <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-white/80">Leave balance ({year})</h2>
          <p className="text-[11px] text-white/35">
            {balanceRows.source === "server"
              ? "From leave balance API (current year)."
              : "Estimated from your requests + policy days (balance API unavailable)."}
          </p>
        </div>
        {serverBalanceQuery.isLoading || leavesQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-white/[0.06] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {balanceRows.rows.map((row) => (
              <div
                key={row.leaveType}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{row.leaveType}</p>
                <p className="text-xl font-bold text-white/90 mt-1">{row.remainingDays}</p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  {row.usedDays} used
                  {(row.pendingDays ?? 0) > 0 ? ` · ${row.pendingDays} pending` : ""}
                  {balanceRows.source === "server" ? ` · ${row.totalDays} total` : ""}
                </p>
                {(row.carryForwardDays ?? 0) > 0 && (
                  <p className="text-[10px] text-indigo-300/90 mt-1">+{row.carryForwardDays} carry forward</p>
                )}
              </div>
            ))}
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
              onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              {leaveTypes.map((t) => (
                <option key={t} value={t} className="bg-[#1a1d28]">
                  {t}
                </option>
              ))}
            </select>
          </div>
          {selectedPolicy && (
            <div className="sm:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] text-white/50 space-y-1">
              <p className="text-white/70 font-medium text-xs">Policy: {selectedPolicy.leaveType}</p>
              <ul className="list-disc list-inside space-y-0.5">
                {policySummary(selectedPolicy).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
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
          {requestedDays > 0 && (
            <p className="sm:col-span-2 text-xs text-white/40">
              Request spans <span className="text-white/70 font-medium">{requestedDays}</span> calendar day(s)
              (server uses the same inclusive count for balance).
            </p>
          )}
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
                  <th className="px-4 py-3 font-medium">Days</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium w-28"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leaves.map((row: LeaveDto) => {
                  const dur =
                    row.durationDays ??
                    inclusiveDays(row.startDate?.slice(0, 10) ?? "", row.endDate?.slice(0, 10) ?? "");
                  return (
                    <tr key={row.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">{row.leaveType}</td>
                      <td className="px-4 py-3 text-white/60">
                        {fmt(row.startDate)} → {fmt(row.endDate)}
                      </td>
                      <td className="px-4 py-3 text-white/50">{dur || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${
                            STATUS_STYLES[row.status] ?? "bg-white/5 text-white/50 border-white/10"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/50 max-w-[140px] truncate" title={row.reason}>
                        {row.reason ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => setWithdrawId(row.id)}
                            className="text-xs text-white/40 hover:text-rose-300 underline-offset-2 hover:underline"
                          >
                            Withdraw
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {withdrawId != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <p className="text-white/90 text-sm font-medium">Withdraw this request?</p>
            <p className="text-white/45 text-xs mt-2">Only pending requests can be withdrawn; balance pending days are released on the server.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setWithdrawId(null)}
                className="px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={withdrawMutation.isPending}
                onClick={() => withdrawMutation.mutate(withdrawId)}
                className="px-3 py-2 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                {withdrawMutation.isPending ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
