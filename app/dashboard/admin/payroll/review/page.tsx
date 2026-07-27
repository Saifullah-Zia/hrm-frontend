"use client";

import { useState, useEffect } from "react";
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

  // Selection Logic
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

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected payroll record(s)?`)) return;

    try {
      setActionLoading(true);
      await payrollApi.deleteBulk(selectedIds);
      if (selectedPeriod) loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed bulk delete:", error);
      alert("Error deleting selected payroll records");
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
      alert("Error approving selected payroll records");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const allSelected = payrolls.length > 0 && selectedIds.length === payrolls.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Review & Management</h1>
          <p className="text-sm text-gray-500">
            Select a period, edit employee bonuses, or perform bulk approval and deletion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Period Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Select Payroll Period</h2>
          <div className="space-y-2">
            {periods.map((period) => (
              <button
                key={period.id}
                onClick={() => handlePeriodSelect(period)}
                className={`w-full text-left px-4 py-3 rounded-lg transition border ${
                  selectedPeriod?.id === period.id
                    ? "bg-blue-600 border-blue-600 text-white shadow-md"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="font-medium text-sm">{period.month} {period.year}</div>
                <div className="text-xs opacity-80 mt-0.5">
                  {period.locked ? "🔒 Locked" : "🔓 Open"}
                  {period.department && ` • ${period.department}`}
                </div>
              </button>
            ))}
            {periods.length === 0 && (
              <p className="text-gray-500 text-sm py-4 text-center">No payroll periods available</p>
            )}
          </div>
        </div>

        {/* Payroll List */}
        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {selectedPeriod.month} {selectedPeriod.year} Payrolls
                  </h2>
                  <span className="text-xs text-gray-500">
                    Total: {payrolls.length} employee payroll record(s)
                  </span>
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 p-2 rounded-lg text-xs">
                    <span className="font-medium text-blue-900 px-1">
                      {selectedIds.length} Selected
                    </span>
                    <button
                      onClick={handleBulkApprove}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition disabled:opacity-50"
                    >
                      Approve Selected
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition disabled:opacity-50"
                    >
                      Delete Selected
                    </button>
                  </div>
                )}
              </div>

              {payrolls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">Employee</th>
                        <th className="px-4 py-3 text-left">Basic Salary</th>
                        <th className="px-4 py-3 text-left">Bonus</th>
                        <th className="px-4 py-3 text-left">Deductions</th>
                        <th className="px-4 py-3 text-left">Net Salary</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                      {payrolls.map((payroll) => (
                        <tr
                          key={payroll.id}
                          className={`hover:bg-gray-50 transition ${
                            selectedIds.includes(payroll.id) ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <td className="px-3 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(payroll.id)}
                              onChange={() => handleSelectOne(payroll.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">
                            {payroll.userName || `Employee ${payroll.userId}`}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                            PKR {(payroll.basicSalary || payroll.salary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-semibold text-green-700">
                              + PKR {(payroll.totalBonuses || payroll.bonuses || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-red-600">
                            - PKR {(payroll.totalDeductions || payroll.deductions || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap font-bold text-gray-900">
                            PKR {(payroll.netSalary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              payroll.status === "PAID" ? "bg-green-100 text-green-800" :
                              payroll.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                              "bg-yellow-100 text-yellow-800"
                            }`}>
                              {payroll.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                            {payroll.status === "DRAFT" && (
                              <button
                                onClick={() => setEditingPayroll(payroll)}
                                className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 transition"
                              >
                                Edit / Bonus
                              </button>
                            )}
                            <button
                              onClick={() => handleViewPayslip(payroll)}
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(payroll.id)}
                              className="text-green-600 hover:text-green-800 underline"
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
                <div className="text-center py-10 text-gray-500 text-sm">
                  No payroll records found for this period. Generate payroll from the Generation page first.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-500 text-sm">
              Select a payroll period from the left menu to review records.
            </div>
          )}
        </div>
      </div>

      {/* Edit Bonus & Allowances Modal */}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">Employee Payslip Breakdown</h2>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-sm">
              {/* Employee Info */}
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500 text-xs block">Employee Name</span>
                  <span className="font-semibold text-gray-900">{selectedPayroll.userName || `Employee ${selectedPayroll.userId}`}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Status</span>
                  <span className="font-semibold text-blue-700">{selectedPayroll.status}</span>
                </div>
              </div>

              {/* Attendance Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wider">Attendance Breakdown</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded border">
                    <span className="block text-gray-500">Working</span>
                    <span className="font-bold text-gray-800">{selectedPayroll.workingDays || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="block text-gray-500">Present</span>
                    <span className="font-bold text-green-700">{selectedPayroll.presentDays || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="block text-gray-500">Late</span>
                    <span className="font-bold text-orange-600">{selectedPayroll.lateDays || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="block text-gray-500">Paid Leave</span>
                    <span className="font-bold text-blue-600">{selectedPayroll.paidLeaveDays || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="block text-gray-500">Unpaid Leave</span>
                    <span className="font-bold text-yellow-600">{selectedPayroll.unpaidLeaveDays || 0}</span>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <span className="block text-gray-500">Absent</span>
                    <span className="font-bold text-red-600">{selectedPayroll.absentDays || 0}</span>
                  </div>
                </div>
              </div>

              {/* Calculation Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wider">Salary Details</h3>
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Salary:</span>
                  <span className="font-medium">PKR {(selectedPayroll.basicSalary || selectedPayroll.salary || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Rate (Divided by Month Length):</span>
                  <span className="font-medium">PKR {(selectedPayroll.dailySalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Total Allowances:</span>
                  <span>+ PKR {(selectedPayroll.totalAllowances || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Total Bonuses:</span>
                  <span>+ PKR {(selectedPayroll.totalBonuses || selectedPayroll.bonuses || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600 font-medium">
                  <span>Total Deductions:</span>
                  <span>- PKR {(selectedPayroll.totalDeductions || selectedPayroll.deductions || 0).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg text-gray-900">
                  <span>Net Payable Salary:</span>
                  <span className="text-blue-600">PKR {(selectedPayroll.netSalary || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => handleDownloadPdf(selectedPayroll.id)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                >
                  Download PDF Payslip
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
