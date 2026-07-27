"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { payrollApi, PayrollPeriodDTO } from "@/services/payrollApi";
import { useAuth } from "@/lib/useAuth";

interface CreatePeriodFormData {
  month: string;
  year: number;
  company: string;
  department: string;
}

const inputClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors";

const selectClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#1a1d2e] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors";

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

  return (
    <div className="min-h-screen bg-[#0f1117] p-6 text-white/90">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/superadmin/payroll"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition"
              title="Back to Payroll Dashboard"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white/90">Payroll Periods</h1>
              <p className="text-sm text-white/35 mt-0.5">Create, lock, and manage active payroll periods</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition"
          >
            + Create Period
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Month", "Year", "Company", "Department", "Status", "Locked By", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-white/30 uppercase text-[11px] font-medium ${h === "" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-white/25">
                      Loading periods...
                    </td>
                  </tr>
                ) : periods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-white/25">
                      No payroll periods found. Create one to begin.
                    </td>
                  </tr>
                ) : (
                  periods.map((period) => (
                    <tr key={period.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-4 font-medium text-white/90">{period.month}</td>
                      <td className="px-5 py-4 text-white/60">{period.year}</td>
                      <td className="px-5 py-4 text-white/40">{period.company || "—"}</td>
                      <td className="px-5 py-4 text-white/40">{period.department || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          period.locked
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {period.locked ? "🔒 Locked" : "🔓 Open"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-white/40">{period.lockedByName || "—"}</td>
                      <td className="px-5 py-4 text-right">
                        {period.locked ? (
                          <button
                            onClick={() => handleUnlock(period.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                          >
                            Unlock Period
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLock(period.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition"
                          >
                            Lock Period
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Shell */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white/90 mb-4">Create Payroll Period</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Month
                </label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className={selectClass}
                  required
                >
                  <option value="" className="bg-[#1a1d2e] text-white">Select Month</option>
                  {months.map((month) => (
                    <option key={month} value={month} className="bg-[#1a1d2e] text-white">
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Company <span className="text-white/20">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. JCAT Solutions"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Department <span className="text-white/20">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
