"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { payrollApi, PayrollPeriodDTO, PayrollDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";
import EditPayrollModal from "./_components/EditPayrollModal";

export default function PayrollReviewPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriodDTO[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodDTO | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollDTO[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDTO | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<PayrollDTO | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

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
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to load payrolls:", error);
    }
  };

  const handlePeriodSelect = (period: PayrollPeriodDTO) => {
    setSelectedPeriod(period);
    setSelectedPayroll(null);
    loadPayrolls(period.id);
  };

  const handleViewPayslip = async (payroll: PayrollDTO) => {
    setSelectedPayroll(payroll);
    setShowPayslipModal(true);
  };

  const handleDownloadPdf = async (payrollId: number) => {
    const success = await payrollApi.downloadPayslipPdf(payrollId);
    if (!success) {
      alert("Failed to download payslip PDF");
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(payrolls.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected payroll record(s)?`)) return;

    try {
      setActionLoading(true);
      await payrollApi.deleteBulk(selectedIds);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed bulk delete:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0 || !user?.id) return;
    if (!confirm(`Approve ${selectedIds.length} selected payroll record(s)?`)) return;

    try {
      setActionLoading(true);
      await payrollApi.approveBulk(selectedIds, user.id);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed bulk approve:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const allSelected = payrolls.length > 0 && selectedIds.length === payrolls.length;

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
              <h1 className="text-xl font-semibold text-white/90">Payroll Review & Management</h1>
              <p className="text-sm text-white/35 mt-0.5">
                Select a period, edit employee bonuses, or perform bulk approval and deletion
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Period Selection Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-semibold text-white/90">Select Payroll Period</h2>
            <div className="space-y-2">
              {periods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => handlePeriodSelect(period)}
                  className={`w-full text-left p-3.5 rounded-xl transition border ${
                    selectedPeriod?.id === period.id
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
              ))}
              {periods.length === 0 && (
                <p className="text-white/30 text-sm py-4 text-center">No payroll periods available</p>
              )}
            </div>
          </div>

          {/* Payroll List */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPeriod ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-base font-semibold text-white/90">
                      {selectedPeriod.month} {selectedPeriod.year} Payrolls
                    </h2>
                    <span className="text-xs text-white/40">
                      Total: {payrolls.length} employee record(s)
                    </span>
                  </div>

                  {/* Bulk Action Bar */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-xl text-xs">
                      <span className="font-medium text-indigo-300 px-1">
                        {selectedIds.length} Selected
                      </span>
                      <button
                        onClick={handleBulkApprove}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition disabled:opacity-50"
                      >
                        Approve Selected
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition disabled:opacity-50"
                      >
                        Delete Selected
                      </button>
                    </div>
                  )}
                </div>

                {payrolls.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[750px]">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="px-3 py-3 text-center w-10">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={handleSelectAll}
                              className="rounded border-white/20 bg-white/5 text-indigo-600 cursor-pointer"
                            />
                          </th>
                          {["Employee", "Basic Salary", "Bonus", "Deductions", "Net Salary", "Status", ""].map((h) => (
                            <th key={h} className={`px-4 py-3 text-white/30 uppercase text-[11px] font-medium ${h === "" ? "text-right" : "text-left"}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {payrolls.map((payroll) => (
                          <tr
                            key={payroll.id}
                            className={`hover:bg-white/[0.02] transition ${
                              selectedIds.includes(payroll.id) ? "bg-indigo-500/[0.05]" : ""
                            }`}
                          >
                            <td className="px-3 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(payroll.id)}
                                onChange={() => handleSelectOne(payroll.id)}
                                className="rounded border-white/20 bg-white/5 text-indigo-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-4 font-medium text-white/85">
                              {payroll.userName || `Employee ${payroll.userId}`}
                            </td>
                            <td className="px-4 py-4 text-white/60">
                              Rs. {(payroll.basicSalary || payroll.salary || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-4 font-medium text-emerald-400">
                              + Rs. {(payroll.totalBonuses || payroll.bonuses || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-rose-400">
                              - Rs. {(payroll.totalDeductions || payroll.deductions || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-4 font-medium text-indigo-400">
                              Rs. {(payroll.netSalary || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  payroll.status === "PAID"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                    : payroll.status === "APPROVED"
                                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                                    : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {payroll.status || "DRAFT"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-xs font-semibold space-x-2">
                              <button
                                onClick={() => setEditingPayroll(payroll)}
                                className="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition"
                                title="Edit Bonuses & Allowances"
                              >
                                Edit / Bonus
                              </button>
                              <button
                                onClick={() => handleViewPayslip(payroll)}
                                className="text-white/60 hover:text-white"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(payroll.id)}
                                className="text-emerald-400 hover:text-emerald-300"
                              >
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-white/30 text-sm">
                    No payroll records found for this period.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center text-white/30 text-sm">
                Select a payroll period to review and approve employee payrolls.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Payroll Modal */}
      {editingPayroll && (
        <EditPayrollModal
          payroll={editingPayroll}
          onClose={() => setEditingPayroll(null)}
          onSuccess={() => {
            if (selectedPeriod) loadPayrolls(selectedPeriod.id);
          }}
        />
      )}

      {/* Payslip View Modal */}
      {showPayslipModal && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowPayslipModal(false)}>
          <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4 text-white/90" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-white/[0.08] pb-3">
              <h2 className="text-base font-semibold text-white/90">
                Payslip Preview - {selectedPayroll.userName || `ID #${selectedPayroll.userId}`}
              </h2>
              <button onClick={() => setShowPayslipModal(false)} className="text-white/30 hover:text-white/70">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex justify-between">
                <span>Basic Salary:</span>
                <span className="font-semibold text-white">
                  Rs. {(selectedPayroll.basicSalary || selectedPayroll.salary || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bonuses:</span>
                <span className="font-semibold text-emerald-400">
                  + Rs. {(selectedPayroll.totalBonuses || selectedPayroll.bonuses || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Deductions:</span>
                <span className="font-semibold text-rose-400">
                  - Rs. {(selectedPayroll.totalDeductions || selectedPayroll.deductions || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/[0.08] pt-2 font-bold text-base text-indigo-400">
                <span>Net Take-Home Salary:</span>
                <span>Rs. {(selectedPayroll.netSalary || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleDownloadPdf(selectedPayroll.id)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
