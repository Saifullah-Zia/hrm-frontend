'use client';

import { useMemo, useState } from 'react';
import { useEmployeeProfiles } from "@/hooks/useEmployeeProfiles";
import type { EmployeeProfileDto } from "@/services/employeeProfileApi";
import type { EmploymentStatus } from "@/app/types/employee";
import { EmployeeStats } from "@/app/dashboard/admin/_components/EmployeeStats";
import { EmployeeTable }      from './_components/EmployeeTable';
import { EmployeeFormModal }  from './_components/EmployeeFormModal';
import { DeleteModal }        from './_components/DeleteModal';
import { Toast, useToast }    from './_components/Toast';

export default function EmployeeProfilePage() {
  /* ── Data ── */
  const {
    profiles, departments, positions,
    loading, error,
    createProfile, updateProfile, deleteProfile,
  } = useEmployeeProfiles();

  /* ── Modal state ── */
  const [formOpen,      setFormOpen]      = useState(false);
  const [editTarget,    setEditTarget]    = useState<EmployeeProfileDto | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<EmployeeProfileDto | null>(null);

  /* ── Filters ── */
  const [search,       setSearch]       = useState('');
  const [deptFilter,   setDeptFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | ''>('');

  /* ── Toast ── */
  const { toast, show: showToast, clear: clearToast } = useToast();

  /* ── Derived filtered list ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return profiles.filter(p => {
      const matchSearch = !q
        || String(p.userId).includes(q)
        || (p.phone       ?? '').toLowerCase().includes(q)
        || (p.cnicNumber  ?? '').toLowerCase().includes(q)
        || (p.address     ?? '').toLowerCase().includes(q);
      const matchDept   = !deptFilter   || String(p.departmentId) === deptFilter;
      const matchStatus = !statusFilter || p.employmentStatus === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [profiles, search, deptFilter, statusFilter]);

  /* ── Handlers ── */
  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(p: EmployeeProfileDto) {
    setEditTarget(p);
    setFormOpen(true);
  }

  async function handleSave(dto: EmployeeProfileDto) {
    try {
      if (editTarget?.id) {
        await updateProfile(editTarget.id, dto);
        showToast('Profile updated successfully', 'success');
      } else {
        await createProfile(dto);
        showToast('Profile created successfully', 'success');
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
      throw err; // re-throw so modal stays open on error
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    try {
      await deleteProfile(deleteTarget.id);
      showToast('Profile deleted', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  }

  /* ── Render ── */
  return (
    <div className="p-6 min-h-full">

      {/* ── Page header ── */}
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Employee Profiles</h1>
          <p className="text-sm text-[#555870] mt-0.5">
            Manage all employee records.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="mt-3 sm:mt-0 self-start flex items-center gap-2 rounded-xl bg-indigo-600
            px-4 py-2.5 text-sm font-medium text-white
            hover:bg-indigo-500 active:scale-95 transition-all"
        >
          <span className="text-base leading-none">+</span>
          Add Employee
        </button>
      </div>

      {/* ── API error banner ── */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
          ⚠ {error}
        </div>
      )}

      {/* ── Stat cards ── */}
      <EmployeeStats profiles={profiles} />

      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555870] text-sm pointer-events-none">
            🔍
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user ID, phone, CNIC…"
            className="w-full rounded-xl border border-[#252840] bg-[#1a1d30] py-2.5 pl-9 pr-4
              text-sm text-white placeholder-[#555870]
              outline-none transition-colors focus:border-indigo-500"
          />
        </div>

        {/* Department filter */}
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="rounded-xl border border-[#252840] bg-[#1a1d30] px-3 py-2.5 text-sm
            text-[#8b8fa8] outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={String(d.id)}>{d.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as EmploymentStatus | '')}
          className="rounded-xl border border-[#252840] bg-[#1a1d30] px-3 py-2.5 text-sm
            text-[#8b8fa8] outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="TERMINATED">Terminated</option>
        </select>

        {/* Filtered count chip */}
        {(search || deptFilter || statusFilter) && (
          <span className="text-xs text-[#555870]">
            {filtered.length} of {profiles.length} shown
          </span>
        )}
      </div>

      {/* ── Table / Loading ── */}
      {loading ? (
        <div className="bg-[#1a1d30] border border-[#252840] rounded-xl p-14 text-center">
          <p className="text-sm text-[#555870] animate-pulse">Loading employee profiles…</p>
        </div>
      ) : (
        <EmployeeTable
          profiles={filtered}
          departments={departments}
          positions={positions}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      {/* ── Modals ── */}
      <EmployeeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editTarget}
        departments={departments}
        positions={positions}
      />

      <DeleteModal
        open={!!deleteTarget}
        label={deleteTarget ? `User #${deleteTarget.userId}` : undefined}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
    </div>
  );
}