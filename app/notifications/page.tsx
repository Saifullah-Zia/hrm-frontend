"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notificationApi } from "@/services/notificationApi";
import { leaveApi } from "@/services/leaveApi";
import { NotificationDTO } from "@/app/types/notification";  // ✅ fixed import path

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Auto hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, status: "READ" } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, status: "READ" })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleApprove = async (e: React.MouseEvent, notif: NotificationDTO) => {
    e.stopPropagation(); // ✅ prevent parent click
    console.log("🟢 Approve clicked:", notif);

    if (!notif.referenceId) {
      console.error("❌ No referenceId found!");
      setToast({ message: "No leave ID found on this notification", type: "error" });
      return;
    }

    setActionLoading(notif.id);
    try {
      console.log("📡 Calling approve for leaveId:", notif.referenceId);
      await leaveApi.approveLeave(notif.referenceId);
      console.log("✅ Approve success!");
      await notificationApi.markAsRead(notif.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notif.id
            ? { ...n, status: "READ", type: "LEAVE_APPROVED" }
            : n
        )
      );
      setToast({ message: "✅ Leave approved successfully!", type: "success" });
    } catch (error: any) {
      console.error("❌ Approve failed:", error);
      setToast({ message: error.message || "Failed to approve leave", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (e: React.MouseEvent, notif: NotificationDTO) => {
    e.stopPropagation(); // ✅ prevent parent click
    console.log("🔴 Reject clicked:", notif);

    if (!notif.referenceId) {
      console.error("❌ No referenceId found!");
      setToast({ message: "No leave ID found on this notification", type: "error" });
      return;
    }

    setActionLoading(notif.id);
    try {
      console.log("📡 Calling reject for leaveId:", notif.referenceId);
      await leaveApi.rejectLeave(notif.referenceId);
      console.log("✅ Reject success!");
      await notificationApi.markAsRead(notif.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notif.id
            ? { ...n, status: "READ", type: "LEAVE_REJECTED" }
            : n
        )
      );
      setToast({ message: "❌ Leave rejected successfully!", type: "success" });
    } catch (error: any) {
      console.error("❌ Reject failed:", error);
      setToast({ message: error.message || "Failed to reject leave", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // ✅ prevent parent click
    await handleMarkAsRead(id);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":  return "📋";
      case "LEAVE_APPROVED": return "✅";
      case "LEAVE_REJECTED": return "❌";
      case "PAYROLL":        return "💰";
      default:               return "🔔";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":  return "bg-blue-500/15 text-blue-400";
      case "LEAVE_APPROVED": return "bg-emerald-500/15 text-emerald-400";
      case "LEAVE_REJECTED": return "bg-rose-500/15 text-rose-400";
      case "PAYROLL":        return "bg-indigo-500/15 text-indigo-400";
      default:               return "bg-gray-500/15 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === "success"
            ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/20 border border-rose-500/30 text-rose-400"
        }`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm">Back</span>
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Mark all as read
          </button>
        </div>

        <h1 className="text-xl font-semibold text-white/90 mb-6">All Notifications</h1>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-white/40">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-white/40">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-[#13151e] border rounded-xl p-4 transition-all ${
                  notif.status === "UNREAD"
                    ? "border-indigo-500/30 bg-indigo-500/5"
                    : "border-white/[0.08] opacity-70"
                }`}
                // ✅ No onClick on parent div anymore
              >
                <div className="flex items-start gap-4">

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${getTypeColor(notif.type)} flex items-center justify-center text-xl shrink-0`}>
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-white/90">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/30">{notif.timeAgo}</span>
                      {notif.createdByName && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-xs text-white/30">by {notif.createdByName}</span>
                        </>
                      )}
                    </div>

                    {/* Approve / Reject buttons - only for LEAVE_REQUEST + UNREAD */}
                    {notif.type === "LEAVE_REQUEST" && notif.status === "UNREAD" && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => handleApprove(e, notif)}
                          disabled={actionLoading === notif.id}
                          className="px-4 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === notif.id ? "Processing..." : "✅ Approve"}
                        </button>
                        <button
                          onClick={(e) => handleReject(e, notif)}
                          disabled={actionLoading === notif.id}
                          className="px-4 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-medium hover:bg-rose-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === notif.id ? "Processing..." : "❌ Reject"}
                        </button>
                        <button
                          onClick={(e) => handleDismiss(e, notif.id)}
                          disabled={actionLoading === notif.id}
                          className="px-4 py-1.5 rounded-lg bg-white/5 text-white/40 border border-white/10 text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Show status badge for already actioned notifications */}
                    {notif.type === "LEAVE_APPROVED" && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs">
                        Approved
                      </span>
                    )}
                    {notif.type === "LEAVE_REJECTED" && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 text-xs">
                        Rejected
                      </span>
                    )}
                  </div>

                  {/* Unread dot */}
                  {notif.status === "UNREAD" && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-3 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}