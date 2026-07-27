"use client";

import { useState, useEffect } from "react";
import { payrollApi, PayrollPeriodDTO, PayrollDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function StatusPill({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    APPROVED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    REVIEWED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    DRAFT: "bg-white/5 text-gray-400 border-white/10",
  };
  const cls = styles[status || "DRAFT"] || styles.DRAFT;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${cls}`}>
      {status || "DRAFT"}
    </span>
  );
}

export default function SuperAdminPayrollGenerationPage() {
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
      alert("Failed to create payroll period. Please check details.");
    } finally {
      setCreatingPeriod(false);
    }
  };

  const handleToggleLock = async () => {
    if (!selectedPeriod) return;
    if (!user?.id) {
      setErrorMsg("Cannot identify current user. Please log out and log in again.");
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
      setErrorMsg("Cannot identify current user. Please log out and log in again.");
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
      console.error("Failed to mark as paid:", error);
    }
  };

  const handleRegenerate = async (payrollId: number) => {
    try {
      await payrollApi.regeneratePayroll(payrollId);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      alert("Failed to regenerate. Make sure the period is unlocked.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Generation</h1>
          <p className="text-sm text-gray-500">Generate period-driven payrolls based on month calendar days</p>
        </div>
        <button
          onClick={() => setShowCreatePeriodModal(true)}
          className="px-4 py-2 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition text-sm"
        >
          + Create Payroll Period
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Period Selection */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Select Payroll Period</h2>
          <div className="space-y-2">
            {periods.map((period) => {
              const isSelected = selectedPeriod?.id === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="font-medium text-sm">{period.month} {period.year}</div>
                  <div className={`text-xs ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                    {period.locked ? "🔒 Locked" : "🔓 Open"}
                    {period.department && ` • ${period.department}`}
                  </div>
                </button>
              );
            })}
            {periods.length === 0 && (
              <p className="text-gray-500 text-sm py-4 text-center">No payroll periods available</p>
            )}
          </div>
        </div>

        {/* Payroll Actions & Table */}
        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {selectedPeriod.month} {selectedPeriod.year}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedPeriod.department || "All Departments"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleToggleLock}
                    disabled={togglingLock}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-50 ${
                      selectedPeriod.locked
                        ? "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                        : "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {generating ? "Generating..." : "Generate Payroll"}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium">
                      Lock period to generate
                    </span>
                  )}
                </div>
              </div>

              {payrolls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Employee</th>
                        <th className="px-4 py-3 text-left">Basic Salary</th>
                        <th className="px-4 py-3 text-left">Present Days</th>
                        <th className="px-4 py-3 text-left">Gross Salary</th>
                        <th className="px-4 py-3 text-left">Net Salary</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                      {payrolls.map((payroll) => (
                        <tr key={payroll.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {payroll.userName || `Employee ${payroll.userId}`}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            PKR {(payroll.basicSalary || payroll.salary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">{payroll.presentDays || 0}</td>
                          <td className="px-4 py-3">
                            PKR {(payroll.grossSalary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            PKR {(payroll.netSalary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={payroll.status} />
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-semibold space-x-2">
                            {payroll.status === "DRAFT" && (
                              <button
                                onClick={() => handleApprove(payroll.id)}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Approve
                              </button>
                            )}
                            {payroll.status === "APPROVED" && (
                              <button
                                onClick={() => handleMarkAsPaid(payroll.id)}
                                className="text-green-600 hover:text-green-800 underline"
                              >
                                Mark Paid
                              </button>
                            )}
                            {(payroll.status === "DRAFT" || payroll.status === "REVIEWED") && (
                              <button
                                onClick={() => handleRegenerate(payroll.id)}
                                className="text-orange-600 hover:text-orange-800 underline"
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
                <div className="text-center py-8 text-gray-500 text-sm">
                  No payroll records for this period
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-500 text-sm">
              Select a payroll period from the left menu to generate payrolls.
            </div>
          )}
        </div>
      </div>

      {showCreatePeriodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create Payroll Period</h2>
            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Month</label>
                <select
                  value={periodFormData.month}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, month: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Year</label>
                <input
                  type="number"
                  value={periodFormData.year}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, year: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                  min={2000}
                  max={2100}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Department (Optional)</label>
                <input
                  type="text"
                  value={periodFormData.department}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePeriodModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPeriod}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingPeriod ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
