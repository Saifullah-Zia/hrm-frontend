"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { leaveApi, leavePolicyApi } from "@/services/leaveApi";
import { attendanceApi } from "@/services/attendanceApi";
import { payrollApi } from "@/services/payrollApi";
import { announcementApi } from "@/services/announcementApi";
import AttendanceClockCard from "@/app/components/employee/AttendanceClockCard";

const LINKS = [
  { href: "/dashboard/employee/profile", label: "My profile", desc: "Contact & HR details", emoji: "👤" },
  { href: "/dashboard/employee/leave", label: "Apply for leave", desc: "Submit & track requests", emoji: "📅" },
  { href: "/dashboard/employee/attendance", label: "My attendance", desc: "Days & check-in times", emoji: "⏱️" },
  { href: "/dashboard/employee/payslips", label: "My payslips", desc: "Salary history", emoji: "📄" },
  { href: "/dashboard/employee/announcements", label: "Announcements", desc: "Company news", emoji: "📣" },
] as const;

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const userId = user?.userId;

  const [leavesQ, attQ, payQ, annQ, polQ] = useQueries({
    queries: [
      {
        queryKey: ["employee-leaves", userId],
        queryFn: () => leaveApi.getByUserId(userId!),
        enabled: typeof userId === "number",
      },
      {
        queryKey: ["employee-attendance", userId],
        queryFn: () => attendanceApi.getByUserId(userId!),
        enabled: typeof userId === "number",
      },
      {
        queryKey: ["employee-payroll", userId],
        queryFn: () => payrollApi.getByUserId(userId!),
        enabled: typeof userId === "number",
      },
      {
        queryKey: ["announcements", "active"],
        queryFn: () => announcementApi.getActive(),
      },
      {
        queryKey: ["leave-policies"],
        queryFn: () => leavePolicyApi.getAll(),
        staleTime: 5 * 60_000,
      },
    ],
  });

  const leaves = leavesQ.data ?? [];
  const pendingLeave = leaves.filter((l) => l.status === "PENDING").length;
  const attendanceRows = attQ.data ?? [];
  const presentCount = attendanceRows.filter((r) => r.status === "PRESENT").length;
  const attRate =
    attendanceRows.length > 0 ? Math.round((presentCount / attendanceRows.length) * 100) : null;
  const payrollRows = payQ.data ?? [];
  const latestPay = [...payrollRows].sort((a, b) => b.id - a.id)[0];
  const announcementsCount = (annQ.data ?? []).length;

  const stat = (label: string, value: string) => (
    <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white/80 mt-2">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">My dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Welcome back, {user?.username}</p>
        {typeof userId !== "number" && (
          <p className="text-amber-400/90 text-sm mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            Your session is missing required user information. Please contact support.
          </p>
        )}
      </div>

      {typeof userId === "number" && <AttendanceClockCard userId={userId} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stat("Pending leave", typeof userId === "number" ? String(pendingLeave) : "—")}
        {stat("Attendance %", attRate !== null ? `${attRate}%` : "—")}
        {stat("Latest net pay", latestPay ? String(Math.round(latestPay.netSalary)) : "—")}
        {stat("Active announcements", String(announcementsCount))}
      </div>

      {polQ.data && polQ.data.length > 0 && (
        <div className="bg-[#13151e] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <span>📅</span> Leave Policy Advance Notice &amp; Quotas
            </h2>
            <Link
              href="/dashboard/employee/leave"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Apply now &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {polQ.data.map((p) => (
              <div
                key={p.id ?? p.leaveType}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/90">{p.leaveType}</span>
                  <span className="text-xs font-semibold text-indigo-300">{p.totalDaysPerYear} days / yr</span>
                </div>
                <div className="text-[11px] text-white/50 space-y-1 pt-1 border-t border-white/[0.06]">
                  {p.applyBeforeDays != null && p.applyBeforeDays > 0 ? (
                    <p className="text-amber-300/90 font-medium flex items-center gap-1">
                      <span>⏰</span> Apply &ge; {p.applyBeforeDays} day(s) before
                    </p>
                  ) : (
                    <p className="text-white/40">No advance notice limit</p>
                  )}
                  {p.requiresOneYear && (
                    <p className="text-sky-300/80">Requires 1 year of service</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Shortcuts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex gap-4 rounded-2xl border border-white/[0.06] bg-[#13151e] p-5 transition-colors hover:border-indigo-500/30 hover:bg-[#16181f]"
            >
              <span className="text-2xl" aria-hidden>
                {item.emoji}
              </span>
              <div>
                <p className="font-semibold text-white/90 group-hover:text-indigo-300 transition-colors">
                  {item.label}
                </p>
                <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
