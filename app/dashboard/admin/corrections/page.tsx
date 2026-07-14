"use client";
import { Toast } from "@/app/components/Toast";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { attendanceCorrectionApi, AttendanceCorrectionRequestDTO } from "@/services/attendanceCorrectionApi";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  REJECTED: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dt: string) => {
  if (!dt) return "—";
  return new Date(dt + "+05:00").toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function AdminCorrectionsPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const pendingQuery = useQuery({
    queryKey: ["admin-pending-corrections"],
    queryFn: () => attendanceCorrectionApi.getPending(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => attendanceCorrectionApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending-corrections"] });
      setToast({ message: "Correction request approved and attendance log updated.", type: "success" });
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Failed to approve request.", type: "error" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => attendanceCorrectionApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending-corrections"] });
      setToast({ message: "Correction request rejected.", type: "success" });
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Failed to reject request.", type: "error" });
    },
  });

  const pendingRequests = pendingQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">Attendance Correction Requests</h1>
        <p className="text-white/40 text-sm mt-1">Review and approve correction logs submitted by employees.</p>
      </div>

      {pendingQuery.isLoading ? (
        <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
      ) : pendingQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          Could not load pending corrections. Please contact support.
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="text-center py-20 bg-[#13151e] border border-white/[0.06] rounded-2xl">
          <div className="text-5xl mb-4">⏰</div>
          <p className="text-white/40 text-sm">No pending attendance correction requests found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#13151e]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-medium">Employee</th>
                  <th className="px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Req. Check in</th>
                  <th className="px-5 py-3.5 font-medium">Req. Check out</th>
                  <th className="px-5 py-3.5 font-medium">Reason</th>
                  <th className="px-5 py-3.5 font-medium w-48 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pendingRequests.map((row: AttendanceCorrectionRequestDTO) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-white/80 text-sm font-medium">{row.userName}</p>
                        <p className="text-white/30 text-xs">ID: {row.userId}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white/80 font-medium">{fmtDate(row.date)}</td>
                    <td className="px-5 py-4 text-white/60">{row.requestedCheckIn ? formatTime(row.requestedCheckIn) : "—"}</td>
                    <td className="px-5 py-4 text-white/60">{row.requestedCheckOut ? formatTime(row.requestedCheckOut) : "—"}</td>
                    <td className="px-5 py-4 text-white/50 max-w-[200px] truncate" title={row.reason}>{row.reason}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => approveMutation.mutate(row.id!)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(row.id!)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 text-xs font-medium hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
