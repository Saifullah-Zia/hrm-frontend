"use client";
import { useAuthStore } from "@/store/authStore";

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">My Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Welcome back, {user?.username}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Leave Balance",     value: "—" },
          { label: "Attendance %",      value: "—" },
          { label: "Next Payslip",      value: "—" },
          { label: "Announcements",     value: "—" },
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