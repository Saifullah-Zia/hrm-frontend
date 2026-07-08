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
  const [formData, setFormData] = useState({
    lateDeductionRule: '{"freeLates": 3, "deductionPerLate": 100}',
    unpaidLeaveDeductionRule: '{"deductionPercentage": 100}',
    absentDeductionRule: '{"deductionPercentage": 100}',
    description: "",
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await payrollApi.createPayrollPolicy({
        ...formData,
        isActive: true,
      });
      setShowCreateModal(false);
      setFormData({
        lateDeductionRule: '{"freeLates": 3, "deductionPerLate": 100}',
        unpaidLeaveDeductionRule: '{"deductionPercentage": 100}',
        absentDeductionRule: '{"deductionPercentage": 100}',
        description: "",
      });
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
        ...formData,
        isActive: formData.isActive !== false,
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

  const openEditModal = (policy: PayrollPolicyDTO) => {
    setEditingPolicy(policy);
    setFormData({
      lateDeductionRule: policy.lateDeductionRule || '{"freeLates": 3, "deductionPerLate": 100}',
      unpaidLeaveDeductionRule: policy.unpaidLeaveDeductionRule || '{"deductionPercentage": 100}',
      absentDeductionRule: policy.absentDeductionRule || '{"deductionPercentage": 100}',
      description: policy.description || "",
    });
    setShowEditModal(true);
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
        <h1 className="text-2xl font-bold text-gray-900">Payroll Policies</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Create Policy
        </button>
      </div>

      {/* Active Policy Display */}
      {activePolicy && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Active Policy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Late Deduction Rule:</span>
              <pre className="mt-1 text-xs bg-white p-2 rounded border">{activePolicy.lateDeductionRule}</pre>
            </div>
            <div>
              <span className="text-sm text-gray-600">Unpaid Leave Deduction Rule:</span>
              <pre className="mt-1 text-xs bg-white p-2 rounded border">{activePolicy.unpaidLeaveDeductionRule}</pre>
            </div>
            <div>
              <span className="text-sm text-gray-600">Absent Deduction Rule:</span>
              <pre className="mt-1 text-xs bg-white p-2 rounded border">{activePolicy.absentDeductionRule}</pre>
            </div>
            <div>
              <span className="text-sm text-gray-600">Description:</span>
              <p className="mt-1 text-sm">{activePolicy.description || "No description"}</p>
            </div>
          </div>
        </div>
      )}

      {/* All Policies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {policies.map((policy) => (
              <tr key={policy.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {policy.description || "No description"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    policy.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {policy.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {policy.createdAt ? new Date(policy.createdAt).toLocaleDateString() : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!policy.isActive && (
                    <button
                      onClick={() => handleActivate(policy.id)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(policy)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {policies.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No payroll policies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Create Payroll Policy</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Late Deduction Rule (JSON)
                </label>
                <textarea
                  value={formData.lateDeductionRule}
                  onChange={(e) => setFormData({ ...formData, lateDeductionRule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Example: {"{\"freeLates\": 3, \"deductionPerLate\": 100}"}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unpaid Leave Deduction Rule (JSON)
                </label>
                <textarea
                  value={formData.unpaidLeaveDeductionRule}
                  onChange={(e) => setFormData({ ...formData, unpaidLeaveDeductionRule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Example: {"{\"deductionPercentage\": 100}"}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Absent Deduction Rule (JSON)
                </label>
                <textarea
                  value={formData.absentDeductionRule}
                  onChange={(e) => setFormData({ ...formData, absentDeductionRule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Example: {"{\"deductionPercentage\": 100}"}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Edit Payroll Policy</h2>
            <form onSubmit={handleEdit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Late Deduction Rule (JSON)
                </label>
                <textarea
                  value={formData.lateDeductionRule}
                  onChange={(e) => setFormData({ ...formData, lateDeductionRule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unpaid Leave Deduction Rule (JSON)
                </label>
                <textarea
                  value={formData.unpaidLeaveDeductionRule}
                  onChange={(e) => setFormData({ ...formData, unpaidLeaveDeductionRule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Absent Deduction Rule (JSON)
                </label>
                <textarea
                  value={formData.absentDeductionRule}
                  onChange={(e) => setFormData({ ...formData, absentDeductionRule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPolicy(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
