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
import { Toast } from "@/app/components/Toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Shown only if policy API fails (offline / old server). */
const FALLBACK_LEAVE_TYPES = ["SICK", "CASUAL", "ANNUAL", "EIDULFITAR", "EIDULAZHA", "UNPAID"] as const;

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
  return types
    .filter((type) => type.toUpperCase() !== "UNPAID") // UNPAID has no quota/balance to estimate
    .map((type) => {
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
  if (p.applyBeforeDays != null && p.applyBeforeDays > 0) {
    lines.push(`⏰ Advance notice: Must apply at least ${p.applyBeforeDays} day(s) in advance of start date.`);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    let base: string[];

    if (!policies || policies.length === 0) {
      base = [...FALLBACK_LEAVE_TYPES];
    } else {
      const allTypes = [...policies]
        .sort((a, b) => a.leaveType.localeCompare(b.leaveType))
        .map((p) => p.leaveType);

      // If the server has returned balance data, only show leave types that
      // the employee actually has a balance for (e.g. ANNUAL won't appear
      // until they've completed 1 year of service).
      const serverBalances = serverBalanceQuery.data;
      if (serverBalanceQuery.isSuccess && Array.isArray(serverBalances) && serverBalances.length > 0) {
        const balanceTypes = new Set(serverBalances.map((b: LeaveBalanceDto) => b.leaveType.toUpperCase()));
        const filtered = allTypes.filter((t) => balanceTypes.has(t.toUpperCase()));
        base = filtered.length > 0 ? filtered : allTypes;
      } else {
        base = allTypes;
      }
    }

    // UNPAID has no LeavePolicy row and no LeaveBalance row on the server
    // (nothing is deducted from any balance), so /api/leave/policy and
    // /api/leave/balance/* never return it. Add it manually so every
    // employee — not just those on probation — can select it, e.g. once
    // their other balances are exhausted.
    if (!base.some((t) => t.toUpperCase() === "UNPAID")) {
      base = [...base, "UNPAID"];
    }

    return base;
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
  const isUnpaidSelected = form.leaveType.toUpperCase() === "UNPAID";

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
      // UNPAID never has a balance row on the server — exclude it from the
      // cards grid even if it somehow appears (nothing to display: no quota).
      return { source: "server", rows: raw.filter((r) => r.leaveType.toUpperCase() !== "UNPAID") };
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
    mutationFn: (attachmentUrl: string | null) =>
      leaveApi.apply({
        userId: userId!,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        attachmentUrl: attachmentUrl || null,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["employee-leaves", userId] });
      qc.invalidateQueries({ queryKey: ["employee-leave-balance", userId] });
      setForm((f) => ({ ...f, startDate: "", endDate: "", reason: "" }));
      setSelectedFile(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setToast({ message: "Start date, end date, and reason are required.", type: "error" });
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setToast({ message: "End date cannot be before start date.", type: "error" });
      return;
    }

    let uploadedUrl: string | null = null;
    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadResult = await leaveApi.uploadAttachment(selectedFile);
        uploadedUrl = uploadResult.fileUrl;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "File upload failed";
        setToast({ message: `Failed to upload attachment: ${errMsg}`, type: "error" });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    applyMutation.mutate(uploadedUrl);
  };

  const requestedDays = inclusiveDays(form.startDate, form.endDate);

  const advanceNoticeDiff = useMemo(() => {
    if (!form.startDate || !selectedPolicy || selectedPolicy.applyBeforeDays == null || selectedPolicy.applyBeforeDays <= 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(`${form.startDate}T00:00:00`);
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / 86_400_000);
    return {
      diffDays,
      requiredDays: selectedPolicy.applyBeforeDays,
      isShortNotice: diffDays < selectedPolicy.applyBeforeDays,
    };
  }, [form.startDate, selectedPolicy]);

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
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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
            {/* Informational tile for UNPAID — it has no balance, so it isn't in balanceRows.rows */}
            <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">UNPAID</p>
              <p className="text-xl font-bold text-white/60 mt-1">∞</p>
              <p className="text-[11px] text-white/35 mt-0.5">No quota · always available</p>
            </div>
          </div>
        )}
      </div>

      {/* Company Leave Policies & Advance Notice Guide */}
      {policiesQuery.data && policiesQuery.data.length > 0 && (
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <span>📜</span> Company Leave Policies &amp; Advance Notice Rules
            </h2>
            <span className="text-[11px] text-white/35">Set by HR policy</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-white/70">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/40 uppercase text-[10px] tracking-wider">
                  <th className="pb-2 font-medium">Leave Type</th>
                  <th className="pb-2 font-medium">Quota / Year</th>
                  <th className="pb-2 font-medium">Advance Notice Required</th>
                  <th className="pb-2 font-medium">1-Year Service Rule</th>
                  <th className="pb-2 font-medium">Carry Forward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {policiesQuery.data.map((p) => (
                  <tr key={p.id ?? p.leaveType} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 font-semibold text-white/90">{p.leaveType}</td>
                    <td className="py-2.5 text-white/70">{p.totalDaysPerYear} day(s)</td>
                    <td className="py-2.5">
                      {p.applyBeforeDays != null && p.applyBeforeDays > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/25">
                          <span>⏰</span> Apply at least {p.applyBeforeDays} day(s) before
                        </span>
                      ) : (
                        <span className="text-white/30">No advance notice limit</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {p.requiresOneYear ? (
                        <span className="inline-flex items-center text-sky-300 font-medium bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          1 year required
                        </span>
                      ) : (
                        <span className="text-white/30">Immediate</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {p.carryForward ? (
                        <span className="text-emerald-300">Up to {p.maxCarryForwardDays} day(s)</span>
                      ) : (
                        <span className="text-white/30">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          {selectedPolicy ? (
            <div className="sm:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] text-white/50 space-y-1">
              <p className="text-white/70 font-medium text-xs">Policy: {selectedPolicy.leaveType}</p>
              <ul className="list-disc list-inside space-y-0.5">
                {policySummary(selectedPolicy).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : isUnpaidSelected ? (
            <div className="sm:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[11px] text-white/50 space-y-1">
              <p className="text-white/70 font-medium text-xs">Policy: UNPAID</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>No fixed quota — not deducted from any leave balance.</li>
                <li>Available to all employees, including those on probation.</li>
              </ul>
            </div>
          ) : null}
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
          {advanceNoticeDiff && advanceNoticeDiff.isShortNotice && (
            <div className="sm:col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">⚠️</span>
              <div>
                <p className="font-semibold text-amber-200">Advance Notice Requirement</p>
                <p className="text-amber-300/80 text-xs mt-0.5">
                  {selectedPolicy?.leaveType} leave requires at least <span className="font-bold underline">{advanceNoticeDiff.requiredDays} day(s)</span> advance notice.
                  {advanceNoticeDiff.diffDays <= 0
                    ? " Your chosen start date is today or in the past."
                    : ` Your chosen start date is only ${advanceNoticeDiff.diffDays} day(s) away.`}
                </p>
              </div>
            </div>
          )}
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
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Attachment (Optional)</label>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="file"
                id="leave-file"
                className="hidden"
                disabled={isUploading || applyMutation.isPending}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="leave-file"
                className="cursor-pointer px-4 py-2 text-xs font-medium rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                Choose File
              </label>
              {selectedFile ? (
                <div className="flex items-center gap-2 text-xs text-white/70 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                  <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-white/40 hover:text-rose-400 font-semibold"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span className="text-xs text-white/30">No file selected (PDF, PNG, JPG)</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUploading || applyMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {isUploading ? "Uploading file..." : applyMutation.isPending ? "Submitting request..." : "Submit request"}
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
                  <th className="px-4 py-3 font-medium">Attachment</th>
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
                      <td className="px-4 py-3 text-xs">
                        {row.attachmentUrl ? (
                          <a
                            href={`${BASE_URL}${row.attachmentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                            Download
                          </a>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
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
