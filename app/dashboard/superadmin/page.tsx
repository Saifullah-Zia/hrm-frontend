// app/dashboard/superadmin/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { announcementApi } from "@/services/announcementApi";
import apiClient from "@/lib/apiClient";

interface DashboardStats {
  totalUsers: number;
  departments: number;
  activeEmployees: number;
  payrollThisMonth: number;
  pendingApprovals: number;
  announcements: number;
}

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          usersRes,
          departmentsRes,
          payrollRes,
          leavesRes,
          announcementsRes,
        ] = await Promise.all([
          apiClient.get("/api/users"),                 // ✅ GET /api/users
          apiClient.get("/api/departments"),           // ✅ GET /api/departments
          apiClient.get("/api/payroll"),               // ✅ GET /api/payroll
          apiClient.get("/api/leave/status/PENDING"),  // ✅ GET /api/leave/status/{status}
          announcementApi.getAll(),                    // ✅ GET /api/announcements
        ]);

        const allUsers: any[] = usersRes.data ?? [];

        setStats({
          totalUsers:       allUsers.length,
          departments:      departmentsRes.data?.length  ?? 0,
          activeEmployees:  allUsers.filter((u: any) => u.role === "EMPLOYEE").length,
          payrollThisMonth: payrollRes.data?.length      ?? 0,
          pendingApprovals: leavesRes.data?.length       ?? 0,
          announcements:    announcementsRes?.length     ?? 0,
        });
      } catch (err) {
        console.error("Failed to fetch superadmin dashboard stats:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Users",        value: stats?.totalUsers        },
    { label: "Departments",        value: stats?.departments       },
    { label: "Active Employees",   value: stats?.activeEmployees   },
    { label: "Payroll This Month", value: stats?.payrollThisMonth  },
    { label: "Pending Approvals",  value: stats?.pendingApprovals  },
    { label: "Announcements",      value: stats?.announcements     },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Super Admin Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Full system access — {user?.username}</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-white/80 mt-2">
              {loading ? (
                <span className="inline-block w-10 h-8 rounded-lg bg-white/10 animate-pulse" />
              ) : (
                stat.value ?? "—"
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}