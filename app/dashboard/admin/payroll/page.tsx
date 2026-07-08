"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  payrollApi,
  type PayrollDTO,
} from "@/services/payrollApi";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, className = "w-4 h-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  plus: "M12 4v16m8-8H4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  wallet: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-4h4m0 0v4m0-4V9a2 2 0 00-2-2h-2",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-PK", { minimumFractionDigits: 0 });

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}) {
  async function handleDelete() {
    await onConfirm();
    onClose();
  }

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
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Toast Notification Component ─────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: "bg-emerald-500/90 border-emerald-400 text-white",
    error: "bg-rose-500/90 border-rose-400 text-white",
    info: "bg-indigo-500/90 border-indigo-400 text-white",
  };

  const icons = {
    success: "✓",
    error: "✗",
    info: "ℹ",
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl border ${styles[type]} shadow-lg`}>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold">{icons[type]}</span>
        <p className="text-sm">{message}</p>
        <button onClick={onClose} className="ml-4 text-white/70 hover:text-white">
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayrollManagementPage() {
  const [payrolls, setPayrolls] = useState<PayrollDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PayrollDTO | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // ─── Fetch payroll (paginated) ─────────────────────────────────────────────

  const loadPayrolls = useCallback(
    async (pageOverride?: number) => {
      setLoading(true);
      const pageIndex = pageOverride !== undefined ? pageOverride : page;
      try {
        const pay = await payrollApi.getPage({
          page: pageIndex,
          size: pageSize,
          sort: "id,desc",
        });
        setPayrolls(pay.content);
        setTotalElements(pay.totalElements);
        setTotalPages(Math.max(1, pay.totalPages));
        if (pageOverride !== undefined) setPage(pageOverride);
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : "Failed to load payroll",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    void loadPayrolls();
  }, [loadPayrolls]);

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const message = await payrollApi.delete(deleteTarget.id);
      await loadPayrolls();
      setToast({ message: `🗑️ ${message || "Payroll deleted successfully"}`, type: "success" });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to delete payroll",
        type: "error",
      });
    } finally {
      setDeleteLoading(false);
      setShowDelete(false);
      setDeleteTarget(null);
    }
  }

  // ─── Filter ──────────────────────────────────────────────────────────────────

  const filtered = payrolls.filter(
    (p) =>
      p.userName?.toLowerCase().includes(search.toLowerCase()) ||
      p.status?.toLowerCase().includes(search.toLowerCase()) ||
      p.month?.includes(search)
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-xl font-semibold text-white/90">Payroll Management</h1>
            <p className="text-sm text-white/35 mt-0.5">View and manage employee payroll records</p>
          </div>
          <Link
            href="/dashboard/admin/payroll/generation"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 shrink-0"
          >
            <Icon d={ICONS.plus} />
            Generate Payroll
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25">
            <Icon d={ICONS.search} />
          </span>
          <input
            type="text"
            placeholder="Search by name, status or month…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Employee", "Month", "Salary", "Bonus", "Deduction", "Net Salary", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-white/30 uppercase text-[11px] font-medium ${h === "" ? "text-right" : "text-left"
                          }`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-white/25">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-white/25">
                      No payroll records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const net =
                      p.netSalary ?? (p.salary ?? 0) + (p.bonuses ?? 0) - (p.deductions ?? 0);
                    return (
                      <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-300">
                              <Icon d={ICONS.wallet} className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-white/85 font-medium">{p.userName}</p>
                              <p className="text-xs text-white/30">ID: {p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-white/40">{p.month ?? "—"}</td>
                        <td className="px-5 py-4 text-white/60">Rs. {fmt(p.salary)}</td>
                        <td className="px-5 py-4 text-emerald-400">Rs. {fmt(p.bonuses)}</td>
                        <td className="px-5 py-4 text-rose-400">Rs. {fmt(p.deductions)}</td>
                        <td className="px-5 py-4 text-indigo-400 font-medium">
                          Rs. {fmt(net)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${p.status === "PAID"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              }`}
                          >
                            {p.status || "PENDING"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setDeleteTarget(p); setShowDelete(true); }}
                              className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Delete"
                            >
                              <Icon d={ICONS.trash} className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && totalElements > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
            <p className="text-xs text-white/35">
              Total <span className="text-white/55 tabular-nums">{totalElements}</span> records
              {payrolls.length > 0 && (
                <>
                  {" "}
                  · this page: <span className="text-white/55 tabular-nums">{payrolls.length}</span>
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-white/40">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="rounded-lg border border-white/[0.1] bg-[#1a1d2e] px-2 py-1.5 text-sm text-white/90 focus:outline-none cursor-pointer"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n} className="bg-[#1a1d2e] text-white">
                      {n}
                    </option>
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

      <DeleteModal
        open={showDelete}
        onClose={() => {
          setShowDelete(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
