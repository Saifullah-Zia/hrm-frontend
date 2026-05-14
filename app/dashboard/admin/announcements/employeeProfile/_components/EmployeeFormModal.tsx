"use client";

import { useEffect, useState } from "react";
import type { EmployeeProfileDto } from "@/services/employeeProfileApi";
import type { DepartmentOption, PositionOption } from "@/hooks/useEmployeeProfiles";

const EMPTY: EmployeeProfileDto = {
  userId: 0,
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

export function EmployeeFormModal({
  open,
  onClose,
  onSave,
  initial,
  departments,
  positions,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (dto: EmployeeProfileDto) => Promise<void>;
  initial: EmployeeProfileDto | null;
  departments: DepartmentOption[];
  positions: PositionOption[];
}) {
  const [form, setForm] = useState<EmployeeProfileDto>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...EMPTY, ...initial } : { ...EMPTY });
  }, [open, initial]);

  if (!open) return null;

  const patch = (p: Partial<EmployeeProfileDto>) =>
    setForm((f) => ({ ...f, ...p }));

  async function submit() {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      /* parent shows toast; keep modal open */
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[#252840] bg-[#0f111a] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#252840] bg-[#16181f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#252840] px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            {initial?.id ? "Edit employee profile" : "Add employee profile"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[#8b8fa8] hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <label className="sm:col-span-2 flex flex-col gap-1 text-xs text-[#8b8fa8]">
            User ID
            <input
              type="number"
              className={inputCls}
              value={form.userId || ""}
              onChange={(e) => patch({ userId: Number(e.target.value) || 0 })}
              disabled={!!initial?.id}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Phone
            <input className={inputCls} value={form.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            CNIC
            <input
              className={inputCls}
              value={form.cnicNumber ?? ""}
              onChange={(e) => patch({ cnicNumber: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Date of birth
            <input
              type="date"
              className={inputCls}
              value={form.dateOfBirth?.slice(0, 10) ?? ""}
              onChange={(e) => patch({ dateOfBirth: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Joining date
            <input
              type="date"
              className={inputCls}
              value={form.joiningDate?.slice(0, 10) ?? ""}
              onChange={(e) => patch({ joiningDate: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Department
            <select
              className={inputCls}
              value={form.departmentId ?? ""}
              onChange={(e) =>
                patch({ departmentId: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Position
            <select
              className={inputCls}
              value={form.positionId ?? ""}
              onChange={(e) =>
                patch({ positionId: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">—</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Emergency name
            <input
              className={inputCls}
              value={form.emergencyContactName ?? ""}
              onChange={(e) => patch({ emergencyContactName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Emergency phone
            <input
              className={inputCls}
              value={form.emergencyContactPhone ?? ""}
              onChange={(e) => patch({ emergencyContactPhone: e.target.value })}
            />
          </label>

          <label className="sm:col-span-2 flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Address
            <textarea
              className={`${inputCls} min-h-[72px] resize-none`}
              value={form.address ?? ""}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </label>

          <label className="sm:col-span-2 flex flex-col gap-1 text-xs text-[#8b8fa8]">
            Employment status
            <select
              className={inputCls}
              value={form.employmentStatus ?? "ACTIVE"}
              onChange={(e) =>
                patch({
                  employmentStatus: e.target.value as EmployeeProfileDto["employmentStatus"],
                })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#252840] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#252840] px-4 py-2 text-sm text-[#8b8fa8] hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !form.userId}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
