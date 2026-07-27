"use client";

import { useState, useEffect } from "react";
import { payrollApi, PayrollPolicyDTO } from "@/services/payrollApi";

export default function PayrollPoliciesPage() {
  const [policies, setPolicies] = useState<PayrollPolicyDTO[]>([]);
  const [activePolicy, setActivePolicy] = useState<PayrollPolicyDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PayrollPolicyDTO | null>(null);

  // Form Fields (User Friendly)
  const [freeLates, setFreeLates] = useState<number>(3);
  const [deductionPerLate, setDeductionPerLate] = useState<number>(100);
  const [unpaidLeavePct, setUnpaidLeavePct] = useState<number>(100);
  const [absentPct, setAbsentPct] = useState<number>(100);
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

  const parsePolicyJson = (policy: PayrollPolicyDTO) => {
    let lates = { freeLates: 3, deductionPerLate: 100 };
    let unpaid = { deductionPercentage: 100 };
    let absent = { deductionPercentage: 100 };

    try {
      if (policy.lateDeductionRule) lates = JSON.parse(policy.lateDeductionRule);
    } catch {}
    try {
      if (policy.unpaidLeaveDeductionRule) unpaid = JSON.parse(policy.unpaidLeaveDeductionRule);
    } catch {}
    try {
      if (policy.absentDeductionRule) absent = JSON.parse(policy.absentDeductionRule);
    } catch {}

    return { lates, unpaid, absent };
  };

  const resetForm = () => {
    setFreeLates(3);
    setDeductionPerLate(100);
    setUnpaidLeavePct(100);
    setAbsentPct(100);
    setDescription("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (policy: PayrollPolicyDTO) => {
    setEditingPolicy(policy);
    const { lates, unpaid, absent } = parsePolicyJson(policy);
    setFreeLates(lates.freeLates ?? 3);
    setDeductionPerLate(lates.deductionPerLate ?? 100);
    setUnpaidLeavePct(unpaid.deductionPercentage ?? 100);
    setAbsentPct(absent.deductionPercentage ?? 100);
    setDescription(policy.description || "");
    setShowEditModal(true);
  };

  const buildPayload = () => {
    return {
      lateDeductionRule: JSON.stringify({ freeLates: Number(freeLates), deductionPerLate: Number(deductionPerLate) }),
      unpaidLeaveDeductionRule: JSON.stringify({ deductionPercentage: Number(unpaidLeavePct) }),
      absentDeductionRule: JSON.stringify({ deductionPercentage: Number(absentPct) }),
      description,
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await payrollApi.createPayrollPolicy({
        ...buildPayload(),
        isActive: true,
      });
      setShowCreateModal(false);
      resetForm();
      loadPolicies();
      loadActivePolicy();
    } catch (error) {
      console.error("Failed to create payroll policy:", error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    try {
      await payrollApi.updatePayrollPolicy(editingPolicy.id, {
        ...buildPayload(),
        isActive: editingPolicy.isActive !== false,
      });
      setShowEditModal(false);
      setEditingPolicy(null);
      loadPolicies();
      loadActivePolicy();
    } catch (error) {
      console.error("Failed to update payroll policy:", error);
    }
  };

  const handleActivate = async (policyId: number) => {
    try {
      const policy = policies.find((p) => p.id === policyId);
      if (policy) {
        await payrollApi.updatePayrollPolicy(policyId, {
          ...policy,
          isActive: true,
        });
        loadPolicies();
        loadActivePolicy();
      }
    } catch (error) {
      console.error("Failed to activate policy:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeRules = activePolicy ? parsePolicyJson(activePolicy) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Policies</h1>
          <p className="text-sm text-gray-500">Configure late arrival penalties, unpaid leave rates, and absence deductions.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition"
        >
          + Create New Policy
        </button>
      </div>

      {/* Active Policy Summary Card */}
      {activePolicy && activeRules && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                ACTIVE POLICY
              </span>
              <h2 className="text-lg font-bold text-blue-950 mt-1">
                {activePolicy.description || "Default Company Policy"}
              </h2>
            </div>
            <button
              onClick={() => openEditModal(activePolicy)}
              className="text-xs bg-white text-blue-600 font-semibold px-3 py-1.5 rounded-md border border-blue-200 hover:bg-blue-50"
            >
              Edit Active Policy
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 block mb-1">LATE DEDUCTION RULE</span>
              <p className="text-base font-bold text-gray-800">
                {activeRules.lates.freeLates} Free Lates Allowed
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Deduction: <span className="font-semibold text-red-600">PKR {activeRules.lates.deductionPerLate}</span> per late after free lates
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 block mb-1">UNPAID LEAVE RULE</span>
              <p className="text-base font-bold text-gray-800">
                {activeRules.unpaid.deductionPercentage}% Deduction
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Deducts 1 full daily salary per unpaid leave day
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-2xs">
              <span className="text-xs font-semibold text-gray-400 block mb-1">ABSENT DEDUCTION RULE</span>
              <p className="text-base font-bold text-gray-800">
                {activeRules.absent.deductionPercentage}% Deduction
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Deducts 1 full daily salary per unexcused absent day
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Policies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
            <tr>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-left">Late Penalty</th>
              <th className="px-6 py-3 text-left">Unpaid / Absent Rate</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
            {policies.map((policy) => {
              const rules = parsePolicyJson(policy);
              return (
                <tr key={policy.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {policy.description || `Policy #${policy.id}`}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div>{rules.lates.freeLates} Free Lates</div>
                    <div className="text-gray-500">PKR {rules.lates.deductionPerLate} / late after</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div>Unpaid: {rules.unpaid.deductionPercentage}%</div>
                    <div>Absent: {rules.absent.deductionPercentage}%</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      policy.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    }`}>
                      {policy.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-semibold space-x-2">
                    {!policy.isActive && (
                      <button
                        onClick={() => handleActivate(policy.id)}
                        className="text-green-600 hover:text-green-800 underline"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(policy)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Policy Modal (Create / Edit) */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {showEditModal ? "Edit Payroll Policy" : "Create New Payroll Policy"}
            </h2>
            <form onSubmit={showEditModal ? handleEdit : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Policy Description / Title
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Standard Company Policy 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Late Penalty Rule */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                <span className="block text-xs font-bold text-gray-600 uppercase">⏰ Late Arrival Settings</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Allowed Free Lates</label>
                    <input
                      type="number"
                      min="0"
                      value={freeLates}
                      onChange={(e) => setFreeLates(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Deduction per Late (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={deductionPerLate}
                      onChange={(e) => setDeductionPerLate(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Unpaid Leave & Absent Rule */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
                <span className="block text-xs font-bold text-gray-600 uppercase">📅 Absence & Leave Deductions</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Unpaid Leave Deduction %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={unpaidLeavePct}
                      onChange={(e) => setUnpaidLeavePct(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Absent Deduction %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={absentPct}
                      onChange={(e) => setAbsentPct(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {showEditModal ? "Update Policy" : "Create & Activate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
