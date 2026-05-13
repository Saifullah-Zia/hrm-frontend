"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "SUPERADMIN" | "ADMIN" | "EMPLOYEE";

interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
}

interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

// ─── API Layer ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Read from Zustand persisted storage, same key authStore uses
  const stored = localStorage.getItem("hrm-auth");
  const token = stored ? JSON.parse(stored)?.state?.token : null;

  if (!token) throw new Error("No auth token found. Please log in again.");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const userApi = {
  getAll: () => apiFetch<UserDTO[]>("/api/users"),
  create: (payload: CreateUserPayload) =>
    apiFetch<UserDTO>("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: number, payload: Partial<UserDTO>) =>
    apiFetch<UserDTO>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/api/users/${id}`, { method: "DELETE" }),
  changePassword: (id: number, payload: ChangePasswordPayload) =>
    apiFetch<{ message: string }>(`/api/users/${id}/change-password`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// Matches the sidebar ROLE_COLORS exactly
const ROLE_STYLES: Record<Role, string> = {
  SUPERADMIN: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25",
  ADMIN:      "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  EMPLOYEE:   "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
};

// Avatar background per role
const AVATAR_STYLES: Record<Role, string> = {
  SUPERADMIN: "bg-indigo-500/20 border-indigo-500/30 text-indigo-300",
  ADMIN:      "bg-amber-500/20 border-amber-500/30 text-amber-300",
  EMPLOYEE:   "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
};

const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN:      "Admin",
  EMPLOYEE:   "Employee",
};

// ─── Icon SVG helper ──────────────────────────────────────────────────────────

const Icon = ({ d, className = "w-4 h-4" }: { d: string; className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  plus:     "M12 4v16m8-8H4",
  edit:     "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  key:      "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  trash:    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  users:    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  shield:   "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  close:    "M6 18L18 6M6 6l12 12",
};

// ─── Shared input style matching dark theme ───────────────────────────────────

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors";

const selectClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-[#1a1d2e] border border-white/[0.08] text-white/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors";

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({
  open, onClose, children,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#13151e] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4"
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

// ─── User Form Modal ──────────────────────────────────────────────────────────

interface UserFormModalProps {
  open: boolean; onClose: () => void;
  onSave: (data: CreateUserPayload | Partial<UserDTO>) => Promise<void>;
  editUser?: UserDTO | null;
}

function UserFormModal({ open, onClose, onSave, editUser }: UserFormModalProps) {
  const isEdit = Boolean(editUser);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" as Role });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editUser) setForm({ name: editUser.name, email: editUser.email, password: "", role: editUser.role });
    else setForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setError("");
  }, [editUser, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (isEdit) await onSave({ name: form.name, email: form.email, role: form.role });
      else await onSave(form as CreateUserPayload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-white/90">
          {isEdit ? "Edit user" : "Add new user"}
        </h2>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
          <Icon d={ICONS.close} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <FormField label="Full name">
          <input className={inputClass} type="text" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="John Doe" required />
        </FormField>
        <FormField label="Email">
          <input className={inputClass} type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="john@example.com" required />
        </FormField>
        {!isEdit && (
          <FormField label="Password">
            <input className={inputClass} type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters" required minLength={8} />
          </FormField>
        )}
        <FormField label="Role">
          <select className={selectClass} value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="SUPERADMIN">Superadmin</option>
            <option value="ADMIN">Admin</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </FormField>
        {error && <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] hover:text-white/80 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20">
            {loading ? "Saving…" : "Save user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void;
  onSave: (payload: ChangePasswordPayload) => Promise<void>;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setOldPassword(""); setNewPassword(""); setError(""); }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await onSave({ oldPassword, newPassword }); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to change password"); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-white/90">Change password</h2>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
          <Icon d={ICONS.close} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <FormField label="Current password">
          <input className={inputClass} type="password" value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)} required />
        </FormField>
        <FormField label="New password">
          <input className={inputClass} type="password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </FormField>
        {error && <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] hover:text-white/80 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20">
            {loading ? "Changing…" : "Change"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ open, onClose, onConfirm, userName }: {
  open: boolean; onClose: () => void;
  onConfirm: () => Promise<void>; userName: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
          <Icon d={ICONS.trash} className="w-5 h-5 text-rose-400" />
        </div>
        <h2 className="text-base font-semibold text-white/90">Delete user?</h2>
      </div>
      <p className="text-sm text-white/40 mb-6 leading-relaxed">
        Are you sure you want to delete <span className="text-white/70 font-medium">{userName}</span>?
        This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose}
          className="px-4 py-2 text-sm text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.05] hover:text-white/80 transition-colors">
          Cancel
        </button>
        <button onClick={handleDelete} disabled={loading}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-500 disabled:opacity-50 transition-colors shadow-lg shadow-red-600/20">
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
      <p className="text-[11px] font-medium text-white/35 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserDTO | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [pwUserId, setPwUserId] = useState<number | null>(null);
  const [showDel, setShowDel] = useState(false);
  const [delUser, setDelUser] = useState<UserDTO | null>(null);

  async function fetchUsers() {
    setLoading(true);
    try { setUsers(await userApi.getAll()); }
    catch (err) { console.error("Failed to fetch users:", err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleSave(data: CreateUserPayload | Partial<UserDTO>) {
    if (editUser) {
      const updated = await userApi.update(editUser.id, data as Partial<UserDTO>);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } else {
      const created = await userApi.create(data as CreateUserPayload);
      setUsers((prev) => [...prev, created]);
    }
  }

  async function handleDelete() {
    if (!delUser) return;
    await userApi.delete(delUser.id);
    setUsers((prev) => prev.filter((u) => u.id !== delUser.id));
  }

  async function handleChangePassword(payload: ChangePasswordPayload) {
    if (!pwUserId) return;
    await userApi.changePassword(pwUserId, payload);
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:      users.length,
    superadmin: users.filter((u) => u.role === "SUPERADMIN").length,
    admin:      users.filter((u) => u.role === "ADMIN").length,
    employee:   users.filter((u) => u.role === "EMPLOYEE").length,
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-xl font-semibold text-white/90 tracking-tight">
              User Management
            </h1>
            <p className="text-sm text-white/35 mt-0.5">
              Manage system users, roles and credentials
            </p>
          </div>
          <button
            onClick={() => { setEditUser(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/25"
          >
            <Icon d={ICONS.plus} className="w-4 h-4" />
            Add user
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total users"  value={stats.total}      accent="text-white/80" />
          <StatCard label="Superadmins"  value={stats.superadmin} accent="text-indigo-400" />
          <StatCard label="Admins"       value={stats.admin}      accent="text-amber-400" />
          <StatCard label="Employees"    value={stats.employee}   accent="text-emerald-400" />
        </div>

        {/* ── Search ── */}
        <div className="relative mb-4 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25">
            <Icon d={ICONS.search} className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors"
          />
        </div>

        {/* ── Table ── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider w-1/3">
                  Name
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider w-32">
                  Role
                </th>
                <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider w-36">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-14 text-white/25 text-sm">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-14 text-white/25 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                      i === filtered.length - 1 ? "" : ""
                    }`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-semibold flex-shrink-0 ${AVATAR_STYLES[user.role]}`}>
                          {getInitials(user.name)}
                        </div>
                        <span className="text-white/80 font-medium">{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-white/40">{user.email}</td>

                    {/* Role badge */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_STYLES[user.role]}`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit user"
                          onClick={() => { setEditUser(user); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all"
                        >
                          <Icon d={ICONS.edit} className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Change password"
                          onClick={() => { setPwUserId(user.id); setShowPw(true); }}
                          className="p-1.5 rounded-lg text-white/25 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
                        >
                          <Icon d={ICONS.key} className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete user"
                          onClick={() => { setDelUser(user); setShowDel(true); }}
                          className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                        >
                          <Icon d={ICONS.trash} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer count ── */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-white/20 mt-3 px-1">
            Showing {filtered.length} of {users.length} users
          </p>
        )}
      </div>

      {/* ── Modals ── */}
      <UserFormModal
        open={showForm} onClose={() => setShowForm(false)}
        onSave={handleSave} editUser={editUser}
      />
      <ChangePasswordModal
        open={showPw} onClose={() => setShowPw(false)}
        onSave={handleChangePassword}
      />
      <DeleteModal
        open={showDel} onClose={() => setShowDel(false)}
        onConfirm={handleDelete} userName={delUser?.name ?? ""}
      />
    </div>
  );
}