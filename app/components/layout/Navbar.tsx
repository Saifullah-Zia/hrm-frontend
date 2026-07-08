"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { notificationApi } from "@/services/notificationApi";
import { announcementApi } from "@/services/announcementApi";
import { NotificationDTO } from "@/app/types/notification";
import {
  countUnreadIncludingAnnouncements,
  isAnnouncementNotificationType,
  isSyntheticAnnouncementNotification,
  markAnnouncementsSeen,
  mergeWithAnnouncementAlerts,
} from "@/lib/announcementAlerts";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  };

  const isEmployee = () => user?.role?.toUpperCase() === "EMPLOYEE";

  const isPayrollNotification = (type: string) => {
    const t = (type ?? "").toUpperCase();
    return t === "PAYROLL" || t.includes("PAYROLL");
  };

  // Matches the "NOTICE_RECEIVED" type created by NoticeService.java when an
  // employee is issued a warning/termination notice.
  const isNoticeNotification = (type: string) => {
    const t = (type ?? "").toUpperCase();
    return t === "NOTICE_RECEIVED" || t.includes("NOTICE");
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [notifs, count, activeAnnouncements] = await Promise.all([
        notificationApi.getNotifications(),
        notificationApi.getUnreadCount(),
        isEmployee() ? announcementApi.getActive().catch(() => []) : Promise.resolve([]),
      ]);
      const merged = mergeWithAnnouncementAlerts(notifs, activeAnnouncements);
      setNotifications(merged.slice(0, 8));
      setUnreadCount(
        countUnreadIncludingAnnouncements(count.count, notifs, activeAnnouncements)
      );
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const [count, notifs, activeAnnouncements] = await Promise.all([
        notificationApi.getUnreadCount(),
        notificationApi.getNotifications().catch(() => [] as NotificationDTO[]),
        isEmployee() ? announcementApi.getActive().catch(() => []) : Promise.resolve([]),
      ]);
      setUnreadCount(
        countUnreadIncludingAnnouncements(count.count, notifs, activeAnnouncements)
      );
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  // ✅ FIX 2: Re-fetch full notifications every time the dropdown opens
  const handleToggleNotif = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setDropdownOpen(false);
    if (opening) {
      fetchNotifications();
    }
  };

  // Initial unread count + poll every 30s (all roles — employees see e.g. new payroll)
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const handleMarkAsRead = async (notificationId: number) => {
    const notif = notifications.find((n) => n.id === notificationId);
    if (!notif || notif.status !== "UNREAD") return;

    try {
      if (isSyntheticAnnouncementNotification(notificationId)) {
        markAnnouncementsSeen([notif.referenceId]);
      } else {
        await notificationApi.markAsRead(notificationId);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, status: "READ" } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  /** Mark read when needed, then deep-link employees to the right page for the notification type. */
  const handleNotificationRowClick = async (notif: NotificationDTO) => {
    if (notif.status === "UNREAD") {
      await handleMarkAsRead(notif.id);
    }
    if (isEmployee() && isPayrollNotification(notif.type)) {
      setNotifOpen(false);
      router.push("/dashboard/employee/payslips");
      return;
    }
    if (isEmployee() && isNoticeNotification(notif.type)) {
      setNotifOpen(false);
      router.push("/dashboard/employee/notices");
      return;
    }
    if (isEmployee() && isAnnouncementNotificationType(notif.type)) {
      setNotifOpen(false);
      router.push("/dashboard/employee/announcements");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const syntheticIds = notifications
        .filter((n) => n.status === "UNREAD" && isSyntheticAnnouncementNotification(n.id))
        .map((n) => n.referenceId);
      if (syntheticIds.length > 0) markAnnouncementsSeen(syntheticIds);

      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleViewAll = () => {
    setNotifOpen(false);
    router.push("/notifications");
  };

  const getNotificationIcon = (type: string) => {
    const t = (type ?? "").toUpperCase();
    if (t.includes("PAYROLL")) return "💰";
    if (t.includes("ANNOUNCEMENT")) return "📣";
    if (t.includes("NOTICE")) return "⚠️";
    switch (type) {
      case "LEAVE_REQUEST":  return "📋";
      case "LEAVE_APPROVED": return "✅";
      case "LEAVE_REJECTED": return "❌";
      case "PAYROLL":        return "💰";
      case "NOTICE_RECEIVED": return "⚠️";
      default:               return "🔔";
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  // ── Shared: left greeting section ─────────────────────────────────────────
  const LeftSection = () => (
    <div className="flex items-center gap-3">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden sm:block">
        <p className="text-white/80 text-sm font-semibold">
          Good {getGreeting()},{" "}
          <span className="text-indigo-400">{user?.username ?? "User"}</span>
        </p>
        <p className="text-white/30 text-xs">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );

  // ── Shared: user avatar dropdown ───────────────────────────────────────────
  const UserMenu = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-300 text-xs font-bold">
            {user?.username?.[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
        <span className="text-white/70 text-sm font-medium hidden sm:block max-w-[100px] truncate">
          {user?.username ?? "User"}
        </span>
        <svg className="w-3.5 h-3.5 text-white/30 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1d28] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-white/80 text-sm font-medium truncate">{user?.username}</p>
            <p className="text-white/35 text-xs truncate">{user?.email}</p>
            <p className="text-indigo-400 text-xs mt-1 capitalize">{user?.role}</p>
          </div>
          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-16 bg-[#13151e] border-b border-white/[0.06] flex-shrink-0">
      <LeftSection />

      <div className="flex items-center gap-2">

        {/* Sleek Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="relative flex items-center justify-between w-14 h-8 rounded-full p-1 bg-white/[0.05] border border-white/[0.08] cursor-pointer transition-all duration-300 hover:bg-white/[0.08] mr-1"
          aria-label="Toggle theme"
        >
          {/* Sliding indicator */}
          <div
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-indigo-600 shadow-md shadow-indigo-600/40 transform transition-transform duration-300 flex items-center justify-center ${
              theme === "light" ? "translate-x-6 bg-indigo-500" : "translate-x-0"
            }`}
          >
            {/* Micro animated inner dot or indicator */}
            <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
          </div>

          {/* Moon Icon */}
          <span className="z-10 flex items-center justify-center pl-0.5">
            <svg className={`w-3.5 h-3.5 transition-all duration-300 ${theme === "dark" ? "text-indigo-300 opacity-100 scale-100" : "text-slate-400 opacity-40 scale-75"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </span>

          {/* Sun Icon */}
          <span className="z-10 flex items-center justify-center pr-0.5">
            <svg className={`w-3.5 h-3.5 transition-all duration-300 ${theme === "light" ? "text-amber-500 opacity-100 scale-100 rotate-45" : "text-slate-500 opacity-40 scale-75"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
        </button>

        {/* Notifications (all roles — employees get payroll, notices, leave, etc.) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleToggleNotif}
            className="relative p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>

            {/* Red badge — only visible when unread > 0 */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md shadow-indigo-600/40">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* ── Dropdown ────────────────────────────────────────────────── */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1d28] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">

              {/* Dropdown header */}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-white/80 text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
                {loading ? (
                  // Skeleton loader
                  <div className="p-3 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-xl bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 bg-white/10 rounded-md w-full" />
                          <div className="h-2 bg-white/5 rounded-md w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-2xl mb-2">🔔</p>
                    <p className="text-white/40 text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => void handleNotificationRowClick(notif)}
                      className={`px-4 py-3 flex gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                        notif.status === "UNREAD" ? "bg-indigo-500/[0.04]" : "opacity-60"
                      }`}
                    >
                      <div className="text-lg shrink-0">{getNotificationIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-relaxed ${
                          notif.status === "UNREAD" ? "text-white/80 font-medium" : "text-white/50"
                        }`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-white/30 text-[11px]">{notif.timeAgo}</p>
                          {notif.createdByName && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <p className="text-white/30 text-[11px]">by {notif.createdByName}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {notif.status === "UNREAD" && (
                        <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown footer */}
              <div className="px-4 py-3 border-t border-white/[0.06] text-center">
                <button
                  onClick={handleViewAll}
                  className="text-indigo-400 text-xs font-medium hover:text-indigo-300 transition-colors"
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
