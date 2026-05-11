"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { notificationApi } from "@/services/notificationApi";
import { NotificationDTO } from "@/services/notification";

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

  // Check if user is Admin or SuperAdmin
  const isAdminOrSuperAdmin = () => {
    const role = user?.role?.toUpperCase();
    return role === "ADMIN" || role === "SUPERADMIN" || role === "SUPER_ADMIN";
  };

  // Fetch notifications (only for Admin/SuperAdmin)
  const fetchNotifications = async () => {
    if (!isAdminOrSuperAdmin()) return;
    
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        notificationApi.getNotifications(),
        notificationApi.getUnreadCount()
      ]);
      setNotifications(notifs.slice(0, 5)); // Show only latest 5 in dropdown
      setUnreadCount(count.count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only unread count
  const fetchUnreadCount = async () => {
    if (!isAdminOrSuperAdmin()) return;
    
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count.count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    if (isAdminOrSuperAdmin()) {
      fetchNotifications();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  // Close on outside click
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
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, status: "READ" } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: "READ" }))
      );
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
    switch (type) {
      case "LEAVE_REQUEST":
        return "📋";
      case "LEAVE_APPROVED":
        return "✅";
      case "LEAVE_REJECTED":
        return "❌";
      case "PAYROLL":
        return "💰";
      default:
        return "🔔";
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  // Don't show notification bell for non-admin users
  if (!isAdminOrSuperAdmin()) {
    return (
      <header className="flex items-center justify-between px-4 md:px-6 h-16 bg-[#13151e] border-b border-white/[0.06] flex-shrink-0">
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
              Good {getGreeting()}, <span className="text-indigo-400">{user?.username ?? "User"}</span>
            </p>
            <p className="text-white/30 text-xs">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
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
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
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
      </header>
    );
  }

  // Full navbar with notifications for Admin/SuperAdmin
  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-16 bg-[#13151e] border-b border-white/[0.06] flex-shrink-0">
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
            Good {getGreeting()}, <span className="text-indigo-400">{user?.username ?? "User"}</span>
          </p>
          <p className="text-white/30 text-xs">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
            className="relative p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1d28] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <p className="text-white/80 text-sm font-semibold">Notifications</p>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-8 text-center text-white/40 text-sm">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-white/40 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`px-4 py-3 flex gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${notif.status === "UNREAD" ? "" : "opacity-60"}`}
                      onClick={() => handleMarkAsRead(notif.id)}
                    >
                      <div className="text-lg">{getNotificationIcon(notif.type)}</div>
                      <div className="flex-1">
                        <p className="text-white/75 text-xs leading-relaxed">{notif.message}</p>
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
                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="px-4 py-3 border-t border-white/[0.06] text-center">
                <button 
                  onClick={handleViewAll}
                  className="text-indigo-400 text-xs font-medium hover:text-indigo-300 transition-colors"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
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
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
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
      </div>
    </header>
  );
}