"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { payrollApi, PayrollPeriodDTO, PayrollDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";
import EditPayrollModal from "./_components/EditPayrollModal";
import PayslipModal from "@/app/components/PayslipModal";
import { openPayslipPrintView } from "@/lib/payslipExport";
import { exportPayrollCsv } from "@/lib/payrollCsvExport";

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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await payrollApi.getAllPayrollPeriods();
      setPeriods(data);
      if (data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(data[0]);
        loadPayrolls(data[0].id);
      }
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

  const handleDownloadPdf = async (payroll: PayrollDTO) => {
    try {
      const success = await payrollApi.downloadPayslipPdf(payroll.id);
      if (!success) {
        openPayslipPrintView(payroll, payroll.userName || `Employee ${payroll.userId}`);
      }
    } catch {
      openPayslipPrintView(payroll, payroll.userName || `Employee ${payroll.userId}`);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPayrolls.map((p) => p.id));
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
      showToast(`Deleted ${selectedIds.length} payroll record(s).`);
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
      showToast(`Successfully approved ${selectedIds.length} payroll record(s)!`);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed bulk approve:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkPay = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Mark ${selectedIds.length} selected payroll record(s) as PAID?`)) return;

    try {
      setActionLoading(true);
      await payrollApi.payBulk(selectedIds);
      showToast(`Successfully marked ${selectedIds.length} payroll record(s) as PAID!`);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed bulk pay:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAllForMonth = async () => {
    if (!selectedPeriod || payrolls.length === 0 || !user?.id) return;
    const unapprovedIds = payrolls.filter((p) => (p.status || "DRAFT").toUpperCase() === "DRAFT").map((p) => p.id);
    if (unapprovedIds.length === 0) {
      showToast("All pending payrolls for this month are already approved!");
      return;
    }
    if (!confirm(`Approve ALL ${unapprovedIds.length} pending draft payroll(s) for ${selectedPeriod.month} ${selectedPeriod.year}?`)) return;

    try {
      setActionLoading(true);
      await payrollApi.approveBulk(unapprovedIds, user.id);
      showToast(`Approved all ${unapprovedIds.length} payrolls for ${selectedPeriod.month} ${selectedPeriod.year}!`);
      await loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed approve all:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayAllApprovedForMonth = async () => {
    if (!selectedPeriod || payrolls.length === 0) return;
    const approvedIds = payrolls.filter((p) => p.status === "APPROVED").map((p) => p.id);
    if (approvedIds.length === 0) {
      showToast("No approved payrolls ready for payment. Please approve pending draft payrolls first!");
      return;
    }
    if (!confirm(`Mark ALL ${approvedIds.length} APPROVED payroll(s) for ${selectedPeriod.month} ${selectedPeriod.year} as PAID?`)) return;

    try {
      setActionLoading(true);
      await payrollApi.payBulk(approvedIds);
      showToast(`Marked all ${approvedIds.length} approved payrolls as PAID for ${selectedPeriod.month} ${selectedPeriod.year}!`);
      await loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed pay all approved:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveOne = async (id: number) => {
    if (!user?.id) return;
    try {
      setActionLoading(true);
      await payrollApi.approvePayroll(id, user.id);
      showToast("Payroll record approved!");
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed single approve:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayOne = async (id: number) => {
    try {
      setActionLoading(true);
      await payrollApi.markAsPaid(id);
      showToast("Payroll record marked as PAID!");
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed single pay:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!selectedPeriod) return;
    const targetPayrolls = filteredPayrolls.length > 0 ? filteredPayrolls : payrolls;
    if (targetPayrolls.length === 0) {
      showToast("No payroll records available to export for this selection.");
      return;
    }
    const label = `${selectedPeriod.month}_${selectedPeriod.year}${statusFilter !== "ALL" ? `_${statusFilter}` : ""}`;
    const count = exportPayrollCsv(targetPayrolls, label);
    showToast(`Exported ${count} payroll record(s) to CSV file!`);
  };

  const filteredPayrolls = payrolls.filter((p) => {
    if (statusFilter === "ALL") return true;
    return (p.status || "DRAFT").toUpperCase() === statusFilter.toUpperCase();
  });

  const draftCount = payrolls.filter((p) => (p.status || "DRAFT").toUpperCase() === "DRAFT").length;
  const approvedCount = payrolls.filter((p) => p.status === "APPROVED").length;
  const paidCount = payrolls.filter((p) => p.status === "PAID").length;

  const selectedNetSum = payrolls
    .filter((p) => selectedIds.includes(p.id))
    .reduce((acc, p) => acc + (p.netSalary || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const allSelected = filteredPayrolls.length > 0 && selectedIds.length === filteredPayrolls.length;

  return (
    <div className="min-h-screen bg-[#0f1117] p-6 text-white/90">
      <div className="w-full space-y-6">

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl font-medium text-sm border border-emerald-400/30 transition animate-bounce">
            ✓ {toastMessage}
          </div>
        )}

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
                Batch approve draft payrolls, mark all approved payrolls as paid, or export CSV reports
              </p>
            </div>
          </div>

          {/* Quick Month & Primary Actions */}
          {selectedPeriod && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPeriod.id}
                onChange={(e) => {
                  const p = periods.find((item) => item.id === Number(e.target.value));
                  if (p) handlePeriodSelect(p);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1a1d2e] border border-white/[0.1] text-white focus:outline-none cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1a1d2e] text-white">
                    📅 {p.month} {p.year} {p.locked ? "(Locked)" : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportCsv}
                className="px-4 py-2 text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white/90 rounded-xl transition shadow flex items-center gap-1.5"
                title="Export monthly payroll data to CSV file"
              >
                📥 Export CSV
              </button>
            </div>
          )}
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

          {/* Payroll List & Actions */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPeriod ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">

                {/* Section Title & Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-base font-semibold text-white/90">
                      {selectedPeriod.month} {selectedPeriod.year} Payrolls
                    </h2>
                    <span className="text-xs text-white/40">
                      Showing {filteredPayrolls.length} of {payrolls.length} employee record(s)
                    </span>
                  </div>

                  {/* Header Actions: Batch Approve & Batch Pay */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleApproveAllForMonth}
                      disabled={actionLoading || draftCount === 0}
                      className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-40 flex items-center gap-1.5"
                      title="Approve all draft payrolls for this month"
                    >
                      ✓ Approve All Pending ({draftCount})
                    </button>

                    <button
                      onClick={handlePayAllApprovedForMonth}
                      disabled={actionLoading || approvedCount === 0}
                      className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-40 flex items-center gap-1.5"
                      title="Mark all approved payrolls as PAID at once"
                    >
                      💳 Pay All Approved ({approvedCount})
                    </button>
                  </div>
                </div>

                {/* Status Filter Tab Pills */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { key: "ALL", label: `All (${payrolls.length})` },
                      { key: "DRAFT", label: `Draft (${draftCount})` },
                      { key: "APPROVED", label: `Approved (${approvedCount})` },
                      { key: "PAID", label: `Paid (${paidCount})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                          statusFilter === tab.key
                            ? "bg-indigo-600/25 border-indigo-500/50 text-indigo-300"
                            : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.05]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl transition flex items-center gap-1"
                  >
                    📥 Export CSV
                  </button>
                </div>

                {/* Floating Bulk Action Bar for Selected Rows */}
                {selectedIds.length > 0 && (
                  <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#181b28] border border-indigo-500/30 p-3 rounded-2xl shadow-2xl animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                        {selectedIds.length} Selected
                      </span>
                      {selectedNetSum > 0 && (
                        <span className="text-xs text-white/60">
                          Total Payout: <strong className="text-emerald-400 font-semibold">Rs. {selectedNetSum.toLocaleString()}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleBulkApprove}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow disabled:opacity-50 flex items-center gap-1"
                      >
                        ✓ Approve Selected
                      </button>
                      <button
                        onClick={handleBulkPay}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow disabled:opacity-50 flex items-center gap-1"
                      >
                        💳 Pay Selected
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition shadow disabled:opacity-50 flex items-center gap-1"
                      >
                        🗑️ Delete Selected
                      </button>
                      <button
                        onClick={() => setSelectedIds([])}
                        className="text-xs text-white/40 hover:text-white px-2 py-1"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Payroll Table */}
                {filteredPayrolls.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[780px]">
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
                          {["Employee", "Basic Salary", "Bonus", "Deductions", "Net Salary", "Status", "Actions"].map((h) => (
                            <th key={h} className={`px-4 py-3 text-white/30 uppercase text-[11px] font-medium ${h === "Actions" ? "text-right" : "text-left"}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filteredPayrolls.map((payroll) => {
                          const isDraft = (payroll.status || "DRAFT").toUpperCase() === "DRAFT";
                          const isApproved = payroll.status === "APPROVED";
                          const isPaid = payroll.status === "PAID";

                          return (
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
                              <td className="px-4 py-4 font-semibold text-white/90">
                                Rs. {(payroll.netSalary || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                    isPaid
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      : isApproved
                                      ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  }`}
                                >
                                  {isPaid ? "💳 Paid" : isApproved ? "✓ Approved" : "⏳ Draft"}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right text-xs font-semibold space-x-2">
                                {isDraft && (
                                  <button
                                    onClick={() => handleApproveOne(payroll.id)}
                                    disabled={actionLoading}
                                    className="text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition"
                                    title="Approve single payroll"
                                  >
                                    ✓ Approve
                                  </button>
                                )}
                                {isApproved && (
                                  <button
                                    onClick={() => handlePayOne(payroll.id)}
                                    disabled={actionLoading}
                                    className="text-emerald-300 hover:text-white bg-emerald-600/20 hover:bg-emerald-600/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition font-bold"
                                    title="Mark single payroll as Paid"
                                  >
                                    💳 Mark Paid
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingPayroll(payroll)}
                                  className="text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-white/[0.08] transition"
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
                                  onClick={() => handleDownloadPdf(payroll)}
                                  className="text-indigo-400 hover:text-indigo-300"
                                >
                                  PDF
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-white/30 text-sm">
                    No payroll records found for this status filter.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center text-white/30 text-sm">
                Select a payroll period to review, approve, and pay employee payrolls.
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
      <PayslipModal
        payroll={selectedPayroll}
        isOpen={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
      />
    </div>
  );
}
