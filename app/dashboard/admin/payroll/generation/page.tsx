"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { payrollApi, PayrollPeriodDTO, PayrollDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inputClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors";

const selectClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#1a1d2e] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors";

function StatusPill({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    APPROVED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    REVIEWED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    DRAFT: "bg-white/5 text-white/40 border-white/10",
  };
  const cls = styles[status || "DRAFT"] || styles.DRAFT;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cls}`}>
      {status || "DRAFT"}
    </span>
  );
}

export default function PayrollGenerationPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriodDTO[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodDTO | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [periodFormData, setPeriodFormData] = useState({
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    department: "",
    company: "",
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await payrollApi.getAllPayrollPeriods();
      setPeriods(data);
    } catch (error) {
      console.error("Failed to load payroll periods:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrolls = async (periodId: number) => {
    try {
      const data = await payrollApi.getPayrollsByPeriod(periodId);
      setPayrolls(data);
    } catch (error) {
      console.error("Failed to load payrolls:", error);
    }
  };

  const handlePeriodSelect = (period: PayrollPeriodDTO) => {
    setSelectedPeriod(period);
    loadPayrolls(period.id);
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingPeriod(true);
      await payrollApi.createPayrollPeriod({
        month: periodFormData.month,
        year: periodFormData.year,
        department: periodFormData.department || undefined,
        company: periodFormData.company || undefined,
        locked: false,
      });
      setShowCreatePeriodModal(false);
      setPeriodFormData({
        month: MONTHS[new Date().getMonth()],
        year: new Date().getFullYear(),
        department: "",
        company: "",
      });
      await loadPeriods();
    } catch (error) {
      console.error("Failed to create payroll period:", error);
    } finally {
      setCreatingPeriod(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedPeriod) return;
    if (!user?.id) {
      setErrorMsg("Cannot identify current user.");
      return;
    }
    try {
      setErrorMsg(null);
      setTogglingLock(true);
      const updated = selectedPeriod.locked
        ? await payrollApi.unlockPayrollPeriod(selectedPeriod.id, user.id)
        : await payrollApi.lockPayrollPeriod(selectedPeriod.id, user.id);
      setSelectedPeriod(updated);
      setPeriods((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMsg(selectedPeriod.locked ? `Failed to unlock period: ${msg}` : `Failed to lock period: ${msg}`);
    } finally {
      setTogglingLock(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!selectedPeriod) return;
    if (!user?.id) {
      setErrorMsg("Cannot identify current user.");
      return;
    }
    try {
      setErrorMsg(null);
      setGenerating(true);
      await payrollApi.generateBulkPayroll(selectedPeriod.id, user.id);
      await loadPayrolls(selectedPeriod.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMsg(`Failed to generate payroll: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (payrollId: number) => {
    if (!user?.id) return;
    try {
      await payrollApi.approvePayroll(payrollId, user.id);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed to approve payroll:", error);
    }
  };

  const handleMarkAsPaid = async (payrollId: number) => {
    try {
      await payrollApi.markAsPaid(payrollId);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed to mark payroll as paid:", error);
    }
  };

  const handleRegenerate = async (payrollId: number) => {
    try {
      await payrollApi.regeneratePayroll(payrollId);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed to regenerate payroll:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] p-6 text-white/90">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin/payroll"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition"
              title="Back to Payroll Dashboard"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white/90">Payroll Generation</h1>
              <p className="text-sm text-white/35 mt-0.5">Generate period-based payrolls with actual calendar-day calculations</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreatePeriodModal(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition"
          >
            + Create Period
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Period Selection Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-white/90">Select Payroll Period</h2>
            <div className="space-y-2">
              {periods.map((period) => {
                const isSelected = selectedPeriod?.id === period.id;
                return (
                  <button
                    key={period.id}
                    onClick={() => handlePeriodSelect(period)}
                    className={`w-full text-left p-3.5 rounded-xl transition border ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500/40 text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-white/70 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="font-semibold text-sm">{period.month} {period.year}</div>
                    <div className="text-xs text-white/40 mt-1">
                      {period.locked ? "🔒 Locked" : "🔓 Open"}
                      {period.department && ` • ${period.department}`}
                    </div>
                  </button>
                );
              })}
              {periods.length === 0 && (
                <p className="text-white/30 text-sm py-4 text-center">No payroll periods available</p>
              )}
            </div>
          </div>

          {/* Payroll Actions & Table */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPeriod ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-base font-semibold text-white/90">
                      {selectedPeriod.month} {selectedPeriod.year}
                    </h2>
                    <p className="text-xs text-white/40">
                      {selectedPeriod.department || "All Departments"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleToggleLock}
                      disabled={togglingLock}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition disabled:opacity-50 ${
                        selectedPeriod.locked
                          ? "bg-white/[0.05] text-white/80 border-white/[0.1] hover:bg-white/[0.1]"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25"
                      }`}
                    >
                      {togglingLock
                        ? "Wait..."
                        : selectedPeriod.locked
                        ? "Unlock Period"
                        : "Lock Period"}
                    </button>

                    {selectedPeriod.locked ? (
                      <button
                        onClick={handleBulkGenerate}
                        disabled={generating}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition shadow-lg shadow-indigo-600/25"
                      >
                        {generating ? "Generating..." : "Generate Payroll"}
                      </button>
                    ) : (
                      <span className="px-3 py-2 bg-white/[0.04] text-white/40 border border-white/[0.08] rounded-xl text-xs flex items-center">
                        Lock period to generate
                      </span>
                    )}
                  </div>
                </div>

                {payrolls.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[650px]">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {["Employee", "Basic Salary", "Present", "Gross Salary", "Net Salary", "Status", ""].map((h) => (
                            <th key={h} className={`px-4 py-3 text-white/30 uppercase text-[11px] font-medium ${h === "" ? "text-right" : "text-left"}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {payrolls.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 font-medium text-white/85">
                              {p.userName || `Employee ${p.userId}`}
                            </td>
                            <td className="px-4 py-3 text-white/60">
                              Rs. {(p.basicSalary || p.salary || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-white/50">{p.presentDays || 0} days</td>
                            <td className="px-4 py-3 text-white/60">
                              Rs. {(p.grossSalary || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-medium text-indigo-400">
                              Rs. {(p.netSalary || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill status={p.status} />
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-semibold space-x-2">
                              {p.status === "DRAFT" && (
                                <button
                                  onClick={() => handleApprove(p.id)}
                                  className="text-indigo-400 hover:text-indigo-300"
                                >
                                  Approve
                                </button>
                              )}
                              {p.status === "APPROVED" && (
                                <button
                                  onClick={() => handleMarkAsPaid(p.id)}
                                  className="text-emerald-400 hover:text-emerald-300"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {(p.status === "DRAFT" || p.status === "REVIEWED") && (
                                <button
                                  onClick={() => handleRegenerate(p.id)}
                                  className="text-amber-400 hover:text-amber-300"
                                >
                                  Regenerate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-white/30 text-sm">
                    No payroll records generated for this period yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center text-white/30 text-sm">
                Select a payroll period from the left menu to manage and generate payrolls.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showCreatePeriodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowCreatePeriodModal(false)}
        >
          <div
            className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white/90 mb-4">Create Payroll Period</h2>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Month
                </label>
                <select
                  value={periodFormData.month}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, month: e.target.value })}
                  className={selectClass}
                  required
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m} className="bg-[#1a1d2e] text-white">{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Year
                </label>
                <input
                  type="number"
                  value={periodFormData.year}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, year: Number(e.target.value) })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Department <span className="text-white/20">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={periodFormData.department}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, department: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePeriodModal(false)}
                  className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPeriod}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50"
                >
                  {creatingPeriod ? "Creating..." : "Create Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
