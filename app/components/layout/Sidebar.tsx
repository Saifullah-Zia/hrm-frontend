"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { BRAND_FULL_NAME, BRAND_LOGO_PATH } from "@/lib/branding";
import { chatApi } from "@/services/chatApi";
import { leaveApi } from "@/services/leaveApi";
import { attendanceCorrectionApi } from "@/services/attendanceCorrectionApi";
import { probationApi } from "@/services/probationApi";
import { noticeApi } from "@/services/noticeApi";

// ── Icons (inline SVG to avoid extra dependencies) ──────────
const Icon = ({ d }: { d: string }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  currency: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  notice: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  chevronDown: "M19 9l-7 7-7-7",
  chevronRight: "M9 5l7 7-7 7",
};

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
};

export type NavGroup = {
  groupLabel: string;
  icon: string;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "groupLabel" in entry && Array.isArray((entry as NavGroup).children);
}

// ── Nav config per role ──────────────────────────────────────
const NAV_ITEMS: Record<string, NavEntry[]> = {
  SUPERADMIN: [
    { label: "Dashboard", href: "/dashboard/superadmin", icon: "home", exact: true },
    { label: "Team Chat", href: "/dashboard/chat", icon: "chat" },
    {
      groupLabel: "People",
      icon: "users",
      children: [
        { label: "User Management", href: "/dashboard/superadmin/users", icon: "users" },
        { label: "Department", href: "/dashboard/superadmin/departments", icon: "building" },
        { label: "Position Management", href: "/dashboard/superadmin/positions", icon: "briefcase" },
        { label: "Probation", href: "/dashboard/superadmin/probation", icon: "calendar" },
      ],
    },
    {
      groupLabel: "Leave",
      icon: "calendar",
      children: [
        { label: "Leave Approvals", href: "/dashboard/superadmin/leaves", icon: "calendar" },
        { label: "Leave policies", href: "/dashboard/superadmin/leave-policy", icon: "calendar" },
        { label: "Leave balances", href: "/dashboard/superadmin/leave-balances", icon: "chart" },
      ],
    },
    { label: "Payroll & Reports", href: "/dashboard/superadmin/payroll", icon: "currency" },
    {
      groupLabel: "Attendance",
      icon: "clock",
      children: [
        { label: "Attendance Overview", href: "/dashboard/superadmin/attendance", icon: "clock" },
        { label: "Corrections Review", href: "/dashboard/admin/corrections", icon: "clock" },
        { label: "Office hours", href: "/dashboard/admin/office-hours", icon: "clock" },
        { label: "Holiday Management", href: "/dashboard/admin/holidays", icon: "calendar" },
      ],
    },
    {
      groupLabel: "Communication",
      icon: "bell",
      children: [
        { label: "Announcements", href: "/dashboard/superadmin/announcements", icon: "bell" },
        { label: "Notices", href: "/dashboard/superadmin/notices", icon: "notice" },
        { label: "Document Hub", href: "/dashboard/superadmin/documents", icon: "document" },
      ],
    },
    { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: "clipboard" },
    { label: "Settings", href: "/dashboard/settings", icon: "cog" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin", icon: "home", exact: true },
    { label: "Team Chat", href: "/dashboard/chat", icon: "chat" },
    {
      groupLabel: "People",
      icon: "users",
      children: [
        { label: "Employee Profiles", href: "/dashboard/admin/employee-profiles", icon: "users" },
        { label: "Probation", href: "/dashboard/admin/probation", icon: "calendar" },
        { label: "Resignations", href: "/dashboard/admin/resignations", icon: "document" },
        { label: "Department View", href: "/dashboard/admin/departments", icon: "building" },
      ],
    },
    {
      groupLabel: "Leave",
      icon: "calendar",
      children: [
        { label: "Leave Approvals", href: "/dashboard/admin/leaves", icon: "calendar" },
        { label: "Leave balances", href: "/dashboard/admin/leave-balances", icon: "chart" },
      ],
    },
    { label: "Payroll Processing", href: "/dashboard/admin/payroll", icon: "currency" },
    {
      groupLabel: "Attendance",
      icon: "clock",
      children: [
        { label: "Attendance Tracking", href: "/dashboard/admin/attendance", icon: "clock" },
        { label: "Corrections Review", href: "/dashboard/admin/corrections", icon: "clock" },
        { label: "Office hours", href: "/dashboard/admin/office-hours", icon: "clock" },
        { label: "Holiday Management", href: "/dashboard/admin/holidays", icon: "calendar" },
      ],
    },
    {
      groupLabel: "Communication",
      icon: "bell",
      children: [
        { label: "Announcements", href: "/dashboard/admin/announcements", icon: "bell" },
        { label: "Notices", href: "/dashboard/admin/notices", icon: "notice" },
        { label: "Document Hub", href: "/dashboard/admin/documents", icon: "document" },
      ],
    },
    { label: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: "clipboard" },
    { label: "Settings", href: "/dashboard/settings", icon: "cog" },
  ],
  EMPLOYEE: [
    { label: "Dashboard", href: "/dashboard/employee", icon: "home", exact: true },
    { label: "Team Chat", href: "/dashboard/chat", icon: "chat" },
    { label: "My Profile", href: "/dashboard/employee/profile", icon: "user" },
    { label: "Apply for Leave", href: "/dashboard/employee/leave", icon: "calendar" },
    { label: "My Resignation", href: "/dashboard/employee/resignation", icon: "document" },
    { label: "My Attendance", href: "/dashboard/employee/attendance", icon: "clock" },
    { label: "My Payslips", href: "/dashboard/employee/payslips", icon: "document" },
    { label: "My Documents", href: "/dashboard/employee/documents", icon: "document" },
    { label: "Announcements", href: "/dashboard/employee/announcements", icon: "bell" },
    { label: "My Notices", href: "/dashboard/employee/notices", icon: "notice" },
    { label: "Settings", href: "/dashboard/settings", icon: "cog" },
  ],
};

const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Admin",
  EMPLOYEE: "Employee",
};

