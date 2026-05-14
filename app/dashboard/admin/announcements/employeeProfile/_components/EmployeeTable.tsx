"use client";

import type { EmployeeProfileDto } from "@/services/employeeProfileApi";
import type { DepartmentOption, PositionOption } from "@/hooks/useEmployeeProfiles";

function deptName(
  departments: DepartmentOption[],
  id?: number
): string {
  if (id == null) return "—";
  return departments.find((d) => d.id === id)?.name ?? `#${id}`;
}

function posTitle(
  positions: PositionOption[],
  id?: number
): string {
  if (id == null) return "—";
  return positions.find((p) => p.id === id)?.title ?? `#${id}`;
}

export function EmployeeTable({
  profiles,
  departments,
  positions,
  onEdit,
  onDelete,
}: {
  profiles: EmployeeProfileDto[];
  departments: DepartmentOption[];
  positions: PositionOption[];
  onEdit: (p: EmployeeProfileDto) => void;
  onDelete: (p: EmployeeProfileDto) => void;
}) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-[#252840] bg-[#1a1d30] px-6 py-12 text-center text-sm text-[#555870]">
        No employee profiles match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#252840] bg-[#1a1d30]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#252840] text-xs uppercase tracking-wide text-[#555870]">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252840] text-[#c4c8e0]">
            {profiles.map((p) => (
              <tr key={p.id ?? `new-${p.userId}`} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-white">#{p.userId}</td>
                <td className="px-4 py-3">{p.phone ?? "—"}</td>
                <td className="px-4 py-3">{deptName(departments, p.departmentId)}</td>
                <td className="px-4 py-3">{posTitle(positions, p.positionId)}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.employmentStatus === "ACTIVE"
                        ? "text-emerald-400"
                        : p.employmentStatus === "INACTIVE"
                          ? "text-amber-400"
                          : "text-red-400"
                    }
                  >
                    {p.employmentStatus ?? "ACTIVE"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="mr-2 rounded-lg px-2 py-1 text-indigo-400 hover:bg-indigo-500/10"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="rounded-lg px-2 py-1 text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
