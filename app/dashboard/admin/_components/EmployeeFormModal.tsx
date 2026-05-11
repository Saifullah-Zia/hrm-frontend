'use client';

import { useEffect, useState } from 'react';
import { EmployeeProfileDto, Department, Position } from '@app/types/employee';

/* ── helpers ── */
const EMPTY: EmployeeProfileDto = {
  userId: 0,
  phone: '',
  address: '',
  dateOfBirth: '',
  joiningDate: '',
  cnicNumber: '',
  profilePicture: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  departmentId: undefined,
  positionId: undefined,
  employmentStatus: 'ACTIVE',
};

interface Props {
  open:        boolean;
  onClose:     () => void;
  onSave:      (dto: EmployeeProfileDto) => Promise<void>;
  initial?:    EmployeeProfileDto | null;
  departments: Department[];
  positions:   Position[];
}

export function EmployeeFormModal({
  open, onClose, onSave, initial, departments, positions,
}: Props) {
  const [form,   setForm]   = useState<EmployeeProfileDto>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeProfileDto, string>>>({});

  useEffect(() => {
    setForm(initial ? { ...initial } : EMPTY);
    setErrors({});
  }, [initial, open]);

  if (!open) return null;

  function set<K extends keyof EmployeeProfileDto>(k: K, v: EmployeeProfileDto[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.userId) e.userId = 'User ID is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErrors({ userId: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial?.id;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal */}
      <div className="bg-[#1a1d30] border border-[#252840] rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#252840] sticky top-0 bg-[#1a1d30] z-10">
          <h2 className="text-[15px] font-semibold text-white">
            {isEdit ? 'Edit Employee Profile' : 'Add Employee Profile'}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-[#8b8fa8]
              hover:bg-white/5 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* User ID */}
          <Field label="User ID *" error={errors.userId} span={1}>
            <input
              type="number"
              min={1}
              value={form.userId || ''}
              onChange={e => set('userId', Number(e.target.value))}
              placeholder="Linked user account ID"
              className={input(!!errors.userId)}
            />
          </Field>

          {/* Status */}
          <Field label="Employment Status" span={1}>
            <select
              value={form.employmentStatus}
              onChange={e => set('employmentStatus', e.target.value as EmployeeProfileDto['employmentStatus'])}
              className={input()}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </Field>

          {/* Phone */}
          <Field label="Phone" span={1}>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={e => set('phone', e.target.value)}
              placeholder="+92 300 0000000"
              className={input()}
            />
          </Field>

          {/* CNIC */}
          <Field label="CNIC Number" span={1}>
            <input
              value={form.cnicNumber ?? ''}
              onChange={e => set('cnicNumber', e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
              className={input()}
            />
          </Field>

          {/* Address — full width */}
          <Field label="Address" span={2}>
            <input
              value={form.address ?? ''}
              onChange={e => set('address', e.target.value)}
              placeholder="Street, City, Province"
              className={input()}
            />
          </Field>

          {/* DOB */}
          <Field label="Date of Birth" span={1}>
            <input
              type="date"
              value={form.dateOfBirth ?? ''}
              onChange={e => set('dateOfBirth', e.target.value)}
              className={input()}
            />
          </Field>

          {/* Joining Date */}
          <Field label="Joining Date" span={1}>
            <input
              type="date"
              value={form.joiningDate ?? ''}
              onChange={e => set('joiningDate', e.target.value)}
              className={input()}
            />
          </Field>

          {/* Department */}
          <Field label="Department" span={1}>
            <select
              value={form.departmentId ?? ''}
              onChange={e => set('departmentId', e.target.value ? Number(e.target.value) : undefined)}
              className={input()}
            >
              <option value="">Select department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>

          {/* Position */}
          <Field label="Position" span={1}>
            <select
              value={form.positionId ?? ''}
              onChange={e => set('positionId', e.target.value ? Number(e.target.value) : undefined)}
              className={input()}
            >
              <option value="">Select position</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </Field>

          {/* Emergency contact name */}
          <Field label="Emergency Contact Name" span={1}>
            <input
              value={form.emergencyContactName ?? ''}
              onChange={e => set('emergencyContactName', e.target.value)}
              placeholder="Contact person name"
              className={input()}
            />
          </Field>

          {/* Emergency contact phone */}
          <Field label="Emergency Contact Phone" span={1}>
            <input
              type="tel"
              value={form.emergencyContactPhone ?? ''}
              onChange={e => set('emergencyContactPhone', e.target.value)}
              placeholder="+92 300 0000000"
              className={input()}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[#252840] sticky bottom-0 bg-[#1a1d30]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#2e3250] text-sm text-[#8b8fa8]
              hover:bg-white/5 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-sm text-white font-medium
              hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Internal helpers ── */

function input(hasError = false) {
  return [
    'w-full rounded-xl border px-3 py-2 text-sm bg-[#131627] text-white',
    'placeholder-[#555870] outline-none transition-colors',
    'focus:border-indigo-500',
    hasError
      ? 'border-red-500/60 focus:border-red-500'
      : 'border-[#252840] hover:border-[#2e3250]',
  ].join(' ');
}

function Field({
  label, children, error, span = 1,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  span?: 1 | 2;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span === 2 ? 'sm:col-span-2' : ''}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555870]">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}