const ROLE_COLORS = {
  SUPERADMIN: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",
  ADMIN: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  EMPLOYEE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

// ── Component ────────────────────────────────────────────────
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingCorrectionCount, setPendingCorrectionCount] = useState(0);
  const [probationPendingCount, setProbationPendingCount] = useState(0);
  const [employeeNoticeCount, setEmployeeNoticeCount] = useState(0);

  // Group expansion state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Initialize and auto-expand active group based on current pathname
  useEffect(() => {
    const role = user?.role ?? "EMPLOYEE";
    const entries = NAV_ITEMS[role] ?? NAV_ITEMS.EMPLOYEE;

    setOpenGroups((prev) => {
      const next = { ...prev };
      entries.forEach((entry) => {
        if (isGroup(entry)) {
          const hasActiveChild = entry.children.some((child) =>
            child.exact
              ? pathname === child.href
              : pathname === child.href || pathname.startsWith(child.href + "/")
          );
          if (hasActiveChild) {
            next[entry.groupLabel] = true;
          }
        }
      });
      return next;
    });
  }, [pathname, user]);

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  // ── Chat unread count ────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setUnreadChatCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const conversations = await chatApi.getMyConversations();
        const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unreadCount ?? 0), 0);
        setUnreadChatCount(totalUnread);
      } catch (err) {
        console.error("Failed to fetch unread chat count:", err);
      }
    };

    fetchUnreadCount();

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail !== undefined) {
        setUnreadChatCount(customEvent.detail);
      }
    };

    window.addEventListener("unread-chat-count-changed", handleCustomEvent);
    const interval = setInterval(fetchUnreadCount, 8000);

    return () => {
      window.removeEventListener("unread-chat-count-changed", handleCustomEvent);
      clearInterval(interval);
    };
  }, [user, pathname]);

  // ── Pending leave, correction & probation counts ──────────────────
  useEffect(() => {
    if (!user) {
      setPendingLeaveCount(0);
      setPendingCorrectionCount(0);
      setProbationPendingCount(0);
      return;
    }
    const r = user.role;
    if (r !== "SUPERADMIN" && r !== "ADMIN") return;

    const fetchPendingCounts = async () => {
      try {
        const [leaves, corrections, probation] = await Promise.all([
          leaveApi.getByStatus("PENDING"),
          attendanceCorrectionApi.getPending(),
          probationApi.getPendingConfirmation(),
        ]);
        setPendingLeaveCount(Array.isArray(leaves) ? leaves.length : 0);
        setPendingCorrectionCount(Array.isArray(corrections) ? corrections.length : 0);
        setProbationPendingCount(Array.isArray(probation) ? probation.length : 0);
      } catch {
        // Silently ignore
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Notice count (EMPLOYEE only) ──────────────────────────────
  useEffect(() => {
    if (!user || user.role !== "EMPLOYEE") {
      setEmployeeNoticeCount(0);
      return;
    }
    const userId = user.userId;
    if (typeof userId !== "number") return;

    const fetchNoticeCount = async () => {
      try {
        const notices = await noticeApi.getNoticesByUserId(userId);
        setEmployeeNoticeCount(Array.isArray(notices) ? notices.length : 0);
      } catch {
        // Silently ignore
      }
    };

    fetchNoticeCount();
    const interval = setInterval(fetchNoticeCount, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  const role = user?.role ?? "EMPLOYEE";
  const navItems = NAV_ITEMS[role] ?? NAV_ITEMS.EMPLOYEE;
  const roleLabel = ROLE_LABELS[role] ?? "User";
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.EMPLOYEE;

  // Helper to resolve badge count for a specific item label
  const getItemBadge = (label: string) => {
    if (label === "Team Chat" && unreadChatCount > 0) return { count: unreadChatCount, color: "bg-rose-500" };
    if (label === "Leave Approvals" && pendingLeaveCount > 0) return { count: pendingLeaveCount, color: "bg-amber-500" };
    if (label === "Corrections Review" && pendingCorrectionCount > 0) return { count: pendingCorrectionCount, color: "bg-amber-500" };
    if (label === "Probation" && probationPendingCount > 0) return { count: probationPendingCount, color: "bg-amber-500" };
    if (label === "My Notices" && employeeNoticeCount > 0) return { count: employeeNoticeCount, color: "bg-rose-500" };
    return null;
  };

  // Helper to resolve aggregated badge count for a group when collapsed
  const getGroupBadge = (group: NavGroup) => {
    let total = 0;
    let color = "bg-amber-500";
    group.children.forEach((child) => {
      const b = getItemBadge(child.label);
      if (b) {
        total += b.count;
        if (b.color === "bg-rose-500") color = "bg-rose-500";
      }
    });
    return total > 0 ? { count: total, color } : null;
  };

  const renderSingleItem = (item: NavItem, isChild = false) => {
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

    const badge = getItemBadge(item.label);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`
          flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium
          transition-all duration-150 group
          ${isChild ? "pl-9 pr-3 text-xs text-white/60 hover:text-white/90" : "px-3 text-white/50 hover:text-white/90"}
          ${isActive
            ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/25 font-semibold"
            : "hover:bg-white/[0.05] border border-transparent"
          }
        `}
      >
        <span className={`flex-shrink-0 transition-colors ${isActive ? "text-indigo-400" : "text-white/30 group-hover:text-white/60"}`}>
          <Icon d={ICONS[item.icon as keyof typeof ICONS]} />
        </span>
        <span className="truncate">{item.label}</span>

        {badge ? (
          <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full ${badge.color} px-1.5 text-[10px] font-extrabold text-white shadow-lg ring-2 ring-white/10 transition-all duration-300`}>
            {badge.count}
          </span>
        ) : (
          isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
          )
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 flex flex-col w-64
        bg-[#13151e] border-r border-white/[0.06]
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-black ring-1 ring-white/10 flex-shrink-0 shadow-lg shadow-black/40">
          <Image
            src={BRAND_LOGO_PATH}
            alt={BRAND_FULL_NAME}
            width={36}
            height={36}
            className="object-contain p-0.5"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">{BRAND_FULL_NAME}</p>
          <p className="text-white/40 text-xs truncate">JCAT Solutions</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-300 text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white/90 text-sm font-medium truncate">
              {user?.username ?? "User"}
            </p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-0.5 ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Navigation
        </p>

        {navItems.map((entry, index) => {
          if (!isGroup(entry)) {
            return renderSingleItem(entry);
          }

          const group = entry;
          const isOpenGroup = !!openGroups[group.groupLabel];
          const hasActiveChild = group.children.some((child) =>
            child.exact
              ? pathname === child.href
              : pathname === child.href || pathname.startsWith(child.href + "/")
          );
          const groupBadge = !isOpenGroup ? getGroupBadge(group) : null;

          return (
            <div key={group.groupLabel || index} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.groupLabel)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group text-left
                  ${hasActiveChild
                    ? "text-indigo-300 bg-indigo-500/10 font-semibold"
                    : "text-white/60 hover:text-white/90 hover:bg-white/[0.05]"
                  }
                `}
              >
                <span className={`flex-shrink-0 transition-colors ${hasActiveChild ? "text-indigo-400" : "text-white/40 group-hover:text-white/70"}`}>
                  <Icon d={ICONS[group.icon as keyof typeof ICONS]} />
                </span>
                <span className="truncate flex-1">{group.groupLabel}</span>

                {groupBadge && (
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full ${groupBadge.color} px-1.5 text-[10px] font-extrabold text-white shadow-lg ring-2 ring-white/10 transition-all duration-300`}>
                    {groupBadge.count}
                  </span>
                )}

                <span className="text-white/30 group-hover:text-white/60 transition-transform duration-200">
                  <Icon d={ICONS[isOpenGroup ? "chevronDown" : "chevronRight"]} />
                </span>
              </button>

              {isOpenGroup && (
                <div className="space-y-0.5 transition-all duration-200">
                  {group.children.map((child) => renderSingleItem(child, true))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-all duration-150"
        >
          <Icon d={ICONS.logout} />
          Sign out
        </button>
      </div>
    </aside>
  );
}