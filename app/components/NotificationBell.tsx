// app/components/NotificationBell.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { notificationApi } from "@/services/notificationApi";
import { Toast } from "@/app/components/Toast";  // ✅ Import Toast
import { NotificationDTO } from "@/app/types/notification";

// Bell Icon
const BellIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

export default function NotificationBell() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousUnreadCount = useRef(0);

  // Removed isAdminOrSuperAdmin since employees also receive notifications

  // Show toast notification
  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const [notifs, count] = await Promise.all([
        notificationApi.getNotifications(),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(notifs.slice(0, 5));
      
      // ✅ Show toast for new notifications
      if (count.count > previousUnreadCount.current) {
        const newCount = count.count - previousUnreadCount.current;
        const newNotifications = notifs.filter(n => n.status === "UNREAD").slice(0, newCount);
        
        for (const notif of newNotifications) {
          showToast(notif.message, "info");
        }
      }
      
      setUnreadCount(count.count);
      previousUnreadCount.current = count.count;
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Could not load notifications");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only unread count
  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const count = await notificationApi.getUnreadCount();
      
      // ✅ Show toast when new notification arrives during polling
      if (count.count > previousUnreadCount.current) {
        const newCount = count.count - previousUnreadCount.current;
        showToast(`You have ${newCount} new notification${newCount > 1 ? 's' : ''}`, "info");
        
        // Refresh full notifications to show the new ones
        const notifs = await notificationApi.getNotifications();
        setNotifications(notifs.slice(0, 5));
      }
      
      setUnreadCount(count.count);
      previousUnreadCount.current = count.count;
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, status: "READ" } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      previousUnreadCount.current = Math.max(0, previousUnreadCount.current - 1);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      showToast("Failed to mark notification as read", "error");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: "READ" }))
      );
      setUnreadCount(0);
      previousUnreadCount.current = 0;
      showToast("All notifications marked as read", "success");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      showToast("Failed to mark all as read", "error");
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
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
      case "RESIGNATION":
        return "📄";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":
        return "bg-blue-500/15 text-blue-400 border-blue-500/20";
      case "LEAVE_APPROVED":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
      case "LEAVE_REJECTED":
        return "bg-rose-500/15 text-rose-400 border-rose-500/20";
      case "PAYROLL":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/20";
      case "RESIGNATION":
        return "bg-amber-500/15 text-amber-400 border-amber-500/20";
      default:
        return "bg-gray-500/15 text-gray-400 border-gray-500/20";
    }
  };

  // Don't show notification bell if not logged in
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="relative" ref={dropdownRef}>
        {/* Bell Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) fetchNotifications();
          }}
          className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
          aria-label="Notifications"
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md shadow-indigo-600/40">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-[#1a1d28] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/90">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-white/40 text-sm">
                  Loading...
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-rose-400 text-sm">
                  {error}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/40 text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 flex gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                      notif.status === "UNREAD" ? "bg-indigo-500/5" : "opacity-60"
                    }`}
                    onClick={() => handleMarkAsRead(notif.id)}
                  >
                    <div className={`w-8 h-8 rounded-xl ${getNotificationColor(notif.type)} flex items-center justify-center text-lg shrink-0`}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/75 text-xs leading-relaxed break-words">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/30 text-[11px]">{notif.timeAgo}</span>
                        {notif.createdByName && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-white/30 text-[11px]">by {notif.createdByName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {notif.status === "UNREAD" && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
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
    </>
  );
}