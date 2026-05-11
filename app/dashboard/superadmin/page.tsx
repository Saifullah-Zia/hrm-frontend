// app/dashboard/superadmin/page.tsx
"use client";
import { useAuthStore } from "@/store/authStore";

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Super Admin Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Full system access — {user?.username}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Users",       value: "—", color: "indigo" },
          { label: "Departments",       value: "—", color: "violet" },
          { label: "Active Employees",  value: "—", color: "emerald" },
          { label: "Payroll This Month",value: "—", color: "amber" },
          { label: "Pending Approvals", value: "—", color: "rose" },
          { label: "Announcements",     value: "—", color: "sky" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-bold text-white/80 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}