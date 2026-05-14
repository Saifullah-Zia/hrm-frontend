"use client";

import type { EmployeeProfileDto } from "@/services/employeeProfileApi";

export function EmployeeStats({ profiles }: { profiles: EmployeeProfileDto[] }) {
  const total = profiles.length;
  const active = profiles.filter((p) => p.employmentStatus === "ACTIVE").length;
  const inactive = profiles.filter((p) => p.employmentStatus === "INACTIVE").length;
  const terminated = profiles.filter((p) => p.employmentStatus === "TERMINATED").length;

  const cards = [
    { label: "Total", value: total, className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200" },
    { label: "Active", value: active, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
    { label: "Inactive", value: inactive, className: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
    { label: "Terminated", value: terminated, className: "border-red-500/30 bg-red-500/10 text-red-300" },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border px-4 py-3 ${c.className}`}
        >
          <p className="text-xs font-medium opacity-80">{c.label}</p>
          <p className="text-2xl font-semibold tabular-nums mt-0.5">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
