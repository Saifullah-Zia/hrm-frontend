"use client";

import { useState } from "react";
import { PayrollDTO, payrollApi } from "@/services/payrollApi";

interface EditPayrollModalProps {
  payroll: PayrollDTO;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPayrollModal({ payroll, onClose, onSuccess }: EditPayrollModalProps) {
  const [bonuses, setBonuses] = useState<number>(payroll.totalBonuses || payroll.bonuses || 0);
  const [allowances, setAllowances] = useState<number>(payroll.totalAllowances || 0);
  const [deductions, setDeductions] = useState<number>(payroll.totalDeductions || payroll.deductions || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time calculation preview
  const basicSalary = payroll.basicSalary || payroll.salary || 0;
  const grossSalary = basicSalary + Number(allowances || 0) + Number(bonuses || 0);
  const netSalary = grossSalary - Number(deductions || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await payrollApi.update(payroll.id, {
        totalBonuses: Number(bonuses),
        totalAllowances: Number(allowances),
        deductions: Number(deductions),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to update payroll:", err);
      setError(err instanceof Error ? err.message : "Failed to update payroll record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transition-all">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Edit Payroll & Add Bonus</h2>
            <p className="text-xs text-gray-500 mt-1">
              Employee: <span className="font-semibold text-gray-700">{payroll.userName || `ID #${payroll.userId}`}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Readonly Base Details */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
            <div>
              <span className="block font-medium text-gray-500">Basic Salary</span>
              <span className="text-sm font-semibold text-gray-800">
                PKR {basicSalary.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="block font-medium text-gray-500">Daily Rate</span>
              <span className="text-sm font-semibold text-gray-800">
                PKR {(payroll.dailySalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="block font-medium text-gray-500">Working / Absent Days</span>
              <span className="text-sm font-semibold text-gray-800">
                {payroll.workingDays || 0} days / <span className="text-red-600">{payroll.absentDays || 0} absents</span>
              </span>
            </div>
            <div>
              <span className="block font-medium text-gray-500">Unpaid / Late Days</span>
              <span className="text-sm font-semibold text-gray-800">
                {payroll.unpaidLeaveDays || 0} unpaid / {payroll.lateDays || 0} late
              </span>
            </div>
          </div>

          {/* Bonus Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              🎁 Bonus Amount (PKR)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={bonuses}
              onChange={(e) => setBonuses(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              placeholder="e.g. 5000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add performance, festive, or performance bonus for this period.
            </p>
          </div>

          {/* Allowances Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ➕ Total Allowances (PKR)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={allowances}
              onChange={(e) => setAllowances(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              placeholder="e.g. 2000"
            />
          </div>

          {/* Total Deductions Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ➖ Total Deductions (PKR)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={deductions}
              onChange={(e) => setDeductions(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            />
            <p className="text-xs text-gray-500 mt-1">
              Includes auto-calculated attendance deductions. You can adjust if needed.
            </p>
          </div>

          {/* Dynamic Summary Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600 text-xs">
              <span>Gross Salary (Basic + Bonus + Allowances):</span>
              <span className="font-semibold text-gray-800">PKR {grossSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-xs">
              <span>Total Deductions:</span>
              <span className="font-semibold text-red-600">- PKR {deductions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-1 font-bold text-base text-blue-900">
              <span>Estimated Net Salary:</span>
              <span>PKR {netSalary.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
