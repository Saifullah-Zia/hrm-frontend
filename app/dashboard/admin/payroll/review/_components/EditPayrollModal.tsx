"use client";

import { useState } from "react";
import { PayrollDTO, payrollApi } from "@/services/payrollApi";

interface EditPayrollModalProps {
  payroll: PayrollDTO;
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full px-3.5 py-2 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors";

export default function EditPayrollModal({ payroll, onClose, onSuccess }: EditPayrollModalProps) {
  const [bonuses, setBonuses] = useState<number>(payroll.totalBonuses || payroll.bonuses || 0);
  const [allowances, setAllowances] = useState<number>(payroll.totalAllowances || 0);
  const [deductions, setDeductions] = useState<number>(payroll.totalDeductions || payroll.deductions || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-white/90" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-base font-semibold text-white/90">Edit Payroll & Add Bonus</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Employee: <span className="font-semibold text-white/80">{payroll.userName || `ID #${payroll.userId}`}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/[0.06] p-3 rounded-xl text-xs text-white/60">
            <div>
              <span className="block text-white/40 mb-0.5">Basic Salary</span>
              <span className="font-semibold text-white/90">
                Rs. {basicSalary.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="block text-white/40 mb-0.5">Daily Rate</span>
              <span className="font-semibold text-white/90">
                Rs. {(payroll.dailySalary || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="block text-white/40 mb-0.5">Working / Absents</span>
              <span className="font-semibold text-white/90">
                {payroll.workingDays || 0} days / <span className="text-rose-400">{payroll.absentDays || 0} absents</span>
              </span>
            </div>
            <div>
              <span className="block text-white/40 mb-0.5">Unpaid / Late Days</span>
              <span className="font-semibold text-white/90">
                {payroll.unpaidLeaveDays || 0} unpaid / {payroll.lateDays || 0} late
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              🎁 Bonus Amount (PKR)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={bonuses}
              onChange={(e) => setBonuses(Number(e.target.value))}
              className={inputClass}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              ➕ Total Allowances (PKR)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={allowances}
              onChange={(e) => setAllowances(Number(e.target.value))}
              className={inputClass}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              ➖ Total Deductions (PKR)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={deductions}
              onChange={(e) => setDeductions(Number(e.target.value))}
              className={inputClass}
              placeholder="0"
            />
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 space-y-1 text-xs text-indigo-200">
            <div className="flex justify-between">
              <span>Gross Salary:</span>
              <span className="font-semibold">Rs. {grossSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Deductions:</span>
              <span className="font-semibold text-rose-400">- Rs. {deductions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-indigo-500/20 pt-1 font-bold text-sm text-indigo-300">
              <span>Estimated Net Salary:</span>
              <span>Rs. {netSalary.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
