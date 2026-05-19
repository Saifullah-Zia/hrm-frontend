"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  resignationApi,
  ResignationResponse,
  ResignationType,
  resignationStatusBadgeClass,
  resignationTypeLabel,
} from "@/services/resignationApi";
import { employeeProfileApi } from "@/services/employeeProfileApi";

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const RESIGNATION_TYPES: ResignationType[] = [
  "VOLUNTARY",
  "INVOLUNTARY",
  "RETIREMENT",
  "CONTRACT_END",
  "MUTUAL_SEPARATION",
];

type ToastState = { message: string; type: "success" | "error" } | null;

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        style={{ animation: "scaleIn 0.2s ease" }}
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-2xl mb-4">
          ↩️
        </div>
        <h3 className="text-white/90 font-semibold text-lg mb-1">
          Withdraw Resignation
        </h3>
        <p className="text-white/40 text-sm mb-5">
          Please provide a reason for withdrawing your resignation.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for withdrawal…"
          className="w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none mb-5"
        />
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !reason.trim()}
            className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/25 text-sm font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50"
          >
            {loading ? "Withdrawing…" : "Withdraw"}
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

// ─── Status Card ──────────────────────────────────────────────────────────────

function ActiveResignationCard({
  r,
  onWithdraw,
}: {
  r: ResignationResponse;
  onWithdraw: () => void;
}) {
  const progress =
    r.totalTasks > 0
      ? Math.round((r.completedTasks / r.totalTasks) * 100)
      : 0;

  return (
    <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1">
            Your Resignation
          </p>
          <h2 className="text-white/90 text-lg font-semibold">
            Submitted {fmt(r.resignationDate)}
          </h2>
        </div>
        <span
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${resignationStatusBadgeClass(r.status)}`}
        >
          {r.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Last Working Day", value: fmt(r.lastWorkingDay) },
          { label: "Notice Period End", value: fmt(r.noticePeriodEndDate) },
          { label: "Type", value: resignationTypeLabel(r.resignationType) },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3"
          >
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <p className="text-white/80 text-sm font-medium">{item.value}</p>
          </div>
        ))}
      </div>

      {r.reason && (
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
          <p className="text-[10px] text-white/35 uppercase tracking-wider mb-1">
            Reason
          </p>
          <p className="text-white/70 text-sm leading-relaxed">{r.reason}</p>
        </div>
      )}

      {r.hrComments && (
        <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4">
          <p className="text-[10px] text-indigo-400/60 uppercase tracking-wider mb-1">
            HR Comments
          </p>
          <p className="text-indigo-200/70 text-sm leading-relaxed">
            {r.hrComments}
          </p>
          {r.approvedByName && (
            <p className="text-indigo-400/40 text-xs mt-1">
              — {r.approvedByName}, {fmt(r.approvedAt)}
            </p>
          )}
        </div>
      )}

      {/* Offboarding progress */}
      {r.totalTasks > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
              Offboarding Checklist
            </p>
            <span className="text-indigo-400 text-xs font-semibold">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-400">✓ {r.completedTasks} done</span>
            <span className="text-amber-400">⏳ {r.pendingTasks} pending</span>
            <span className="text-white/30">/ {r.totalTasks} total</span>
          </div>
        </div>
      )}

      {(r.status === "PENDING" || r.status === "APPROVED") && (
        <button
          onClick={onWithdraw}
          className="text-xs text-rose-400/70 hover:text-rose-400 underline-offset-2 hover:underline transition-colors"
        >
          Withdraw resignation
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeeResignationPage() {
  const { user } = useAuthStore();
  const authUserId = user?.userId; // This is the User/auth ID

  // The backend `employeeId` refers to EmployeeProfile.id — NOT the User ID.
  // We resolve it once on mount via the profile API.
  const [profileId, setProfileId] = useState<number | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [resignations, setResignations] = useState<ResignationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawTargetId, setWithdrawTargetId] = useState<number | null>(null);

  const [form, setForm] = useState({
    resignationDate: "",
    lastWorkingDay: "",
    reason: "",
    resignationType: "VOLUNTARY" as ResignationType,
  });

  // Step 1 — resolve EmployeeProfile ID from auth User ID
  useEffect(() => {
    if (authUserId == null) return;
    employeeProfileApi
      .getForEmployeeAccount(authUserId, { email: user?.email })
      .then((profile) => {
        const id = profile.id ?? null;
        if (!id) {
          setProfileError("Your employee profile has no ID. Please contact HR.");
        } else {
          setProfileId(id);
        }
      })
      .catch((err: Error) => {
        setProfileError(err.message || "Could not load your employee profile.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  // Step 2 — once we have the real profile ID, fetch resignations
  const load = async (empProfileId: number) => {
    setLoading(true);
    try {
      const data = await resignationApi.getByEmployee(empProfileId);
      setResignations(data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
    } catch {
      setToast({ message: "Failed to load resignations", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId != null) load(profileId);
    else if (profileError) setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, profileError]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const activeResignation = useMemo(
    () =>
      resignations.find(
        (r) => r.status === "PENDING" || r.status === "APPROVED"
      ) ?? null,
    [resignations]
  );

  const hasActive = activeResignation !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileId == null) {
      setToast({ message: "Employee profile not loaded yet. Please wait.", type: "error" });
      return;
    }
    if (!form.resignationDate || !form.lastWorkingDay || !form.reason.trim()) {
      setToast({ message: "All fields are required", type: "error" });
      return;
    }
    if (form.lastWorkingDay < form.resignationDate) {
      setToast({
        message: "Last working day cannot be before resignation date",
        type: "error",
      });
      return;
    }
    setSubmitting(true);
    try {
      // Use profileId (EmployeeProfile.id), NOT authUserId (User.id)
      const created = await resignationApi.submit({
        employeeId: profileId,
        resignationDate: form.resignationDate,
        lastWorkingDay: form.lastWorkingDay,
        reason: form.reason.trim(),
        resignationType: form.resignationType,
      });
      setResignations((prev) => [created, ...prev]);
      setForm({
        resignationDate: "",
        lastWorkingDay: "",
        reason: "",
        resignationType: "VOLUNTARY",
      });
      setToast({
        message: "Resignation submitted successfully. HR will review it shortly.",
        type: "success",
      });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to submit resignation", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (reason: string) => {
    if (withdrawTargetId == null) return;
    setWithdrawing(true);
    try {
      const updated = await resignationApi.withdraw(withdrawTargetId, reason);
      setResignations((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setToast({ message: "Resignation withdrawn successfully", type: "success" });
      setShowWithdraw(false);
      setWithdrawTargetId(null);
    } catch (err: any) {
      setToast({ message: err.message || "Failed to withdraw", type: "error" });
    } finally {
      setWithdrawing(false);
    }
  };

  if (authUserId == null) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Missing <code className="text-amber-100">userId</code> in your session.
        Please log out and log in again.
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 space-y-1">
        <p className="font-semibold">Could not load employee profile</p>
        <p className="text-rose-300/70">{profileError}</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes scaleIn      { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-md text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/20 border-rose-500/30 text-rose-300"
          }`}
          style={{ animation: "slideInRight 0.3s ease" }}
        >
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Withdraw modal */}
      {showWithdraw && (
        <WithdrawModal
          loading={withdrawing}
          onConfirm={handleWithdraw}
          onCancel={() => {
            setShowWithdraw(false);
            setWithdrawTargetId(null);
          }}
        />
      )}

      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">
            Resignation
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Submit or manage your resignation request.
          </p>
        </div>

        {/* Active resignation */}
        {loading ? (
          <div className="h-48 rounded-2xl bg-white/[0.04] animate-pulse" />
        ) : hasActive ? (
          <ActiveResignationCard
            r={activeResignation!}
            onWithdraw={() => {
              setWithdrawTargetId(activeResignation!.id);
              setShowWithdraw(true);
            }}
          />
        ) : (
          /* Submit form */
          <form
            onSubmit={handleSubmit}
            className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6 space-y-5"
          >
            <div>
              <h2 className="text-sm font-semibold text-white/80">
                Submit Resignation
              </h2>
              <p className="text-xs text-white/35 mt-0.5">
                Once submitted, HR will review and respond to your request.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Resignation Type */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                  Resignation Type
                </label>
                <select
                  value={form.resignationType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      resignationType: e.target.value as ResignationType,
                    }))
                  }
                  className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                >
                  {RESIGNATION_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#1a1d28]">
                      {resignationTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resignation Date */}
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                  Resignation Date
                </label>
                <input
                  type="date"
                  required
                  value={form.resignationDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, resignationDate: e.target.value }))
                  }
                  className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>

              {/* Last Working Day */}
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                  Last Working Day
                </label>
                <input
                  type="date"
                  required
                  value={form.lastWorkingDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastWorkingDay: e.target.value }))
                  }
                  className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>

              {/* Reason */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
                  Reason for Leaving
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  placeholder="Please describe your reason for resigning…"
                  className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                />
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-3 text-xs text-amber-200/70 leading-relaxed">
              ⚠️ Once submitted, your resignation will be reviewed by HR. You
              may withdraw it as long as it has not been fully processed.
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {submitting ? "Submitting…" : "Submit Resignation"}
              </button>
            </div>
          </form>
        )}

        {/* History */}
        {!loading && resignations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white/70 mb-3">
              Resignation History
            </h2>
            <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-white/30">
                    <th className="px-5 py-3 font-medium">Submitted</th>
                    <th className="px-5 py-3 font-medium">Last Day</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {resignations.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-white/70">{fmt(r.resignationDate)}</td>
                      <td className="px-5 py-4 text-white/60">{fmt(r.lastWorkingDay)}</td>
                      <td className="px-5 py-4 text-white/50 text-xs">{resignationTypeLabel(r.resignationType)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg border text-xs font-medium ${resignationStatusBadgeClass(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {(r.status === "PENDING" || r.status === "APPROVED") && (
                          <button
                            onClick={() => {
                              setWithdrawTargetId(r.id);
                              setShowWithdraw(true);
                            }}
                            className="text-xs text-white/30 hover:text-rose-400 underline-offset-2 hover:underline transition-colors"
                          >
                            Withdraw
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
