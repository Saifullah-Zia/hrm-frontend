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
      alert("Failed to create payroll period. Please check the details and try again.");
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
      console.error("Lock toggle failed:", msg);
      setErrorMsg(
        selectedPeriod.locked
          ? `Failed to unlock period: ${msg}`
          : `Failed to lock period: ${msg}`
      );
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
      console.error("Bulk generate failed:", msg);
      setErrorMsg(`Failed to generate payroll: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (payrollId: number) => {
    if (!user?.id) return;
    try {
      await payrollApi.approvePayroll(payrollId, user.id);
      if (selectedPeriod) {
        await loadPayrolls(selectedPeriod.id);
      }
    } catch (error) {
      console.error("Failed to approve payroll:", error);
    }
  };

  const handleMarkAsPaid = async (payrollId: number) => {
    try {
      await payrollApi.markAsPaid(payrollId);
      if (selectedPeriod) {
        await loadPayrolls(selectedPeriod.id);
      }
    } catch (error) {
      console.error("Failed to mark payroll as paid:", error);
    }
  };

  const handleRegenerate = async (payrollId: number) => {
    try {
      await payrollApi.regeneratePayroll(payrollId);
      if (selectedPeriod) {
        await loadPayrolls(selectedPeriod.id);
      }
    } catch (error) {
      console.error("Failed to regenerate payroll:", error);
      alert("Failed to regenerate. Make sure the period is unlocked.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Payroll Generation</h1>
        <button
          onClick={() => setShowCreatePeriodModal(true)}
          className="px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 transition shadow-lg shadow-pink-500/20"
        >
          + Create Payroll Period
        </button>
      </div>

      {/* Inline error banner */}
      {errorMsg && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm">
          <span className="text-rose-400 mt-0.5">⚠</span>
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 ml-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Period Selection */}
        <div className="bg-[#12131c] border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Select Payroll Period</h2>
          <div className="space-y-2">
            {periods.map((period) => {
              const isSelected = selectedPeriod?.id === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition border ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white border-transparent"
                      : "bg-[#1a1c26] text-gray-300 border-white/5 hover:bg-white/5"
                  }`}
                >
                  <div className="font-medium">{period.month} {period.year}</div>
                  <div className={`text-sm ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                    {period.locked ? "Locked" : "Open"}
                    {period.department && ` - ${period.department}`}
                  </div>
                </button>
              );
            })}
            {periods.length === 0 && (
              <p className="text-gray-500 text-sm">No payroll periods available</p>
            )}
          </div>
        </div>

        {/* Payroll Actions */}
        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <div className="bg-[#12131c] border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedPeriod.month} {selectedPeriod.year}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedPeriod.department || "All Departments"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleToggleLock}
                    disabled={togglingLock}
                    className={`px-4 py-2 rounded-lg font-medium border transition disabled:opacity-50 ${
                      selectedPeriod.locked
                        ? "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                        : "bg-gradient-to-r from-amber-600 to-orange-500 text-white border-transparent hover:opacity-90"
                    }`}
                  >
                    {togglingLock
                      ? "Please wait..."
                      : selectedPeriod.locked
                      ? "Unlock Period"
                      : "Lock Period"}
                  </button>

                  {selectedPeriod.locked ? (
                    <button
                      onClick={handleBulkGenerate}
                      disabled={generating}
                      className="px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {generating ? "Generating..." : "Generate Payroll"}
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg text-sm flex items-center">
                      Period must be locked
                    </span>
                  )}
                </div>
              </div>

              {payrolls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/5">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Basic Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Present Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gross Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Net Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payrolls.map((payroll) => (
                        <tr key={payroll.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {payroll.userName || `Employee ${payroll.userId}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            PKR {payroll.basicSalary?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {payroll.presentDays || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            PKR {payroll.grossSalary?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            PKR {payroll.netSalary?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusPill status={payroll.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {payroll.status === "DRAFT" && (
                              <button
                                onClick={() => handleApprove(payroll.id)}
                                className="text-blue-400 hover:text-blue-300 mr-3"
                              >
                                Approve
                              </button>
                            )}
                            {payroll.status === "APPROVED" && (
                              <button
                                onClick={() => handleMarkAsPaid(payroll.id)}
                                className="text-emerald-400 hover:text-emerald-300 mr-3"
                              >
                                Mark Paid
                              </button>
                            )}
                            {(payroll.status === "DRAFT" || payroll.status === "REVIEWED") && (
                              <button
                                onClick={() => handleRegenerate(payroll.id)}
                                className="text-orange-400 hover:text-orange-300"
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
                <div className="text-center py-8 text-gray-500">
                  No payroll records for this period
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#12131c] border border-white/10 rounded-xl p-6 text-center text-gray-500">
              Select a payroll period to view and generate payrolls
            </div>
          )}
        </div>
      </div>

      {/* Create Payroll Period Modal */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#14161f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create Payroll Period</h2>
            <form onSubmit={handleCreatePeriod}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Month
                </label>
                <select
                  value={periodFormData.month}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, month: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d0e14] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50"
                  required
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m} className="bg-[#0d0e14]">{m}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={periodFormData.year}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, year: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#0d0e14] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50"
                  required
                  min={2000}
                  max={2100}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Department <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={periodFormData.department}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, department: e.target.value })}
                  placeholder="e.g. Engineering (leave blank for all departments)"
                  className="w-full px-3 py-2 bg-[#0d0e14] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Company <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={periodFormData.company}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, company: e.target.value })}
                  placeholder="e.g. JCAT Solutions"
                  className="w-full px-3 py-2 bg-[#0d0e14] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePeriodModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPeriod}
                  className="px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-pink-500/20"
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

