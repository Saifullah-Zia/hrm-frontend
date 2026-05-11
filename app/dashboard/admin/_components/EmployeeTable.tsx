'use client';

import { EmployeeProfileDto, Department, Position } from '@/types/employee';
import { StatusBadge }    from './StatusBadge';
import { EmployeeAvatar } from './EmployeeAvatar';

interface Props {
  profiles:    EmployeeProfileDto[];
  departments: Department[];
  positions:   Position[];
  onEdit:      (p: EmployeeProfileDto) => void;
  onDelete:    (p: EmployeeProfileDto) => void;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${+day}, ${y}`;
}

const TH = 'px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#555870]';
const TD = 'px-4 py-3.5 text-sm text-[#8b8fa8]';

export function EmployeeTable({ profiles, departments, positions, onEdit, onDelete }: Props) {
  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));
  const posMap  = Object.fromEntries(positions.map(p => [p.id, p.title]));

  if (!profiles.length) {
    return (
      <div className="bg-[#1a1d30] border border-[#252840] rounded-xl p-14 text-center">
        <p className="text-3xl mb-3 opacity-40">👥</p>
        <p className="text-sm text-[#555870]">No employee profiles found</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d30] border border-[#252840] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">

          <thead>
            <tr className="border-b border-[#252840] bg-white/[0.015]">
              <th className={TH}>Employee</th>
              <th className={TH}>Phone</th>
              <th className={TH}>Department</th>
              <th className={TH}>Position</th>
              <th className={TH}>Joining Date</th>
              <th className={TH}>Status</th>
              <th className={TH}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {profiles.map((p, i) => (
              <tr
                key={p.id ?? i}
                className="border-b border-[#252840] last:border-0 hover:bg-white/[0.018] transition-colors"
              >
                {/* Employee cell */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar
                      name={`User ${p.userId}`}
                      seed={p.id ?? i}
                    />
                    <div>
                      <p className="text-[13px] font-medium text-white">
                        User #{p.userId}
                      </p>
                      <p className="text-[11px] text-[#555870] font-mono mt-0.5">
                        ID: {p.id ?? '—'}
                        {p.cnicNumber ? ` · ${p.cnicNumber}` : ''}
                      </p>
                    </div>
                  </div>
                </td>

                <td className={TD}>{p.phone || '—'}</td>

                {/* Department badge */}
                <td className="px-4 py-3.5">
                  {p.departmentId ? (
                    <span className="inline-block rounded-full bg-indigo-500/10 border border-indigo-500/20
                      text-indigo-400 text-[11px] font-medium px-2.5 py-0.5">
                      {deptMap[p.departmentId] ?? `Dept ${p.departmentId}`}
                    </span>
                  ) : (
                    <span className="text-[#555870] text-sm">—</span>
                  )}
                </td>

                <td className={TD}>
                  {p.positionId ? (posMap[p.positionId] ?? `Pos ${p.positionId}`) : '—'}
                </td>

                <td className={TD}>{fmtDate(p.joiningDate)}</td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  {p.employmentStatus
                    ? <StatusBadge status={p.employmentStatus} />
                    : <span className="text-[#555870] text-sm">—</span>}
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {/* Edit */}
                    <button
                      onClick={() => onEdit(p)}
                      title="Edit profile"
                      className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#2e3250]
                        text-[#555870] text-sm
                        hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-400
                        transition-colors"
                    >
                      ✏️
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => onDelete(p)}
                      title="Delete profile"
                      className="h-7 w-7 flex items-center justify-center rounded-lg border border-[#2e3250]
                        text-[#555870] text-sm
                        hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400
                        transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* Table footer */}
      <div className="px-4 py-3 border-t border-[#252840] flex items-center justify-between">
        <p className="text-xs text-[#555870]">
          Showing {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}