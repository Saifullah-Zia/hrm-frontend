// app/dashboard/superadmin/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { announcementApi } from "@/services/announcementApi";
import apiClient from "@/lib/apiClient";
import { payrollApi } from "@/services/payrollApi";

import { presenceApi, OnlineUsersResponse } from "@/services/presenceApi";
import { useVisibleInterval } from "@/lib/useVisibleInterval";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  return `${Math.floor(s / 60)}m ago`;
}

function OnlineNowCard() {
  const [data, setData] = useState<OnlineUsersResponse | null>(null);
  const load = () => { presenceApi.getOnline().then(setData).catch(() => {}); };

  useEffect(() => { load(); }, []);
  useVisibleInterval(load, 30_000);

  return (
    <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5 sm:col-span-2 lg:col-span-3">
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Online now</p>
      <p className="text-3xl font-bold text-white/80 mt-2">
        {data ? data.onlineCount : "—"}{" "}
        <span className="text-white/30 text-xl">/ {data ? data.totalUsers : "—"} users</span>
      </p>
      <ul className="mt-4 divide-y divide-white/[0.06]">
        {data?.users.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-white/80">
              {u.name} <span className="text-white/40">{u.email}</span>
            </span>
            <span className="text-white/40">
              {u.role} · {timeAgo(u.lastSeenAt)}
            </span>
          </li>
        ))}
        {data && data.users.length === 0 && (
          <li className="py-2 text-sm text-white/40">Nobody online right now.</li>
        )}
      </ul>
    </div>
  );
}

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
          payrollTotal,
          leavesRes,
          announcementsRes,
        ] = await Promise.all([
          apiClient.get("/api/users").catch(() => ({ data: [] })),
          apiClient.get("/api/departments").catch(() => ({ data: [] })),
          payrollApi.getTotalCount(),
          apiClient.get("/api/leave/status/PENDING").catch(() => ({ data: [] })),
          announcementApi.getAll().catch(() => []),
        ]);

        const allUsers: any[] = usersRes.data ?? [];

        setStats({
          totalUsers:       allUsers.length,
          departments:      departmentsRes.data?.length  ?? 0,
          activeEmployees:  allUsers.filter((u: any) => u.role === "EMPLOYEE").length,
          payrollThisMonth: payrollTotal,
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
         <OnlineNowCard />
      </div>
    </div>
  );
}