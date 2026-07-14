"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { notificationApi } from "@/services/notificationApi";
import { announcementApi } from "@/services/announcementApi";
import { leaveApi } from "@/services/leaveApi";
import { probationApi } from "@/services/probationApi";
import { NotificationDTO } from "@/app/types/notification";
import { useAuthStore } from "@/store/authStore";
import {
  isAnnouncementNotificationType,
  isSyntheticAnnouncementNotification,
  markAnnouncementsSeen,
  mergeWithAnnouncementAlerts,
} from "@/lib/announcementAlerts";
import {
  FileText,
  CheckCircle2,
  XCircle,
  DollarSign,
  Megaphone,
  Award,
  Bell,
  ArrowLeft,
  CheckCheck,
  Check,
  X,
  EyeOff,
} from "lucide-react";
import { Toast } from "@/app/components/Toast";

const PAYSLIPS_HREF = "/dashboard/employee/payslips";

function isPayrollNotification(type: string) {
  const t = (type ?? "").toUpperCase();
  return t === "PAYROLL" || t.includes("PAYROLL");
}

function isProbationType(type: string) {
  return (type ?? "").toUpperCase().includes("PROBATION");
}

/** Admin alert when an employee's probation period has ended (not the employee "congratulations" message). */
function isProbationHrReviewNotification(notif: NotificationDTO) {
  if (!isProbationType(notif.type)) return false;
  const m = (notif.message ?? "").toLowerCase();
  if (m.includes("congratulations")) return false;
  return m.includes("review") || m.includes("probation period completed") || m.includes("employment");
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

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

  const isEmployee = user?.role?.toUpperCase() === "EMPLOYEE";

  const fetchNotifications = async () => {
    try {
      const [data, activeAnnouncements] = await Promise.all([
        notificationApi.getNotifications(),
        isEmployee ? announcementApi.getActive().catch(() => []) : Promise.resolve([]),
      ]);
      setNotifications(
        isEmployee ? mergeWithAnnouncementAlerts(data, activeAnnouncements) : data
      );
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      const notif = notifications.find((n) => n.id === id);
      if (isSyntheticAnnouncementNotification(id) && notif) {
        markAnnouncementsSeen([notif.referenceId]);
      } else {
        await notificationApi.markAsRead(id);
      }
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, status: "READ" } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const syntheticIds = notifications
        .filter((n) => n.status === "UNREAD" && isSyntheticAnnouncementNotification(n.id))
        .map((n) => n.referenceId);
      if (syntheticIds.length > 0) markAnnouncementsSeen(syntheticIds);

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

  const handleConfirmProbation = async (e: React.MouseEvent, notif: NotificationDTO) => {
    e.stopPropagation();
    if (!notif.referenceId) {
      setToast({ message: "No employee reference on this notification", type: "error" });
      return;
    }
    setActionLoading(notif.id);
    try {
      const adminId = typeof user?.userId === "number" ? user.userId : undefined;
      const msg = await probationApi.confirmProbation(notif.referenceId, adminId);
      await notificationApi.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, status: "READ" } : n))
      );
      setToast({ message: msg || "Probation confirmed.", type: "success" });
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: unknown } };
      const body = err.response?.data;
      const text =
        typeof body === "string" ? body : body && typeof body === "object" && "message" in (body as object)
          ? String((body as { message?: string }).message)
          : err.message;
      setToast({ message: text || "Failed to confirm probation", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const getTypeIcon = (type: string) => {
    if (isPayrollNotification(type)) return <DollarSign className="w-5 h-5" />;
    if (isAnnouncementNotificationType(type)) return <Megaphone className="w-5 h-5" />;
    if (isProbationType(type)) return <Award className="w-5 h-5" />;
    switch (type) {
      case "LEAVE_REQUEST":  return <FileText className="w-5 h-5" />;
      case "LEAVE_APPROVED": return <CheckCircle2 className="w-5 h-5" />;
      case "LEAVE_REJECTED": return <XCircle className="w-5 h-5" />;
      default:               return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    if (isPayrollNotification(type)) return "bg-indigo-500/15 text-indigo-400";
    if (isProbationType(type)) return "bg-violet-500/15 text-violet-300";
    switch (type) {
      case "LEAVE_REQUEST":  return "bg-blue-500/15 text-blue-400";
      case "LEAVE_APPROVED": return "bg-emerald-500/15 text-emerald-400";
      case "LEAVE_REJECTED": return "bg-rose-500/15 text-rose-400";
      default:               return "bg-gray-500/15 text-gray-400";
    }
  };

  const isHr = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const handleViewPayslips = async (e: React.MouseEvent, notif: NotificationDTO) => {
    e.stopPropagation();
    if (notif.status === "UNREAD") {
      try {
        await notificationApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, status: "READ" } : n))
        );
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }
    router.push(PAYSLIPS_HREF);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        </div>

        {/* Title with glowing unread badge */}
        {(() => {
          const unreadCount = notifications.filter(n => n.status === "UNREAD").length;
          return (
            <div className="flex items-baseline gap-3 mb-6">
              <h1 className="text-xl font-semibold text-white/90">All Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.15)] animate-pulse">
                  {unreadCount} new
                </span>
              )}
            </div>
          );
        })()}

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-white/40 font-medium">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 border border-white/[0.04] bg-[#13151e]/30 rounded-2xl">
            <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm font-medium">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.slice(0, visibleCount).map((notif) => (
              <div
                key={notif.id}
                className={`group/card relative overflow-hidden backdrop-blur-md border rounded-2xl p-5 pl-6 transition-all duration-300 ${
                  notif.status === "UNREAD"
                    ? "border-indigo-500/20 bg-indigo-500/5 shadow-lg shadow-indigo-500/5 hover:border-indigo-500/35"
                    : "border-white/[0.05] bg-[#13151e]/40 hover:bg-[#13151e]/65 opacity-80"
                }`}
              >
                {/* Indigo left border highlight for unread */}
                {notif.status === "UNREAD" && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                )}
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
                      <div className="flex flex-wrap gap-2 mt-3.5">
                        <button
                          onClick={(e) => handleApprove(e, notif)}
                          disabled={actionLoading === notif.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {actionLoading === notif.id ? "Processing..." : "Approve"}
                        </button>
                        <button
                          onClick={(e) => handleReject(e, notif)}
                          disabled={actionLoading === notif.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-3.5 h-3.5" />
                          {actionLoading === notif.id ? "Processing..." : "Reject"}
                        </button>
                        <button
                          onClick={(e) => handleDismiss(e, notif.id)}
                          disabled={actionLoading === notif.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Show status badge for already actioned notifications */}
                    {notif.type === "LEAVE_APPROVED" && (
                      <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    )}
                    {notif.type === "LEAVE_REJECTED" && (
                      <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/15 text-xs font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}

                    {/* Payroll — matches PayRollService notifications (type PAYROLL, referenceId = payroll id) */}
                    {isEmployee && isPayrollNotification(notif.type) && (
                      <div className="flex flex-wrap gap-2 mt-3.5">
                        <button
                          type="button"
                          onClick={(e) => handleViewPayslips(e, notif)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          View payslips
                        </button>
                        {notif.status === "UNREAD" && (
                          <button
                            type="button"
                            onClick={(e) => handleDismiss(e, notif.id)}
                            disabled={actionLoading === notif.id}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}

                    {/* Probation — HR review (referenceId = employee user id) */}
                    {isHr && isProbationHrReviewNotification(notif) && notif.status === "UNREAD" && (
                      <div className="flex flex-wrap gap-2 mt-3.5">
                        <button
                          type="button"
                          onClick={(e) => handleConfirmProbation(e, notif)}
                          disabled={actionLoading === notif.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {actionLoading === notif.id ? "Processing…" : "Confirm permanent"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(e, notif.id)}
                          disabled={actionLoading === notif.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Probation — employee congratulations (read-only + dismiss) */}
                    {isEmployee && isProbationType(notif.type) && notif.message?.toLowerCase().includes("congratulations") && (
                      <div className="flex flex-wrap gap-2 mt-3.5">
                        {notif.status === "UNREAD" && (
                          <button
                            type="button"
                            onClick={(e) => handleDismiss(e, notif.id)}
                            disabled={actionLoading === notif.id}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Unread dot */}
                  {notif.status === "UNREAD" && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-3 shrink-0" />
                  )}
                </div>
              </div>
            ))}

            {/* Read More button */}
            {notifications.length > visibleCount && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="px-6 py-2.5 rounded-xl bg-[#13151e] hover:bg-white/[0.04] text-white/80 hover:text-white text-xs font-semibold border border-white/[0.08] transition-all duration-200 cursor-pointer shadow-md"
                >
                  Read More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}