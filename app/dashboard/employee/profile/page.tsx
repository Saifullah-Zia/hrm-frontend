"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { parseUserId } from "@/lib/parseUserId";
import {
  employeeProfileApi,
  EmployeeProfileDto,
  EmployeeProfileLoadError,
} from "@/services/employeeProfileApi";
import {
  formatProbationRange,
  probationApi,
  probationStatusBadgeClass,
  probationStatusShortLabel,
  type ProbationStatus,
} from "@/services/probationApi";

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40 transition-colors";

export default function EmployeeProfilePage() {
  const { user } = useAuthStore();
  const userId = parseUserId(user?.userId);
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const profileQuery = useQuery({
    queryKey: ["employee-profile", userId, user?.email],
    queryFn: () =>
      employeeProfileApi.getForEmployeeAccount(userId!, { email: user?.email }),
    enabled: typeof userId === "number",
  });

  const probationUserQuery = useQuery({
    queryKey: ["user-probation", userId],
    queryFn: () => probationApi.getByUserId(userId!),
    enabled: typeof userId === "number",
    staleTime: 60_000,
  });

  const [draft, setDraft] = useState<EmployeeProfileDto | null>(null);

  useEffect(() => {
    if (profileQuery.data) setDraft({ ...profileQuery.data });
    else if (!profileQuery.isLoading && profileQuery.isFetched) setDraft(null);
  }, [profileQuery.data, profileQuery.isLoading, profileQuery.isFetched]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const saveMutation = useMutation({
    mutationFn: (dto: EmployeeProfileDto) =>
      employeeProfileApi.update(dto.id!, {
        ...dto,
        userId: dto.userId,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(["employee-profile", userId], updated);
      setDraft(updated);
      setToast({ message: "Profile updated.", type: "success" });
    },
    onError: () => {
      setToast({
        message: "Could not save profile. Check permissions or try again.",
        type: "error",
      });
    },
  });

  const handleSave = () => {
    if (!draft?.id) {
      setToast({ message: "No profile record to update yet.", type: "error" });
      return;
    }
    saveMutation.mutate(draft);
  };

  if (typeof userId !== "number") {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Your account is missing required user information. Please contact support.
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-white/10" />
        <div className="h-40 rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }

  if (profileQuery.isError || (!profileQuery.isLoading && !draft)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">My profile</h1>
        <div
          className={`rounded-2xl border px-5 py-6 text-sm space-y-3 ${
            profileQuery.error instanceof EmployeeProfileLoadError &&
            profileQuery.error.code === "FORBIDDEN"
              ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
              : "border-white/[0.08] bg-[#13151e] text-white/50"
          }`}
        >
          <p>
            {profileQuery.error instanceof EmployeeProfileLoadError
              ? profileQuery.error.message
              : "No employee profile is linked to your login."}
          </p>
          {typeof userId === "number" && (
            <p className="text-xs opacity-80">
              Login user id: <span className="font-mono text-white/70">{userId}</span>
              {user?.email ? <> · <span className="font-mono">{user.email}</span></> : null}
            </p>
          )}
          <p className="text-xs leading-relaxed opacity-80">
            {profileQuery.error instanceof EmployeeProfileLoadError &&
            profileQuery.error.code === "FORBIDDEN"
              ? "You do not have permission to access this profile. Please contact support."
              : "Please ask an admin to link an employee profile to your user account, then sign out and sign in again."}
          </p>
          <button
            type="button"
            onClick={() => profileQuery.refetch()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!draft) return null;

  const setField = (field: keyof EmployeeProfileDto, value: string) => {
    let finalVal = value;
    if (field === "cnicNumber") {
      finalVal = value.replace(/[^0-9-]/g, "");
    }
    setDraft((prev) => (prev ? { ...prev, [field]: finalVal } : prev));
  };

  const pu = probationUserQuery.data;
  const statusRaw = pu?.probationStatus ?? draft.probationStatus;
  const status = (statusRaw ?? "").toUpperCase() as ProbationStatus | "";
  const probationStart = pu?.probationStartDate ?? draft.probationStartDate ?? undefined;
  const probationEnd = pu?.probationEndDate ?? draft.probationEndDate ?? undefined;
  const showProbation =
    status === "ON_PROBATION" ||
    status === "COMPLETED" ||
    status === "CONFIRMED" ||
    !!(probationStart || probationEnd);
  const rangeLine = formatProbationRange(probationStart, probationEnd);

  return (
    <div className="space-y-6 max-w-3xl">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/15 text-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white/90 tracking-tight">My profile</h1>
            {showProbation && status && (
              <span
                className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-medium ${probationStatusBadgeClass(status)}`}
              >
                {probationStatusShortLabel(status)}
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm mt-1">View and update your contact details.</p>
        </div>
        <button
          type="button"
          onClick={() => profileQuery.refetch()}
          disabled={profileQuery.isFetching}
          className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/70 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {profileQuery.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {showProbation && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-5 py-4 text-sm text-white/70">
          <p className="text-white/85 font-medium">Probation</p>
          {status === "ON_PROBATION" && (
            <p className="mt-1 text-white/55">
              You are currently in your probation period.{rangeLine ? ` ${rangeLine}.` : ""}
            </p>
          )}
          {status === "COMPLETED" && (
            <p className="mt-1 text-white/55">
              Your probation period has ended. HR will confirm your permanent employment when ready.
              {rangeLine ? ` ${rangeLine}.` : ""}
            </p>
          )}
          {status === "CONFIRMED" && (
            <p className="mt-1 text-white/55">
              Your probation is complete and your employment has been confirmed as permanent.
              {rangeLine ? ` (${rangeLine})` : ""}
            </p>
          )}
          {!status && rangeLine && <p className="mt-1 text-white/55">{rangeLine}</p>}
        </div>
      )}

      <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Username</label>
            <p className="mt-1.5 text-white/80 text-sm">{user?.username}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Email</label>
            <p className="mt-1.5 text-white/80 text-sm">{user?.email ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Phone</label>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={draft.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">CNIC</label>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={draft.cnicNumber ?? ""}
              onChange={(e) => setField("cnicNumber", e.target.value)}
              placeholder="National ID"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Address</label>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={draft.address ?? ""}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Street, city"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Date of birth</label>
            <input
              type="date"
              className={`mt-1.5 ${inputClass}`}
              value={(draft.dateOfBirth ?? "").slice(0, 10)}
              onChange={(e) => setField("dateOfBirth", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Joining date</label>
            <p className="mt-1.5 text-white/60 text-sm py-2.5">
              {(draft.joiningDate && new Date(draft.joiningDate).toLocaleDateString()) || "—"}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Emergency contact</label>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={draft.emergencyContactName ?? ""}
              onChange={(e) => setField("emergencyContactName", e.target.value)}
              placeholder="Name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Emergency phone</label>
            <input
              className={`mt-1.5 ${inputClass}`}
              value={draft.emergencyContactPhone ?? ""}
              onChange={(e) => setField("emergencyContactPhone", e.target.value)}
              placeholder="Phone"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Department ID</label>
            <p className="mt-1.5 text-white/50 text-sm py-2.5">{draft.departmentId ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Position ID</label>
            <p className="mt-1.5 text-white/50 text-sm py-2.5">{draft.positionId ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Status</label>
            <p className="mt-1.5 text-white/70 text-sm py-2.5 capitalize">{draft.employmentStatus ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Hikvision Person ID</label>
            <p className="mt-1.5 text-white/50 text-sm py-2.5">{draft.biometricPersonId ?? "—"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Basic Salary</label>
            <p className="mt-1.5 text-white/70 text-sm py-2.5 font-medium">
              {draft.basicSalary !== undefined && draft.basicSalary !== null
                ? `PKR ${draft.basicSalary.toLocaleString()}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
