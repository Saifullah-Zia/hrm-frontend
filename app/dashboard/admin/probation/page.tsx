"use client";
import { Toast } from "@/app/components/Toast";

import { useCallback, useEffect, useState } from "react";
import {
  probationApi,
  probationStatusBadgeClass,
  UserWithProbationDto,
} from "@/services/probationApi";
import { useAuthStore } from "@/store/authStore";

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return s;
  }
}

export default function AdminProbationPage() {
  const { user } = useAuthStore();
  const adminId = typeof user?.userId === "number" ? user.userId : undefined;

  const [onProbation, setOnProbation] = useState<UserWithProbationDto[]>([]);
  const [pending, setPending] = useState<UserWithProbationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        probationApi.getOnProbation(),
        probationApi.getPendingConfirmation(),
      ]);
      setOnProbation(a);
      setPending(b);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: unknown } }).response?.data ?? "Request failed")
          : e instanceof Error
            ? e.message
            : "Failed to load probation data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);


  const confirm = async (row: UserWithProbationDto) => {
    setActionId(row.id);
    try {
      const msg = await probationApi.confirmProbation(row.id, adminId);
      setToast({ message: msg, type: "success" });
      await load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: unknown } }).response?.data ?? "Confirm failed")
          : e instanceof Error
            ? e.message
            : "Confirm failed";
      setToast({ message: msg, type: "error" });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Probation</h1>
          <p className="text-white/40 text-sm mt-1">
            Track employees on probation and confirm permanent status when probation has completed.
          </p>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {loading ? (
          <p className="text-white/40 text-sm">Loading…</p>
        ) : error ? (
          <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        ) : null}

        {/* Pending HR confirmation */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#13151e] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white/90">Pending confirmation</h2>
              <p className="text-xs text-white/35 mt-0.5">
                Probation period ended — confirm permanent employment ({pending.length})
              </p>
            </div>
          </div>
          {pending.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-white/35 space-y-2 max-w-lg mx-auto">
              <p>No employees awaiting confirmation.</p>
              <p className="text-xs text-white/25 leading-relaxed">
                This list only includes people whose probation has finished and needs an HR confirmation step on the
                server.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {pending.map((row) => (
                <li key={row.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-white/90 font-medium">{row.name}</p>
                    <p className="text-xs text-white/40">{row.email}</p>
                    <p className="text-xs text-white/30 mt-1">
                      Ended {fmtDate(row.probationEndDate ?? undefined)} ·{" "}
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${probationStatusBadgeClass(row.probationStatus)}`}>
                        {row.probationStatus ?? "—"}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={actionId === row.id}
                    onClick={() => confirm(row)}
                    className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/90 text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {actionId === row.id ? "Confirming…" : "Confirm as permanent"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* On probation */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#13151e] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white/90">On probation</h2>
            <p className="text-xs text-white/35 mt-0.5">Active probation periods ({onProbation.length})</p>
          </div>
          {onProbation.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-white/35 space-y-2 max-w-lg mx-auto">
              <p>No employees currently on probation.</p>
              <p className="text-xs text-white/25 leading-relaxed">
                Creating a login alone does not add someone here. They must be marked{" "}
                <span className="text-white/40">ON_PROBATION</span> in your API (for example when saving the user, or
                via a scheduled job). In User Management you can set probation status and dates for employees if your
                backend accepts those fields.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-white/35">
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Start</th>
                    <th className="px-5 py-3 font-medium">End</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {onProbation.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-3">
                        <p className="text-white/85 font-medium">{row.name}</p>
                        <p className="text-xs text-white/35">{row.email}</p>
                      </td>
                      <td className="px-5 py-3 text-white/55">{fmtDate(row.probationStartDate ?? undefined)}</td>
                      <td className="px-5 py-3 text-white/55">{fmtDate(row.probationEndDate ?? undefined)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${probationStatusBadgeClass(row.probationStatus)}`}>
                          {row.probationStatus ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
