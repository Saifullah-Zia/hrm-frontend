"use client";
import { Toast } from "@/app/components/Toast";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { payrollApi, type PayrollDTO } from "@/services/payrollApi";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, className = "w-4 h-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  plus:      "M12 4v16m8-8H4",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  trash:     "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  wallet:    "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-4h4m0 0v4m0-4V9a2 2 0 00-2-2h-2",
  calendar:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  cog:       "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  check:     "M5 13l4 4L19 7",
};

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 0 });

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void>; loading: boolean }) {
  async function handleDelete() { await onConfirm(); onClose(); }
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
          <Icon d={ICONS.trash} className="w-5 h-5 text-rose-400" />
        </div>
        <h2 className="text-base font-semibold text-white/90">Delete Payroll?</h2>
      </div>
      <p className="text-sm text-white/40 mb-6">This action cannot be undone.</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]">
          Cancel
        </button>
        <button onClick={handleDelete} disabled={loading} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-500 disabled:opacity-50">
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminPayrollHubPage() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PayrollDTO | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  async function loadPayrolls(pageNum = page, pageSz = pageSize) {
    setLoading(true);
    try {
      const pay = await payrollApi.getPage({ page: pageNum, size: pageSz, sort: "id,desc" });
      setPayrolls(pay.content);
      setTotalElements(pay.totalElements);
      setTotalPages(Math.max(1, pay.totalPages));
      setSelectedIds([]);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load payroll", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch whenever page or pageSize changes
  useEffect(() => { void loadPayrolls(page, pageSize); }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Single Delete ────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const message = await payrollApi.delete(deleteTarget.id);
      await loadPayrolls(page, pageSize);
      setToast({ message: `🗑️ ${message || "Payroll deleted successfully"}`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to delete payroll", type: "error" });
    } finally {
      setDeleteLoading(false);
      setShowDelete(false);
      setDeleteTarget(null);
    }
  }

  // ─── Bulk Actions ─────────────────────────────────────────────────────────

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected payroll record(s)? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await payrollApi.deleteBulk(selectedIds);
      await loadPayrolls(page, pageSize);
      setToast({ message: `🗑️ Deleted ${selectedIds.length} payroll record(s)`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Bulk delete failed", type: "error" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.length === 0 || !user?.id) return;
    if (!confirm(`Approve ${selectedIds.length} selected payroll record(s)?`)) return;
    setBulkLoading(true);
    try {
      await payrollApi.approveBulk(selectedIds, user.id);
      await loadPayrolls(page, pageSize);
      setToast({ message: `✅ Approved ${selectedIds.length} payroll record(s)`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Bulk approve failed", type: "error" });
    } finally {
      setBulkLoading(false);
    }
  }

  // ─── Selection ────────────────────────────────────────────────────────────

  const filtered = payrolls.filter(
    (p) =>
      p.userName?.toLowerCase().includes(search.toLowerCase()) ||
      p.status?.toLowerCase().includes(search.toLowerCase()) ||
      p.month?.includes(search)
  );

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedIds(e.target.checked ? filtered.map((p) => p.id) : []);
  }

  function handleSelectOne(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1117] p-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">SuperAdmin Payroll Hub</h1>
            <p className="text-sm text-white/50 mt-0.5">
              Comprehensive period management, bulk generation, approval workflows, and policies.
            </p>
          </div>
        </div>

        {/* Navigation Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/superadmin/payroll/periods"
            className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.05] transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                <Icon d={ICONS.calendar} className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base">Payroll Periods</h3>
              <p className="text-xs text-white/40 mt-1">Create & lock monthly payroll periods</p>
            </div>
            <span className="text-xs font-semibold text-blue-400 mt-4 block">Manage Periods →</span>
          </Link>

          <Link
            href="/dashboard/superadmin/payroll/generation"
            className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.05] transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                <Icon d={ICONS.plus} className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base">Bulk Generation</h3>
              <p className="text-xs text-white/40 mt-1">Generate payrolls by period & department</p>
            </div>
            <span className="text-xs font-semibold text-purple-400 mt-4 block">Generate Now →</span>
          </Link>

          <Link
            href="/dashboard/superadmin/payroll/review"
            className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.05] transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                <Icon d={ICONS.clipboard} className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base">Review & Bulk Actions</h3>
              <p className="text-xs text-white/40 mt-1">Select all, add bonuses, bulk approve/delete</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 mt-4 block">Review Payrolls →</span>
          </Link>

          <Link
            href="/dashboard/superadmin/payroll/policies"
            className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.05] transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                <Icon d={ICONS.cog} className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base">Payroll Policies</h3>
              <p className="text-xs text-white/40 mt-1">Configure late penalties & leave deductions</p>
            </div>
            <span className="text-xs font-semibold text-amber-400 mt-4 block">Configure Policies →</span>
          </Link>
        </div>

        {/* Records Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">

          {/* Table Header: title + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">All Employee Payroll Records</h2>
            <div className="relative max-w-xs w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25">
                <Icon d={ICONS.search} />
              </span>
              <input
                type="text"
                placeholder="Search name, status, month…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs">
              <span className="font-semibold text-indigo-300">{selectedIds.length} selected</span>
              <button
                onClick={handleBulkApprove}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                <Icon d={ICONS.check} className="w-3 h-3" />
                Approve Selected
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                <Icon d={ICONS.trash} className="w-3 h-3" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="ml-auto text-white/40 hover:text-white/70 px-2 py-1"
              >
                Clear
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {/* Select All checkbox */}
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-indigo-600 cursor-pointer"
                      title="Select all"
                    />
                  </th>
                  {["Employee", "Month", "Salary", "Bonus", "Deduction", "Net Salary", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-white/30 uppercase text-[11px] font-medium ${h === "" ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-white/25">Loading…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-white/25">No payroll records found</td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const net = p.netSalary ?? (p.salary ?? 0) + (p.bonuses ?? 0) - (p.deductions ?? 0);
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-white/[0.04] hover:bg-white/[0.03] transition ${isSelected ? "bg-indigo-500/[0.05]" : ""}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(p.id)}
                            className="rounded border-white/20 bg-white/5 text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-300">
                              <Icon d={ICONS.wallet} className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-white/85 font-medium text-xs">{p.userName}</p>
                              <p className="text-[10px] text-white/30">ID: {p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/40 text-xs">{p.month ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60 text-xs">Rs. {fmt(p.salary)}</td>
                        <td className="px-4 py-3 text-emerald-400 text-xs">Rs. {fmt(p.bonuses)}</td>
                        <td className="px-4 py-3 text-rose-400 text-xs">Rs. {fmt(p.deductions)}</td>
                        <td className="px-4 py-3 text-indigo-400 font-medium text-xs">Rs. {fmt(net)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              p.status === "PAID"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                : p.status === "APPROVED"
                                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {p.status || "DRAFT"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => { setDeleteTarget(p); setShowDelete(true); }}
                            className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete"
                          >
                            <Icon d={ICONS.trash} className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalElements > 0 && (
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
              <p className="text-xs text-white/35">
                Total <span className="text-white/55 tabular-nums">{totalElements}</span> records
                {payrolls.length > 0 && (
                  <> · this page: <span className="text-white/55 tabular-nums">{payrolls.length}</span></>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-white/40">
                  Rows
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                    className="rounded-lg border border-white/[0.1] bg-[#1a1d2e] px-2 py-1.5 text-sm text-white/90 focus:outline-none cursor-pointer"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n} className="bg-[#1a1d2e] text-white">{n}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <span className="text-xs text-white/35 tabular-nums">
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteTarget(null); }}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
