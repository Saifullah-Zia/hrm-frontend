"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/apiClient";
import {
  employeeProfileApi,
  EmployeeProfileDto,
  mergeProfiles,
  requestSalaryOtp,
  verifySalaryOtp,
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
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  RefreshCw,
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

type DepartmentOption = { id: number; name: string };
type PositionOption = { id: number; title: string; departmentId?: number };

const selectClass =
  "bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] w-full focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all disabled:opacity-60 disabled:cursor-default";

// ─── Helper: extract a readable message from any thrown error ─────────────────
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: unknown; status?: number } }).response;
    const data = res?.data;
    if (typeof data === "string" && data.trim()) return data.trim();
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      for (const key of ["message", "error", "detail", "title"]) {
        if (key in o && o[key]) return String(o[key]);
      }
    }
    if (res?.status === 401) return "Session expired. Please log in again.";
    if (res?.status === 403) return "You do not have permission for this action.";
    if (res?.status) return `${fallback} (HTTP ${res.status})`;
  }
  if (err instanceof Error && err.message) {
    if (err.message === "Network Error") {
      return "Cannot reach the backend. Check NEXT_PUBLIC_API_URL on Vercel and backend CORS.";
    }
    return err.message;
  }
  return fallback;
}

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

// ─── Probation Badge ───────────────────────────────────────────────────────────
const ProbationBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border-amber-500/30">
    <Clock size={10} />
    Probation
  </span>
);

// ─── Helper: Check if user is on probation ─────────────────────────────────────
function isOnProbation(user: SystemUser | undefined): boolean {
  if (!user) return false;
  const now = new Date();
  const start = user.probationStartDate ? new Date(user.probationStartDate) : null;
  const end = user.probationEndDate ? new Date(user.probationEndDate) : null;
  
  if (!start || !end) return false;
  
  return now >= start && now <= end;
}

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
  basicSalary: undefined,
};

type ModalMode = "create" | "edit" | "view";

