"use client";

import { useState, useEffect } from "react";
import { payrollApi, PayrollPeriodDTO, PayrollDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PayrollGenerationPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriodDTO[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodDTO | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  const handleBulkGenerate = async () => {
    if (!selectedPeriod || !user?.id) return;
    try {
      setGenerating(true);
      await payrollApi.generateBulkPayroll(selectedPeriod.id, user.id);
      await loadPayrolls(selectedPeriod.id);
    } catch (error) {
      console.error("Failed to generate bulk payroll:", error);
      alert("Failed to generate payroll. Make sure the period is locked and attendance summaries exist.");
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payroll Generation</h1>
        <button
          onClick={() => setShowCreatePeriodModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Create Payroll Period
        </button>
      </div>

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

        {/* Payroll Actions */}
        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedPeriod.month} {selectedPeriod.year}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedPeriod.department || "All Departments"}
                  </p>
                </div>
                <div className="flex gap-3">
                  {selectedPeriod.locked ? (
                    <button
                      onClick={handleBulkGenerate}
                      disabled={generating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {generating ? "Generating..." : "Generate Payroll"}
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg">
                      Period must be locked
                    </span>
                  )}
                </div>
              </div>

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
                          Present Days
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
                            {payroll.presentDays || 0}
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
                            {payroll.status === "DRAFT" && (
                              <button
                                onClick={() => handleApprove(payroll.id)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                Approve
                              </button>
                            )}
                            {payroll.status === "APPROVED" && (
                              <button
                                onClick={() => handleMarkAsPaid(payroll.id)}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                Mark Paid
                              </button>
                            )}
                            {(payroll.status === "DRAFT" || payroll.status === "REVIEWED") && (
                              <button
                                onClick={() => handleRegenerate(payroll.id)}
                                className="text-orange-600 hover:text-orange-900"
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
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              Select a payroll period to view and generate payrolls
            </div>
          )}
        </div>
      </div>

      {/* Create Payroll Period Modal */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Payroll Period</h2>
            <form onSubmit={handleCreatePeriod}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={periodFormData.month}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, month: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={periodFormData.year}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, year: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min={2000}
                  max={2100}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={periodFormData.department}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, department: e.target.value })}
                  placeholder="e.g. Engineering (leave blank for all departments)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={periodFormData.company}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, company: e.target.value })}
                  placeholder="e.g. JCAT Solutions"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePeriodModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPeriod}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

