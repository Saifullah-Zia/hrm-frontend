"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { payrollApi, PayrollPolicyDTO } from "@/services/payrollApi";

const inputClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors";

export default function PayrollPoliciesPage() {
  const [policies, setPolicies] = useState<PayrollPolicyDTO[]>([]);
  const [activePolicy, setActivePolicy] = useState<PayrollPolicyDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PayrollPolicyDTO | null>(null);

  const [freeLates, setFreeLates] = useState<number>(3);
  const [deductionPerLate, setDeductionPerLate] = useState<number>(100);
  const [unpaidLeavePct, setUnpaidLeavePct] = useState<number>(100);
  const [absentPct, setAbsentPct] = useState<number>(100);
  const [taxEnabled, setTaxEnabled] = useState<boolean>(true);
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    loadPolicies();
    loadActivePolicy();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await payrollApi.getAllPayrollPolicies();
      setPolicies(data);
    } catch (error) {
      console.error("Failed to load payroll policies:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivePolicy = async () => {
    try {
      const policy = await payrollApi.getActivePayrollPolicy();
      setActivePolicy(policy);
    } catch (error) {
      console.error("Failed to load active policy:", error);
    }
  };

  const DEFAULT_TAX_SLABS = [
    { minAnnual: 0, maxAnnual: 600000, fixedTax: 0, taxRate: 0 },
    { minAnnual: 600000, maxAnnual: 1200000, fixedTax: 0, taxRate: 5 },
    { minAnnual: 1200000, maxAnnual: 2200000, fixedTax: 30000, taxRate: 15 },
    { minAnnual: 2200000, maxAnnual: 3200000, fixedTax: 180000, taxRate: 25 },
    { minAnnual: 3200000, maxAnnual: 4100000, fixedTax: 430000, taxRate: 30 },
    { minAnnual: 4100000, maxAnnual: 99999999, fixedTax: 700000, taxRate: 35 },
  ];

  const parsePolicyJson = (policy: PayrollPolicyDTO) => {
    let lates = { freeLates: 3, deductionPerLate: 100 };
    let unpaid = { deductionPercentage: 100 };
    let absent = { deductionPercentage: 100 };
    let tax = { enabled: true, slabs: DEFAULT_TAX_SLABS };
    try { if (policy.lateDeductionRule) lates = JSON.parse(policy.lateDeductionRule); } catch {}
    try { if (policy.unpaidLeaveDeductionRule) unpaid = JSON.parse(policy.unpaidLeaveDeductionRule); } catch {}
    try { if (policy.absentDeductionRule) absent = JSON.parse(policy.absentDeductionRule); } catch {}
    try { if (policy.incomeTaxRule) tax = JSON.parse(policy.incomeTaxRule); } catch {}
    return { lates, unpaid, absent, tax };
  };

  const resetForm = () => {
    setFreeLates(3);
    setDeductionPerLate(100);
    setUnpaidLeavePct(100);
    setAbsentPct(100);
    setTaxEnabled(true);
    setDescription("");
  };

  const openCreateModal = () => { resetForm(); setShowCreateModal(true); };

  const openEditModal = (policy: PayrollPolicyDTO) => {
    setEditingPolicy(policy);
    const { lates, unpaid, absent, tax } = parsePolicyJson(policy);
    setFreeLates(lates.freeLates ?? 3);
    setDeductionPerLate(lates.deductionPerLate ?? 100);
    setUnpaidLeavePct(unpaid.deductionPercentage ?? 100);
    setAbsentPct(absent.deductionPercentage ?? 100);
    setTaxEnabled(tax.enabled !== false);
    setDescription(policy.description || "");
    setShowEditModal(true);
  };

  const buildPayload = () => ({
    lateDeductionRule: JSON.stringify({ freeLates: Number(freeLates), deductionPerLate: Number(deductionPerLate) }),
    unpaidLeaveDeductionRule: JSON.stringify({ deductionPercentage: Number(unpaidLeavePct) }),
    absentDeductionRule: JSON.stringify({ deductionPercentage: Number(absentPct) }),
    incomeTaxRule: JSON.stringify({ enabled: taxEnabled, slabs: DEFAULT_TAX_SLABS }),
    description,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await payrollApi.createPayrollPolicy({ ...buildPayload(), isActive: true });
      setShowCreateModal(false);
      resetForm();
      loadPolicies();
      loadActivePolicy();
    } catch (error) { console.error("Failed to create payroll policy:", error); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    try {
      await payrollApi.updatePayrollPolicy(editingPolicy.id, { ...buildPayload(), isActive: editingPolicy.isActive !== false });
      setShowEditModal(false);
      setEditingPolicy(null);
      loadPolicies();
      loadActivePolicy();
    } catch (error) { console.error("Failed to update payroll policy:", error); }
  };

  const handleActivate = async (policyId: number) => {
    try {
      const policy = policies.find((p) => p.id === policyId);
      if (policy) {
        await payrollApi.updatePayrollPolicy(policyId, { ...policy, isActive: true });
        loadPolicies();
        loadActivePolicy();
      }
    } catch (error) { console.error("Failed to activate policy:", error); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const activeRules = activePolicy ? parsePolicyJson(activePolicy) : null;

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
              <h1 className="text-xl font-semibold text-white/90">Payroll Policies</h1>
              <p className="text-sm text-white/35 mt-0.5">Configure late arrival penalties, unpaid leave rates, and absence deductions</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition"
          >
            + Create New Policy
          </button>
        </div>

        {/* Active Policy Card */}
        {activePolicy && activeRules && (
          <div className="bg-indigo-500/[0.07] border border-indigo-500/20 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold rounded-full border border-emerald-500/20">
                  ACTIVE POLICY
                </span>
                <h2 className="text-base font-semibold text-white/90 mt-2">
                  {activePolicy.description || "Default Company Policy"}
                </h2>
              </div>
              <button
                onClick={() => openEditModal(activePolicy)}
                className="text-xs bg-white/[0.04] text-indigo-400 font-semibold px-3 py-1.5 rounded-xl border border-indigo-500/20 hover:bg-indigo-500/10 transition"
              >
                Edit Active Policy
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wide block mb-2">Late Deduction Rule</span>
                <p className="text-sm font-bold text-white/90">{activeRules.lates.freeLates} Free Lates Allowed</p>
                <p className="text-xs text-white/50 mt-1">
                  Deduction: <span className="font-semibold text-rose-400">Rs. {activeRules.lates.deductionPerLate}</span> per late after free lates
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wide block mb-2">Unpaid Leave Rule</span>
                <p className="text-sm font-bold text-white/90">{activeRules.unpaid.deductionPercentage}% Deduction</p>
                <p className="text-xs text-white/50 mt-1">Deducts 1 full daily salary per unpaid leave day</p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wide block mb-2">Absent Deduction Rule</span>
                <p className="text-sm font-bold text-white/90">{activeRules.absent.deductionPercentage}% Deduction</p>
                <p className="text-xs text-white/50 mt-1">Deducts 1 full daily salary per unexcused absent day</p>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl">
                <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wide block mb-2">Income Tax (Withholding)</span>
                <p className="text-sm font-bold text-white/90">{activeRules.tax.enabled !== false ? "Enabled" : "Disabled"}</p>
                <p className="text-xs text-white/50 mt-1">Standard FBR tax slabs applied to annual gross</p>
              </div>
            </div>
          </div>
        )}

        {/* Policies Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Description", "Late Penalty", "Unpaid / Absent Rate", "Income Tax", "Status", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-white/30 uppercase text-[11px] font-medium ${h === "" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {policies.map((policy) => {
                  const rules = parsePolicyJson(policy);
                  return (
                    <tr key={policy.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-4 font-medium text-white/85">
                        {policy.description || `Policy #${policy.id}`}
                      </td>
                      <td className="px-5 py-4 text-xs text-white/60">
                        <div>{rules.lates.freeLates} Free Lates</div>
                        <div className="text-white/40">Rs. {rules.lates.deductionPerLate} / late after</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-white/60">
                        <div>Unpaid: {rules.unpaid.deductionPercentage}%</div>
                        <div>Absent: {rules.absent.deductionPercentage}%</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-white/60">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${rules.tax.enabled !== false ? "bg-indigo-500/15 text-indigo-300" : "bg-white/5 text-white/40"}`}>
                          {rules.tax.enabled !== false ? "FBR Slabs On" : "Off"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {policy.isActive ? (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full bg-white/[0.05] text-white/40 border border-white/[0.08]">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-xs font-semibold space-x-3">
                        <button onClick={() => openEditModal(policy)} className="text-indigo-400 hover:text-indigo-300">
                          Edit
                        </button>
                        {!policy.isActive && (
                          <button onClick={() => handleActivate(policy.id)} className="text-emerald-400 hover:text-emerald-300">
                            Set Active
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-white/25">
                      No policies found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal (Create or Edit) */}
      {(showCreateModal || showEditModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
        >
          <div
            className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white/90 mb-5">
              {showEditModal ? "Edit Payroll Policy" : "Create New Payroll Policy"}
            </h2>

            <form onSubmit={showEditModal ? handleEdit : handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Policy Description / Title</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard Corporate Policy 2026"
                  className={inputClass}
                  required
                />
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">⏰ Late Arrival Rules</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Allowed Free Lates</label>
                    <input type="number" min="0" value={freeLates} onChange={(e) => setFreeLates(Number(e.target.value))} className={inputClass} required />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Deduction Per Late (Rs.)</label>
                    <input type="number" min="0" value={deductionPerLate} onChange={(e) => setDeductionPerLate(Number(e.target.value))} className={inputClass} required />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">🏖️ Unpaid Leave & Absence Rules</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Unpaid Leave Rate (%)</label>
                    <input type="number" min="0" max="100" value={unpaidLeavePct} onChange={(e) => setUnpaidLeavePct(Number(e.target.value))} className={inputClass} required />
                    <p className="text-[10px] text-white/30 mt-1">Set to 0% for no extra policy penalty</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Absent Rate (%)</label>
                    <input type="number" min="0" max="100" value={absentPct} onChange={(e) => setAbsentPct(Number(e.target.value))} className={inputClass} required />
                    <p className="text-[10px] text-white/30 mt-1">Set to 0% for no extra policy penalty</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">🏛️ Income Tax (Withholding Tax)</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxEnabled}
                      onChange={(e) => setTaxEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-xs text-white/40">
                  {taxEnabled ? "Income Tax withholding enabled based on standard Pakistan FBR salaried slabs." : "Income Tax withholding is disabled for this policy."}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                  className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500">
                  {showEditModal ? "Save Changes" : "Create Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
