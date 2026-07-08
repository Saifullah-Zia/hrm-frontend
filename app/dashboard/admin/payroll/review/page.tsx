"use client";

import { useState, useEffect } from "react";
import { payrollApi, PayrollPeriodDTO, PayrollDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";

export default function PayrollReviewPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriodDTO[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodDTO | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollDTO[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDTO | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payroll Review</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Period Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Select Payroll Period</h2>
          <div className="space-y-2">
            {periods.map((period) => (
              <button
                key={period.id}
                onClick={() => handlePeriodSelect(period)}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  selectedPeriod?.id === period.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <div className="font-medium">{period.month} {period.year}</div>
                <div className="text-sm opacity-75">
                  {period.locked ? "Locked" : "Open"}
                  {period.department && ` - ${period.department}`}
                </div>
              </button>
            ))}
            {periods.length === 0 && (
              <p className="text-gray-500 text-sm">No payroll periods available</p>
            )}
          </div>
        </div>

        {/* Payroll List */}
        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {selectedPeriod.month} {selectedPeriod.year} Payrolls
              </h2>

              {payrolls.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Basic Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Gross Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Net Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payrolls.map((payroll) => (
                        <tr key={payroll.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payroll.userName || `Employee ${payroll.userId}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            PKR {payroll.basicSalary?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            PKR {payroll.grossSalary?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            PKR {payroll.netSalary?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              payroll.status === "PAID" ? "bg-green-100 text-green-800" :
                              payroll.status === "APPROVED" ? "bg-blue-100 text-blue-800" :
                              payroll.status === "REVIEWED" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {payroll.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewPayslip(payroll)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(payroll.id)}
                              className="text-green-600 hover:text-green-900"
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
                <div className="text-center py-8 text-gray-500">
                  No payroll records for this period
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              Select a payroll period to review payrolls
            </div>
          )}
        </div>
      </div>

      {/* Payslip Modal */}
      {showPayslipModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Payslip</h2>
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
                <h3 className="font-semibold mb-3">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2">{selectedPayroll.userName || `Employee ${selectedPayroll.userId}`}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Attendance Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
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
                <h3 className="font-semibold mb-3">Salary Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Basic Salary:</span>
                    <span>PKR {selectedPayroll.basicSalary?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Daily Salary:</span>
                    <span>PKR {selectedPayroll.dailySalary?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Allowances:</span>
                    <span>PKR {selectedPayroll.totalAllowances?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Bonuses:</span>
                    <span>PKR {selectedPayroll.totalBonuses?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span className="text-gray-500">Total Deductions:</span>
                    <span>- PKR {selectedPayroll.totalDeductions?.toLocaleString() || 0}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Gross Salary:</span>
                    <span>PKR {selectedPayroll.grossSalary?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Net Salary:</span>
                    <span className="text-green-600">PKR {selectedPayroll.netSalary?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Payment Status</h3>
                <div className="space-y-2 text-sm">
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
                  onClick={() => handleDownloadPdf(selectedPayroll.id)}
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
