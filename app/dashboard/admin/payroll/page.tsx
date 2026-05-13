"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDTO {
  id: number;
  name: string;
  email?: string;
}

interface PayrollDTO {
  id: number;
  userId: number;
  userName?: string;
  salary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  month?: string;
  status?: string;
}

interface CreatePayrollPayload {
  userId: number;
  salary: number;
  bonuses: number;
  deductions: number;
  month?: string;
  status?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) throw new Error(await res.text());
  
  // Handle both JSON and text responses
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  
  // For non-JSON responses (like delete returning plain text)
  return res.text() as Promise<T>;
}

const payrollApi = {
  getAll: () => apiFetch<PayrollDTO[]>("/api/payroll"),

  create: (payload: CreatePayrollPayload) =>
    apiFetch<PayrollDTO>("/api/payroll", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number, payload: CreatePayrollPayload) =>
    apiFetch<PayrollDTO>(`/api/payroll/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    apiFetch<string>(`/api/payroll/${id}`, { method: "DELETE" }),
};

const userApi = {
  getAll: () => apiFetch<UserDTO[]>("/api/users"),
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, className = "w-4 h-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  plus:   "M12 4v16m8-8H4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  edit:   "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash:  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  close:  "M6 18L18 6M6 6l12 12",
  wallet: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-4h4m0 0v4m0-4V9a2 2 0 00-2-2h-2",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors";

const selectClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-[#1a1d2e] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-PK", { minimumFractionDigits: 0 });

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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Payroll Form Modal ───────────────────────────────────────────────────────

interface FormState {
  userId: string;
  salary: string;
  bonuses: string;
  deductions: string;
  month: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  userId: "",
  salary: "",
  bonuses: "",
  deductions: "",
  month: "",
  status: "PAID",
};

function PayrollFormModal({
  open,
  onClose,
  onSave,
  editPayroll,
  users,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreatePayrollPayload, id?: number) => Promise<void>;
  editPayroll?: PayrollDTO | null;
  users: UserDTO[];
}) {
  const isEdit = Boolean(editPayroll);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editPayroll) {
      setForm({
        userId:     String(editPayroll.userId),
        salary:     String(editPayroll.salary),
        bonuses:    String(editPayroll.bonuses),
        deductions: String(editPayroll.deductions),
        month:      editPayroll.month ?? "",
        status:     editPayroll.status ?? "PAID",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [editPayroll, open]);

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: CreatePayrollPayload = {
        userId:     Number(form.userId),
        salary:     Number(form.salary)     || 0,
        bonuses:    Number(form.bonuses)    || 0,
        deductions: Number(form.deductions) || 0,
        month:      form.month  || undefined,
        status:     form.status || undefined,
      };

      await onSave(payload, editPayroll?.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-white/90">
          {isEdit ? "Edit Payroll" : "Add Payroll"}
        </h2>
        <button onClick={onClose} className="text-white/30 hover:text-white/70">
          <Icon d={ICONS.close} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <FormField label="Employee">
          <select className={selectClass} value={form.userId} onChange={set("userId")} required>
            <option value="">Select Employee</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Basic Salary">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            placeholder="50000"
            value={form.salary}
            onChange={set("salary")}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Bonus">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              placeholder="0"
              value={form.bonuses}
              onChange={set("bonuses")}
            />
          </FormField>

          <FormField label="Deduction">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              placeholder="0"
              value={form.deductions}
              onChange={set("deductions")}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Month (YYYY-MM)">
            <input
              type="month"
              className={inputClass}
              value={form.month}
              onChange={set("month")}
            />
          </FormField>

          <FormField label="Status">
            <select className={selectClass} value={form.status} onChange={set("status")}>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </FormField>
        </div>

        {form.salary && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300">
            Net Salary Preview: Rs.{" "}
            {fmt(
              (Number(form.salary) || 0) +
              (Number(form.bonuses) || 0) -
              (Number(form.deductions) || 0)
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
          >
            {loading ? "Saving..." : "Save Payroll"}
          </button>
        </div>
      </form>
    </Modal>
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
  const [payrolls, setPayrolls]       = useState<PayrollDTO[]>([]);
  const [users, setUsers]             = useState<UserDTO[]>([]);
  const [loading, setLoading]         = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch]           = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [editPayroll, setEditPayroll] = useState<PayrollDTO | null>(null);
  const [showDelete, setShowDelete]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PayrollDTO | null>(null);
  const [pageError, setPageError]     = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // ─── Notification State ─────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // ─── Show Notification Function ─────────────────────────────────────────────
  const showNotification = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchData() {
    setLoading(true);
    setPageError("");
    try {
      const [payrollData, usersData] = await Promise.all([
        payrollApi.getAll(),
        userApi.getAll(),
      ]);
      setPayrolls(payrollData);
      setUsers(usersData);
      showNotification("Data loaded successfully", "success");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // ─── Save (create or update) ─────────────────────────────────────────────────

  async function handleSave(data: CreatePayrollPayload, id?: number) {
    try {
      if (id !== undefined) {
        const updated = await payrollApi.update(id, data);
        setPayrolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        const employee = users.find(u => u.id === data.userId);
        showNotification(`✅ Payroll updated for ${employee?.name || "employee"} - Email notification sent`, "success");
      } else {
        const created = await payrollApi.create(data);
        setPayrolls((prev) => [...prev, created]);
        const employee = users.find(u => u.id === data.userId);
        showNotification(`✅ Payroll created for ${employee?.name || "employee"} - Email sent to ${employee?.email || "their email"}`, "success");
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to save payroll", "error");
      throw err;
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      const message = await payrollApi.delete(deleteTarget.id);
      setPayrolls((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showNotification(`🗑️ ${message || "Payroll deleted successfully"}`, "success");
    } catch (err) {
      showNotification(err instanceof Error ? err.message : "Failed to delete payroll", "error");
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
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-xl font-semibold text-white/90">Payroll Management</h1>
            <p className="text-sm text-white/35 mt-0.5">Manage employee payroll records</p>
          </div>
          <button
            onClick={() => { setEditPayroll(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/25"
          >
            <Icon d={ICONS.plus} />
            Add Payroll
          </button>
        </div>

        {/* Success Message (keeping your original) */}
        {successMessage && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            {successMessage}
          </div>
        )}

        {/* Page-level error */}
        {pageError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
            {pageError}
          </div>
        )}

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Employee", "Month", "Salary", "Bonus", "Deduction", "Net Salary", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-white/30 uppercase text-[11px] font-medium ${
                        h === "" ? "text-right" : "text-left"
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
                  const net = p.netSalary ?? p.salary + p.bonuses - p.deductions;
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
                          className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            p.status === "PAID"
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
                            onClick={() => { setEditPayroll(p); setShowForm(true); }}
                            className="p-1.5 rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-500/10"
                            title="Edit"
                          >
                            <Icon d={ICONS.edit} className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modals */}
      <PayrollFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        editPayroll={editPayroll}
        users={users}
      />

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