const Modal = ({
  mode,
  profile,
  employeeUsers,
  departments,
  positions,
  linkedUserIds,
  onClose,
  onSave,
}: {
  mode: ModalMode;
  profile: EmployeeProfileDto | null;
  employeeUsers: SystemUser[];
  departments: DepartmentOption[];
  positions: PositionOption[];
  linkedUserIds: Set<number>;
  onClose: () => void;
  onSave: (dto: EmployeeProfileDto) => Promise<void>;
}) => {
  const [form, setForm] = useState<EmployeeProfileDto>(profile ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isReadOnly = mode === "view";

  const handle = (field: keyof EmployeeProfileDto, val: string | number) => {
    if (field === "departmentId" || field === "positionId" || field === "biometricPersonId" || field === "basicSalary") {
      const n = val === "" ? undefined : Number(val);
      const isValid = n !== undefined && Number.isFinite(n) && (field === "basicSalary" ? n >= 0 : n > 0);
      setForm((f) => ({
        ...f,
        [field]: isValid ? n : undefined,
      }));
      return;
    }

    let finalVal: string | number = val;
    if (field === "cnicNumber" && typeof val === "string") {
      finalVal = val.replace(/[^0-9-]/g, "");
    }

    setForm((f) => {
      const next = { ...f, [field]: finalVal };

      if (field === "userId" && typeof finalVal === "number" && finalVal > 0 && mode === "create") {
        const selected = employeeUsers.find((u) => u.id === finalVal);
        if (selected?.name) {
          const parts = selected.name.trim().split(/\s+/);
          next.firstName = parts[0] ?? "";
          next.lastName = parts.slice(1).join(" ") || parts[0] || "";
        }
      }

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
    // Basic client-side guard so we never even hit the API with junk data
    if (mode === "create" && (!form.userId || form.userId <= 0)) {
      setModalError("Select an employee account from the dropdown.");
      return;
    }
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      setModalError("First name and last name are required.");
      return;
    }

    setModalError(null);
    setSaving(true);
    try {
      await onSave(form);
      // onSave closes the modal on success (handled by parent)
    } catch (err: unknown) {
      setModalError(extractErrorMessage(err, "Failed to save profile."));
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
              {mode === "view" ? "Profile details" : "Fill in the details below"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1E2140] text-[#8B8FA8] hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {modalError && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

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
              {mode === "create" && employeeUsers.length === 0 && (
                <span className="text-amber-400">
                  No EMPLOYEE-role users found. Create a user account with role EMPLOYEE first.
                </span>
              )}
              {mode === "create" &&
                employeeUsers.length > 0 &&
                employeeUsers.every((u) => linkedUserIds.has(u.id)) && (
                  <span className="text-amber-400">
                    Every EMPLOYEE user already has a profile.
                  </span>
                )}
              {mode !== "create" || employeeUsers.length === 0 ? null : (
                <>Must match the registered system user ID.</>
              )}
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

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8B8FA8] flex items-center gap-1.5">
              <span className="text-[#FC0175]">
                <Building2 size={13} />
              </span>
              Department
            </label>
            <select
              value={form.departmentId ?? ""}
              onChange={(e) => handle("departmentId", e.target.value)}
              disabled={isReadOnly}
              className={selectClass}
            >
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8B8FA8] flex items-center gap-1.5">
              <span className="text-[#FC0175]">
                <Briefcase size={13} />
              </span>
              Position
            </label>
            <select
              value={form.positionId ?? ""}
              onChange={(e) => handle("positionId", e.target.value)}
              disabled={isReadOnly}
              className={selectClass}
            >
              <option value="">— None —</option>
              {positions
                .filter((p) => !form.departmentId || p.departmentId === form.departmentId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
          </div>

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

          <Field
            label="Hikvision Person ID"
            icon={<User size={13} />}
            field="biometricPersonId"
            type="number"
            placeholder="Device Employee ID"
            form={form}
            handle={handle}
            isReadOnly={isReadOnly}
          />

          <Field
            label="Basic Salary (PKR)"
            icon={<CreditCard size={13} />}
            field="basicSalary"
            type="number"
            placeholder="Base monthly salary"
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
                    e.target.value as EmployeeProfileDto["employmentStatus"] & string
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

// ─── Salary OTP Modal ──────────────────────────────────────────────────────────
const SalaryOtpModal = ({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) => {
  const [step, setStep] = useState<"sending" | "input" | "verifying" | "done">("sending");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-send OTP when modal opens
  useEffect(() => {
    (async () => {
      try {
        await requestSalaryOtp();
        setStep("input");
        setTimeout(() => inputRef.current?.focus(), 100);
      } catch (err) {
        setError(extractErrorMessage(err, "Failed to send OTP. Please try again."));
        setStep("input");
      }
    })();
  }, []);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setStep("verifying");
    setError(null);
    try {
      const res = await verifySalaryOtp(code.trim());
      if (res.valid) {
        setStep("done");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      } else {
        setError(res.error ?? "Invalid or expired code. Please try again.");
        setStep("input");
        setCode("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Verification failed. Please try again."));
      setStep("input");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setCode("");
    try {
      await requestSalaryOtp();
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to resend. Please try again."));
    } finally {
      setResending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const isLoading = step === "sending" || step === "verifying" || step === "done";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl border border-[#2A2D45] animate-in fade-in zoom-in-95 duration-200">
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0e17] px-6 pt-7 pb-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8B8FA8] hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FC0175] to-[#a8005e] flex items-center justify-center shadow-lg shadow-[#FC0175]/30">
              {step === "done" ? (
                <CheckCircle size={26} className="text-white" />
              ) : (
                <ShieldCheck size={26} className="text-white" />
              )}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">
                {step === "done" ? "Verified!" : "Salary Verification"}
              </h3>
              <p className="text-xs text-[#8B8FA8] mt-1">
                {step === "sending"
                  ? "Sending code to your email…"
                  : step === "done"
                  ? "Revealing salary data…"
                  : "Enter the 6-digit code sent to your registered email"}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#0F1120] px-6 py-5">
          {step === "sending" ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={32} className="animate-spin text-[#FC0175]" />
            </div>
          ) : step === "done" ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={22} className="text-emerald-400" />
              </div>
            </div>
          ) : (
            <>
              {/* Email sent hint */}
              <div className="flex items-center gap-2 bg-[#FC0175]/10 border border-[#FC0175]/20 rounded-xl px-3 py-2.5 mb-4">
                <Mail size={14} className="text-[#FC0175] shrink-0" />
                <p className="text-xs text-[#FC0175]/90">Code sent to your admin email. Check your inbox.</p>
              </div>

              {/* 6-digit input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[#8B8FA8]">Verification Code</label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-[#1A1D35] border border-[#2A2D45] rounded-xl px-4 py-3 text-white placeholder-[#3D4065] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={12} />{error}
                </p>
              )}

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={step === "verifying" || code.length !== 6}
                className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FC0175] to-[#a8005e] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FC0175]/20"
              >
                {step === "verifying" ? (
                  <><Loader2 size={15} className="animate-spin" /> Verifying…</>
                ) : (
                  <><EyeOff size={15} /> Reveal Salary</>
                )}
              </button>

              {/* Resend */}
              <div className="mt-3 text-center">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-[#8B8FA8] hover:text-[#FC0175] transition-colors flex items-center gap-1 mx-auto disabled:opacity-50"
                >
                  <RefreshCw size={11} className={resending ? "animate-spin" : ""} />
                  {resending ? "Resending…" : "Resend code"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeProfilesPage() {
  const [profiles, setProfiles] = useState<EmployeeProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // ── Salary reveal OTP state ──────────────────────────────────────────────────
  const [salaryRevealed, setSalaryRevealed] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [modal, setModal] = useState<{
    open: boolean;
    mode: ModalMode;
    profile: EmployeeProfileDto | null;
  }>({ open: false, mode: "create", profile: null });

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [employeeUsers, setEmployeeUsers] = useState<SystemUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const linkedUserIds = new Set(profiles.map((p) => p.userId));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    apiClient
      .get<SystemUser[]>("/api/users")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setEmployeeUsers(
          list.filter(
            (u) => (u.role ?? "").replace(/^ROLE_/, "").toUpperCase() === "EMPLOYEE"
          )
        );
      })
      .catch(() => setEmployeeUsers([]));

    Promise.all([
      apiClient.get<DepartmentOption[]>("/api/departments"),
      apiClient.get<PositionOption[]>("/api/positions"),
    ])
      .then(([deptRes, posRes]) => {
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
        setPositions(Array.isArray(posRes.data) ? posRes.data : []);
      })
      .catch(() => {
        setDepartments([]);
        setPositions([]);
      });
  }, []);

  // ── Fetch (single source: GET /api/employee-profiles) ──
  const loadData = async (): Promise<EmployeeProfileDto[]> => {
    setLoading(true);
    setError(null);
    try {
      const allData = await employeeProfileApi.getAll();
      setProfiles(allData);
      return allData;
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "Failed to load employee profiles."));
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    let data = [...profiles];
    if (statusFilter !== "ALL") {
      data = data.filter((p) => p.employmentStatus === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          String(p.userId).includes(q) ||
          (p.firstName ?? "").toLowerCase().includes(q) ||
          (p.lastName ?? "").toLowerCase().includes(q) ||
          `${p.firstName ?? ""} ${p.lastName ?? ""}`.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.cnicNumber?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q)
      );
    }
    return data.sort((a, b) =>
      `${a.firstName ?? ""} ${a.lastName ?? ""}`.localeCompare(
        `${b.firstName ?? ""} ${b.lastName ?? ""}`,
        undefined,
        { sensitivity: "base" }
      )
    );
  }, [profiles, search, statusFilter]);

  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize) || 1);
  const pageRows = useMemo(() => {
    const safePage = Math.min(page, totalPages - 1);
    const start = safePage * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, totalPages]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  // ── CRUD handlers ──
  // NOTE: this function now THROWS on failure (no try/catch swallow here).
  // The Modal component is responsible for catching and displaying the error,
  // so the modal stays open with a visible message instead of silently failing.
  const handleSave = async (dto: EmployeeProfileDto) => {
    let saved: EmployeeProfileDto;

    if (modal.mode === "create") {
      if (!dto.userId || dto.userId <= 0) {
        throw new Error("Select an employee account from the dropdown.");
      }
      if (profiles.some((p) => p.userId === dto.userId)) {
        throw new Error("This employee already has a profile. Edit the existing one instead.");
      }
      saved = await employeeProfileApi.create(dto);
    } else if (modal.mode === "edit" && modal.profile?.id) {
      saved = await employeeProfileApi.update(modal.profile.id, dto);
    } else {
      throw new Error("Nothing to save.");
    }

    const fresh = await employeeProfileApi.getAll().catch(() => [] as EmployeeProfileDto[]);
    const merged = mergeProfiles(fresh.length > 0 ? fresh : profiles, saved);
    const isVisible = merged.some(
      (p) =>
        (saved.id && p.id === saved.id) ||
        (saved.userId && p.userId === saved.userId)
    );
    if (!isVisible) {
      throw new Error(
        "Profile was saved, but it did not appear in the list. Reload the page or check the backend."
      );
    }

    setProfiles(merged);
    setPage(0);

    setToast({
      message: modal.mode === "create" ? "Employee profile created." : "Employee profile updated.",
      type: "success",
    });
    setModal({ open: false, mode: "create", profile: null });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await employeeProfileApi.delete(deleteTarget);
      setDeleteTarget(null);
      setPage(0);
      await loadData();
      setToast({ message: "Employee profile deleted.", type: "success" });
    } catch (err: unknown) {
      setToast({
        message: extractErrorMessage(err, "Failed to delete profile."),
        type: "error",
      });
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

        {toast && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {toast.message}
          </div>
        )}

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
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${statusFilter === s
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
          ) : totalElements === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <User size={32} className="text-[#2A2D45]" />
              <p className="text-sm text-[#8B8FA8]">No profiles found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#2A2D45] text-xs font-semibold text-[#8B8FA8] uppercase tracking-wider">
                  <span>Employee</span>
                  <span>Phone</span>
                  <span>CNIC</span>
                  <span>Department</span>
                  <span>Basic Salary</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>

                {pageRows.map((p, i) => (
                  <div
                    key={p.id ?? `user-${p.userId}`}
                    className={`grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center
                      hover:bg-[#111328] transition-colors ${i < pageRows.length - 1 ? "border-b border-[#1A1D35]" : ""
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
                      {p.departmentId
                        ? departments.find((d) => d.id === p.departmentId)?.name ?? `Dept #${p.departmentId}`
                        : "—"}
                    </span>

                    {/* Basic Salary */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm text-[#C2C5DA] truncate transition-all duration-300 select-none"
                        style={!salaryRevealed ? { filter: "blur(6px)", userSelect: "none" } : {}}
                      >
                        {p.basicSalary !== undefined && p.basicSalary !== null
                          ? `PKR ${p.basicSalary.toLocaleString()}`
                          : "—"}
                      </span>
                      <button
                        onClick={() => {
                          if (salaryRevealed) {
                            setSalaryRevealed(false);
                          } else {
                            setShowOtpModal(true);
                          }
                        }}
                        className="p-1 rounded-md text-[#8B8FA8] hover:text-[#FC0175] hover:bg-[#FC0175]/10 transition-all shrink-0"
                        title={salaryRevealed ? "Hide salary" : "Reveal salary"}
                      >
                        {salaryRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.employmentStatus} />
                      {(() => {
                        const uObj = employeeUsers.find((u) => u.id === p.userId);
                        return isOnProbation(uObj) ? <ProbationBadge /> : null;
                      })()}
                    </div>

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
                        onClick={() => {
                          if (!p.id) {
                            setToast({
                              message: "This profile has no ID — refresh the page and try again.",
                              type: "error",
                            });
                            return;
                          }
                          setDeleteTarget(p.id);
                        }}
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
                  Showing <span className="text-white/60">{pageRows.length}</span> of{" "}
                  <span className="text-white/60">{totalElements}</span> filtered ·{" "}
                  <span className="text-white/60">{profiles.length}</span> total
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

      {/* ── Salary OTP Modal ── */}
      {showOtpModal && (
        <SalaryOtpModal
          onSuccess={() => setSalaryRevealed(true)}
          onClose={() => setShowOtpModal(false)}
        />
      )}

      {/* ── Modals ── */}
      {modal.open && (
        <Modal
          mode={modal.mode}
          profile={modal.profile}
          employeeUsers={employeeUsers}
          departments={departments}
          positions={positions}
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