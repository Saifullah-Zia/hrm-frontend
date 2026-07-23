"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { payrollApi, PayrollDTO } from "@/services/payrollApi";
import { openPayslipPrintView } from "@/lib/payslipExport";

const fmtMoney = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function EmployeePayslipsPage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDTO | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  const payrollQuery = useQuery({
    queryKey: ["employee-payroll", userId, page, pageSize],
    queryFn: () => payrollApi.getByUserIdPage(userId!, { page, size: pageSize }),
    enabled: typeof userId === "number",
  });

  const pageData = payrollQuery.data;
  const rows: PayrollDTO[] = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = Math.max(1, pageData?.totalPages ?? 1);

  const handleDownload = async (p: PayrollDTO) => {
    setPdfLoadingId(p.id);
    try {
      const downloaded = await payrollApi.downloadPayslipPdf(p.id);
      if (!downloaded) {
        openPayslipPrintView(p, user?.username ?? p.userName ?? "Employee");
      }
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleViewPayslip = (payroll: PayrollDTO) => {
    setSelectedPayroll(payroll);
    setShowPayslipModal(true);
  };

  if (typeof userId !== "number") {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Missing <code className="text-amber-100">userId</code> in your JWT — payslips cannot be loaded.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">My payslips</h1>
        <p className="text-white/40 text-sm mt-1">
          Net salary and breakdown by period. Click PDF to download or save your payslip.
        </p>
      </div>

      {payrollQuery.isLoading ? (
        <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
      ) : payrollQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          Could not load payroll records. Please contact support.
        </div>
      ) : totalElements === 0 ? (
        <p className="text-white/40 text-sm">No payroll records found for your account.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#13151e] -mx-0">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium text-right">Basic Salary</th>
                  <th className="px-4 py-3 font-medium text-right">Gross</th>
                  <th className="px-4 py-3 font-medium text-right">Deductions</th>
                  <th className="px-4 py-3 font-medium text-right">Net</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((p: PayrollDTO) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white/80">{p.month ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-white/70">{fmtMoney(p.basicSalary || p.salary)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400/80">{fmtMoney(p.grossSalary || p.salary)}</td>
                    <td className="px-4 py-3 text-right text-rose-400/80">{fmtMoney(p.totalDeductions || p.deductions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white/90">{fmtMoney(p.netSalary)}</td>
                    <td className="px-4 py-3 text-white/50 capitalize">{p.status ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewPayslip(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors mr-2"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={pdfLoadingId === p.id}
                        onClick={() => void handleDownload(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/25 transition-colors disabled:opacity-50"
                      >
                        {pdfLoadingId === p.id ? "…" : "PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-white/35">
            <p>
              Total <span className="text-white/55 tabular-nums">{totalElements}</span> payslip
              {totalElements === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-white/40">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="rounded-lg border border-white/[0.1] bg-[#1a1d2e] px-2 py-1.5 text-sm text-white/90 focus:outline-none cursor-pointer"
                >
                  {[5, 10, 20].map((n) => (
                    <option key={n} value={n} className="bg-[#1a1d2e] text-white">
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-white/[0.1] px-3 py-1.5 font-medium text-white/70 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none"
              >
                Previous
              </button>
              <span className="tabular-nums text-white/45">
                Page {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-white/[0.1] px-3 py-1.5 font-medium text-white/70 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Payslip Modal */}
      {showPayslipModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Payslip</h2>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Employee Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-900">Employee Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2">{selectedPayroll.userName || `Employee ${selectedPayroll.userId}`}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-900">Attendance Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-gray-700">
                  <div>
                    <span className="text-gray-500">Working Days:</span>
                    <span className="ml-2">{selectedPayroll.workingDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Present Days:</span>
                    <span className="ml-2">{selectedPayroll.presentDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Late Days:</span>
                    <span className="ml-2">{selectedPayroll.lateDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Paid Leave:</span>
                    <span className="ml-2">{selectedPayroll.paidLeaveDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Unpaid Leave:</span>
                    <span className="ml-2">{selectedPayroll.unpaidLeaveDays || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Absent Days:</span>
                    <span className="ml-2">{selectedPayroll.absentDays || 0}</span>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-900">Salary Breakdown</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Basic Salary:</span>
                    <span>PKR {fmtMoney(selectedPayroll.basicSalary || selectedPayroll.salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Daily Salary:</span>
                    <span>PKR {fmtMoney(selectedPayroll.dailySalary || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Allowances:</span>
                    <span>PKR {fmtMoney(selectedPayroll.totalAllowances || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Bonuses:</span>
                    <span>PKR {fmtMoney(selectedPayroll.totalBonuses || selectedPayroll.bonuses)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span className="text-gray-500">Total Deductions:</span>
                    <span>- PKR {fmtMoney(selectedPayroll.totalDeductions || selectedPayroll.deductions)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Gross Salary:</span>
                    <span>PKR {fmtMoney(selectedPayroll.grossSalary || selectedPayroll.salary)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Net Salary:</span>
                    <span className="text-green-600">PKR {fmtMoney(selectedPayroll.netSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-900">Payment Status</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedPayroll.status === "PAID" ? "bg-green-100 text-green-800" :
                      selectedPayroll.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {selectedPayroll.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Generated At:</span>
                    <span>{selectedPayroll.generatedAt ? new Date(selectedPayroll.generatedAt).toLocaleString() : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Approved At:</span>
                    <span>{selectedPayroll.approvedAt ? new Date(selectedPayroll.approvedAt).toLocaleString() : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid At:</span>
                    <span>{selectedPayroll.paidAt ? new Date(selectedPayroll.paidAt).toLocaleString() : "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => void handleDownload(selectedPayroll)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
