"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import {
  employeeProfileApi,
  EmployeeProfileDto,
} from "@/services/employeeProfileApi";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  AlertTriangle,
  Building2,
  Briefcase,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

type SystemUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  probationStatus?: string | null;
};

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({
  status,
}: {
  status: EmployeeProfileDto["employmentStatus"];
}) => {
  const map = {
    ACTIVE: {
      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle size={12} />,
      label: "Active",
    },
    INACTIVE: {
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <Clock size={12} />,
      label: "Inactive",
    },
    TERMINATED: {
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: <XCircle size={12} />,
      label: "Terminated",
    },
  };
  const cfg = map[status ?? "ACTIVE"];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({
  name,
  picture,
  size = "md",
}: {
  name?: string;
  picture?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base" };
  const initials = (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  if (picture)
    return (
      <img
        src={picture}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-[#FC0175]/30`}
      />
    );
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-[#FC0175] to-[#ff6cad] flex items-center justify-center font-semibold text-white ring-2 ring-[#FC0175]/30`}
    >
      {initials}
    </div>
  );
};

// ─── Field (defined OUTSIDE Modal to prevent remount on every keystroke) ───────
const Field = ({
  label,
  icon,
  field,
  type = "text",
  placeholder,
  form,
  handle,
  isReadOnly,
}: {
  label: string;
  icon: React.ReactNode;
  field: keyof EmployeeProfileDto;
  type?: string;
  placeholder?: string;
  form: EmployeeProfileDto;
  handle: (field: keyof EmployeeProfileDto, val: string | number) => void;
  isReadOnly: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-[#8B8FA8] flex items-center gap-1.5">
      <span className="text-[#FC0175]">{icon}</span>
      {label}
    </label>
    <input
      type={type}
      value={(form[field] as string) ?? ""}
      onChange={(e) => handle(field, e.target.value)}
      disabled={isReadOnly}
      placeholder={placeholder}
      className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] placeholder-[#3D4065]
        focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all
        disabled:opacity-60 disabled:cursor-default"
    />
  </div>
);

// ─── Profile Modal (Create / Edit) ────────────────────────────────────────────
const EMPTY: EmployeeProfileDto = {
  userId: 0,
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  joiningDate: "",
  cnicNumber: "",
  profilePicture: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  departmentId: undefined,
  positionId: undefined,
  employmentStatus: "ACTIVE",
};

type ModalMode = "create" | "edit" | "view";

const Modal = ({
  mode,
  profile,
  employeeUsers,
  linkedUserIds,
  onClose,
  onSave,
}: {
  mode: ModalMode;
  profile: EmployeeProfileDto | null;
  employeeUsers: SystemUser[];
  linkedUserIds: Set<number>;
  onClose: () => void;
  onSave: (dto: EmployeeProfileDto) => Promise<void>;
}) => {
  const [form, setForm] = useState<EmployeeProfileDto>(profile ?? EMPTY);
  const [saving, setSaving] = useState(false);

  const isReadOnly = mode === "view";

  const handle = (field: keyof EmployeeProfileDto, val: string | number) => {
    let finalVal = val;
    if (field === "cnicNumber" && typeof val === "string") {
      finalVal = val.replace(/[^0-9-]/g, "");
    }
    
    setForm((f) => {
      const next = { ...f, [field]: finalVal };
      
      // Auto-calculate probation dates (3 months) when joining date is set
      if (field === "joiningDate" && typeof finalVal === "string" && finalVal) {
        const joinDate = new Date(finalVal);
        if (!isNaN(joinDate.getTime())) {
          next.probationStartDate = finalVal;
          const endDate = new Date(joinDate);
          endDate.setMonth(endDate.getMonth() + 3);
          next.probationEndDate = endDate.toISOString().split("T")[0];
          
          if (!next.probationStatus) {
             next.probationStatus = "ON_PROBATION";
          }
        }
      }
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2D45]">
          <div>
            <h2 className="text-lg font-semibold text-[#E2E4F0]">
              {mode === "create"
                ? "Add Employee Profile"
                : mode === "edit"
                ? "Edit Employee Profile"
                : "Employee Profile"}
            </h2>
            <p className="text-xs text-[#8B8FA8] mt-0.5">
              {mode === "view"
                ? "Profile details"
                : "Fill in the details below"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1E2140] text-[#8B8FA8] hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Employee account */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-[#8B8FA8] flex items-center gap-1.5">
              <span className="text-[#FC0175]">
                <User size={13} />
              </span>
              Employee account
            </label>
            {mode === "create" && !isReadOnly ? (
              <select
                value={form.userId || ""}
                onChange={(e) => handle("userId", Number(e.target.value))}
                required
                className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0]
                  focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
              >
                <option value="">Select employee login…</option>
                {employeeUsers.map((u) => {
                  const taken = linkedUserIds.has(u.id);
                  return (
                    <option key={u.id} value={u.id} disabled={taken}>
                      {u.name} — {u.email} (User #{u.id})
                      {taken ? " — profile exists" : ""}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="number"
                value={form.userId || ""}
                disabled
                className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] opacity-60 cursor-default"
              />
            )}
            <p className="text-[11px] text-[#6B7089] mt-0.5">
              Must match the registered system user ID.
            </p>
          </div>

          <Field
            label="First Name"
            icon={<User size={13} />}
            field="firstName"
            placeholder="First name"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Last Name"
            icon={<User size={13} />}
            field="lastName"
            placeholder="Last name"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Phone"
            icon={<Phone size={13} />}
            field="phone"
            placeholder="+92 300 0000000"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="CNIC Number"
            icon={<CreditCard size={13} />}
            field="cnicNumber"
            placeholder="XXXXX-XXXXXXX-X"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Date of Birth"
            icon={<Calendar size={13} />}
            field="dateOfBirth"
            type="date"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Joining Date"
            icon={<Calendar size={13} />}
            field="joiningDate"
            type="date"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Department ID"
            icon={<Building2 size={13} />}
            field="departmentId"
            type="number"
            placeholder="e.g. 1"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Position ID"
            icon={<Briefcase size={13} />}
            field="positionId"
            type="number"
            placeholder="e.g. 2"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Emergency Contact Name"
            icon={<AlertTriangle size={13} />}
            field="emergencyContactName"
            placeholder="Full name"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />
          <Field
            label="Emergency Contact Phone"
            icon={<Phone size={13} />}
            field="emergencyContactPhone"
            placeholder="+92 300 0000000"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />

          {/* Profile Picture */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8B8FA8] flex items-center gap-1.5">
              <span className="text-[#FC0175]">
                <User size={13} />
              </span>
              Profile Picture
            </label>

            {form.profilePicture && (
              <img
                src={form.profilePicture}
                alt="Preview"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#FC0175]/30 mb-1"
              />
            )}

            {!isReadOnly && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    setForm((f) => ({
                      ...f,
                      profilePicture: reader.result as string,
                    }));
                  reader.readAsDataURL(file);
                }}
                className="text-sm text-[#8B8FA8] file:mr-3 file:py-1.5 file:px-3
                  file:rounded-lg file:border-0 file:text-xs file:font-medium
                  file:bg-[#FC0175]/20 file:text-[#FC0175] hover:file:bg-[#FC0175]/30
                  file:cursor-pointer cursor-pointer"
              />
            )}

            {isReadOnly && !form.profilePicture && (
              <span className="text-sm text-[#3D4065]">No picture uploaded</span>
            )}
          </div>

          {/* Address */}
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8B8FA8] flex items-center gap-1.5">
              <span className="text-[#FC0175]">
                <MapPin size={13} />
              </span>
              Address
            </label>
            <textarea
              value={form.address ?? ""}
              onChange={(e) => handle("address", e.target.value)}
              disabled={isReadOnly}
              rows={2}
              placeholder="Full address..."
              className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] placeholder-[#3D4065]
                focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all resize-none
                disabled:opacity-60 disabled:cursor-default"
            />
          </div>

          {/* Employment Status */}
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8B8FA8]">
              Employment Status
            </label>
            <div className="relative">
              <select
                value={form.employmentStatus ?? "ACTIVE"}
                onChange={(e) =>
                  handle(
                    "employmentStatus",
                    e.target.value as EmployeeProfileDto["employmentStatus"] &
                      string
                  )
                }
                disabled={isReadOnly}
                className="w-full appearance-none bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0]
                  focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all
                  disabled:opacity-60 disabled:cursor-default"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8FA8] pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {!isReadOnly && (
          <div className="px-6 py-4 border-t border-[#2A2D45] flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-[#2A2D45] text-[#8B8FA8] hover:text-white hover:border-[#FC0175] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-[#FC0175] hover:bg-[#d40068] text-white font-medium
                transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {mode === "create" ? "Create Profile" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-4">
        <Trash2 size={20} className="text-red-400" />
      </div>
      <h3 className="text-center text-lg font-semibold text-[#E2E4F0] mb-1">
        Delete Profile?
      </h3>
      <p className="text-center text-sm text-[#8B8FA8] mb-6">
        This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm rounded-lg border border-[#2A2D45] text-[#8B8FA8] hover:text-white hover:border-[#FC0175] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2 text-sm rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeProfilesPage() {
  const [profiles, setProfiles] = useState<EmployeeProfileDto[]>([]);
  const [pageRecords, setPageRecords] = useState<EmployeeProfileDto[]>([]);
  const [filtered, setFiltered] = useState<EmployeeProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modal, setModal] = useState<{
    open: boolean;
    mode: ModalMode;
    profile: EmployeeProfileDto | null;
  }>({ open: false, mode: "create", profile: null });

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [employeeUsers, setEmployeeUsers] = useState<SystemUser[]>([]);

  const linkedUserIds = new Set(profiles.map((p) => p.userId));

  useEffect(() => {
    apiClient
      .get<SystemUser[]>("/api/users")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setEmployeeUsers(
          list.filter((u) => (u.role ?? "").toUpperCase() === "EMPLOYEE")
        );
      })
      .catch(() => setEmployeeUsers([]));
  }, []);

  // ── Fetch ──
  const loadData = async (pageIndex = page) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch total list in background for stats & linking
      const allData = await employeeProfileApi.getAll();
      setProfiles(allData);

      // 2. Fetch active page slice
      const pageData = await employeeProfileApi.getPaginated(pageIndex, pageSize, "firstName", "asc");
      setPageRecords(pageData.content);
      setTotalElements(pageData.totalElements ?? 0);
      // Spring Boot 4 VIA_DTO serialization: totalPages may be missing — compute as fallback
      const tPages = pageData.totalPages ?? Math.ceil((pageData.totalElements ?? 0) / pageSize) || 1;
      setTotalPages(Math.max(1, tPages));
      setPage(pageIndex);
    } catch {
      setError("Failed to load employee profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  // ── Filter ──
  useEffect(() => {
    let data = [...pageRecords];
    if (statusFilter !== "ALL")
      data = data.filter((p) => p.employmentStatus === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          String(p.userId).includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.cnicNumber?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q)
      );
    }
    setFiltered(data);
  }, [pageRecords, search, statusFilter]);

  // ── CRUD handlers ──
  const handleSave = async (dto: EmployeeProfileDto) => {
    if (modal.mode === "create") {
      if (!dto.userId || dto.userId <= 0) {
        throw new Error("Select an employee account from the dropdown.");
      }
      if (profiles.some((p) => p.userId === dto.userId)) {
        throw new Error("This employee already has a profile. Edit the existing one instead.");
      }
      await employeeProfileApi.create(dto);
    } else if (modal.mode === "edit" && modal.profile?.id) {
      await employeeProfileApi.update(modal.profile.id, dto);
    }
    
    // Sync probation dates to the User account if they were auto-calculated
    try {
      const userRes = await apiClient.get<SystemUser>(`/api/users/${dto.userId}`);
      if (userRes.data) {
        await apiClient.put(`/api/users/${dto.userId}`, {
          ...userRes.data,
          probationStartDate: dto.probationStartDate || null,
          probationEndDate: dto.probationEndDate || null,
          probationStatus: dto.probationStatus || null,
        });
      }
    } catch (err) {
      console.warn("Failed to sync probation dates to User account:", err);
    }

    // ✅ FIX: await loadData(0) first so the list is populated before the modal closes
    await loadData(0);
    setModal({ open: false, mode: "create", profile: null });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await employeeProfileApi.delete(deleteTarget);
      setDeleteTarget(null);
      await loadData(0);
    } catch (err: unknown) {
      let msg = "Failed to delete profile.";
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { data?: unknown } }).response;
        const data = res?.data;
        if (typeof data === "string") msg = data;
        else if (data && typeof data === "object" && "message" in data)
          msg = String((data as { message?: string }).message);
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Stats ──
  const stats = {
    total: profiles.length,
    active: profiles.filter((p) => p.employmentStatus === "ACTIVE").length,
    inactive: profiles.filter((p) => p.employmentStatus === "INACTIVE").length,
    terminated: profiles.filter((p) => p.employmentStatus === "TERMINATED").length,
  };

  return (
    <div className="min-h-screen bg-[#070918] text-[#E2E4F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Employee Profiles</h1>
            <p className="text-sm text-[#8B8FA8] mt-1">
              Manage and view all employee information
            </p>
          </div>
          <button
            onClick={() =>
              setModal({ open: true, mode: "create", profile: null })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FC0175] hover:bg-[#d40068] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-[#FC0175]/20"
          >
            <Plus size={16} />
            Add Profile
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total Profiles",
              value: stats.total,
              color: "from-[#7c003f] to-[#0D0F1E]",
              border: "border-[#FC0175]/30",
              text: "text-[#FC0175]",
            },
            {
              label: "Active",
              value: stats.active,
              color: "from-[#064E3B] to-[#0D0F1E]",
              border: "border-emerald-500/30",
              text: "text-emerald-400",
            },
            {
              label: "Inactive",
              value: stats.inactive,
              color: "from-[#451A03] to-[#0D0F1E]",
              border: "border-amber-500/30",
              text: "text-amber-400",
            },
            {
              label: "Terminated",
              value: stats.terminated,
              color: "from-[#450A0A] to-[#0D0F1E]",
              border: "border-red-500/30",
              text: "text-red-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl p-4`}
            >
              <p className="text-xs text-[#8B8FA8] mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8FA8]"
            />
            <input
              type="text"
              placeholder="Search by user ID, phone, CNIC or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D0F1E] border border-[#2A2D45] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#E2E4F0] placeholder-[#3D4065]
                focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/20 transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["ALL", "ACTIVE", "INACTIVE", "TERMINATED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                  statusFilter === s
                    ? "bg-[#FC0175] border-[#FC0175] text-white"
                    : "bg-[#0D0F1E] border-[#2A2D45] text-[#8B8FA8] hover:border-[#FC0175] hover:text-white"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl overflow-hidden">
          {/* Body / Table wrapper */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-[#8B8FA8]">
              <Loader2 size={20} className="animate-spin text-[#FC0175]" />
              <span className="text-sm">Loading profiles...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <AlertTriangle size={24} className="text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => loadData()}
                className="mt-2 text-xs text-[#FC0175] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <User size={32} className="text-[#2A2D45]" />
              <p className="text-sm text-[#8B8FA8]">No profiles found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#2A2D45] text-xs font-semibold text-[#8B8FA8] uppercase tracking-wider">
                  <span>Employee</span>
                  <span>Phone</span>
                  <span>CNIC</span>
                  <span>Department</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>

                {filtered.map((p, i) => (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center
                      hover:bg-[#111328] transition-colors ${
                        i < filtered.length - 1 ? "border-b border-[#1A1D35]" : ""
                      }`}
                  >
                    {/* Employee */}
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const uObj = employeeUsers.find((u) => u.id === p.userId);
                        const displayName = p.firstName || p.lastName
                          ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
                          : (uObj?.name || `User ID: ${p.userId}`);
                        return (
                          <>
                            <Avatar
                              name={displayName}
                              picture={p.profilePicture}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#E2E4F0] truncate" title={displayName}>
                                {displayName}
                              </p>
                              <p className="text-xs text-[#8B8FA8] truncate">
                                {p.joiningDate
                                  ? `Joined ${new Date(p.joiningDate).toLocaleDateString(
                                      "en-PK",
                                      { month: "short", year: "numeric" }
                                    )}`
                                  : "—"}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Phone */}
                    <span className="text-sm text-[#C2C5DA] truncate">
                      {p.phone || "—"}
                    </span>

                    {/* CNIC */}
                    <span className="text-sm text-[#C2C5DA] font-mono truncate">
                      {p.cnicNumber || "—"}
                    </span>

                    {/* Dept */}
                    <span className="text-sm text-[#C2C5DA]">
                      {p.departmentId ? `Dept #${p.departmentId}` : "—"}
                    </span>

                    {/* Status */}
                    <StatusBadge status={p.employmentStatus} />

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          setModal({ open: true, mode: "view", profile: p })
                        }
                        className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-[#FC0175] hover:bg-[#FC0175]/10 transition-all"
                        title="View"
                      >
                        <User size={15} />
                      </button>
                      <button
                        onClick={() =>
                          setModal({ open: true, mode: "edit", profile: p })
                        }
                        className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-[#FC0175] hover:bg-[#FC0175]/10 transition-all"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p.id!)}
                        className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer row */}
          {!loading && !error && (
            <div className="px-5 py-4 border-t border-[#1A1D35] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-[#8B8FA8]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span>
                  Showing <span className="text-white/60">{filtered.length}</span> of{" "}
                  <span className="text-white/60">{pageRecords.length}</span> page rows ·{" "}
                  <span className="text-white/60">{totalElements}</span> total
                </span>
                <div className="flex items-center gap-3 border-t border-[#2A2D45] sm:border-t-0 pt-2 sm:pt-0">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active: {stats.active}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Inactive: {stats.inactive}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Terminated: {stats.terminated}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <label className="flex items-center gap-1.5">
                  <span>Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="rounded-lg border border-[#2A2D45] bg-[#1a1d2e] px-2 py-1 text-xs text-white/90 focus:outline-none cursor-pointer"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n} className="bg-[#1a1d2e] text-white">
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#2A2D45] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-1 text-white/60">
                    Page {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-[#2A2D45] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal.open && (
        <Modal
          mode={modal.mode}
          profile={modal.profile}
          employeeUsers={employeeUsers}
          linkedUserIds={linkedUserIds}
          onClose={() => setModal({ open: false, mode: "create", profile: null })}
          onSave={handleSave}
        />
      )}

      {deleteTarget !== null && (
        <DeleteConfirm
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}