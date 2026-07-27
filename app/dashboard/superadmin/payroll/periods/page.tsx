"use client";

import { useState, useEffect } from "react";
import { payrollApi, PayrollPeriodDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";

interface CreatePeriodFormData {
  month: string;
  year: number;
  company: string;
  department: string;
}

export default function SuperAdminPayrollPeriodsPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriodDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreatePeriodFormData>({
    month: "",
    year: new Date().getFullYear(),
    company: "",
    department: "",
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await payrollApi.createPayrollPeriod(formData as PayrollPeriodDTO);
      setShowCreateModal(false);
      setFormData({ month: "", year: new Date().getFullYear(), company: "", department: "" });
      loadPeriods();
    } catch (error) {
      console.error("Failed to create payroll period:", error);
    }
  };

  const handleLock = async (id: number) => {
    if (!user?.id) return;
    try {
      await payrollApi.lockPayrollPeriod(id, user.id);
      loadPeriods();
    } catch (error) {
      console.error("Failed to lock payroll period:", error);
    }
  };

  const handleUnlock = async (id: number) => {
    if (!user?.id) return;
    try {
      await payrollApi.unlockPayrollPeriod(id, user.id);
      loadPeriods();
    } catch (error) {
      console.error("Failed to unlock payroll period:", error);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Periods</h1>
          <p className="text-sm text-gray-500">Create, lock, and manage active payroll periods</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          + Create Period
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
            <tr>
              <th className="px-6 py-3 text-left">Month</th>
              <th className="px-6 py-3 text-left">Year</th>
              <th className="px-6 py-3 text-left">Company</th>
              <th className="px-6 py-3 text-left">Department</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Locked By</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">{period.month}</td>
                <td className="px-6 py-4">{period.year}</td>
                <td className="px-6 py-4 text-gray-500">{period.company || "-"}</td>
                <td className="px-6 py-4 text-gray-500">{period.department || "-"}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                    period.locked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}>
                    {period.locked ? "🔒 Locked" : "🔓 Open"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{period.lockedByName || "-"}</td>
                <td className="px-6 py-4 text-right font-semibold text-xs">
                  {period.locked ? (
                    <button
                      onClick={() => handleUnlock(period.id)}
                      className="text-blue-600 hover:text-blue-900 underline"
                    >
                      Unlock
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLock(period.id)}
                      className="text-orange-600 hover:text-orange-900 underline"
                    >
                      Lock Period
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  No payroll periods found. Create one to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Create Payroll Period</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Month</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Month</option>
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Company (Optional)</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Department (Optional)</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
