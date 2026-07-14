"use client";
import { Toast } from "@/app/components/Toast";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  return new Date(dt).toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function EmployeeCorrectionRequestsPage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    requestedCheckIn: "",
    requestedCheckOut: "",
    reason: "",
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const myRequestsQuery = useQuery({
    queryKey: ["employee-correction-requests", userId],
    queryFn: () => attendanceCorrectionApi.getByUserId(userId!),
    enabled: !!userId,
  });

  const submitMutation = useMutation({
    mutationFn: (dto: AttendanceCorrectionRequestDTO) => attendanceCorrectionApi.submit(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-correction-requests", userId] });
      setToast({ message: "Correction request submitted successfully.", type: "success" });
      setShowForm(false);
      setForm({
        date: new Date().toISOString().split("T")[0],
        requestedCheckIn: "",
        requestedCheckOut: "",
        reason: "",
      });
    },
    onError: (err: Error) => {
      setToast({ message: err.message || "Failed to submit request.", type: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.date || !form.reason) {
      setToast({ message: "Date and reason are required.", type: "error" });
      return;
    }
    submitMutation.mutate({
      userId,
      date: form.date,
      requestedCheckIn: form.requestedCheckIn ? `${form.date}T${form.requestedCheckIn}:00` : null,
      requestedCheckOut: form.requestedCheckOut ? `${form.date}T${form.requestedCheckOut}:00` : null,
      reason: form.reason,
    });
  };

  const myRequests = myRequestsQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90 tracking-tight">Attendance Correction Requests</h1>
          <p className="text-white/40 text-sm mt-1">Submit requests to correct your attendance records.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
        >
          <span className="text-lg">{showForm ? "×" : "+"}</span>
          {showForm ? "Cancel" : "New Request"}
        </button>
      </div>

      {showForm && (
        <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl p-6">
          <h2 className="text-white/90 font-semibold mb-4">Submit Correction Request</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Requested Check In Time</label>
                <input
                  type="time"
                  value={form.requestedCheckIn}
                  onChange={(e) => setForm({ ...form, requestedCheckIn: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Requested Check Out Time</label>
                <input
                  type="time"
                  value={form.requestedCheckOut}
                  onChange={(e) => setForm({ ...form, requestedCheckOut: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Reason *</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Explain why you need a correction..."
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="px-6 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Request"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-xl bg-white/5 text-white/40 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {myRequestsQuery.isLoading ? (
        <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
      ) : myRequestsQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          Could not load your correction requests. Please contact support.
        </div>
      ) : myRequests.length === 0 ? (
        <div className="text-center py-20 bg-[#13151e] border border-white/[0.06] rounded-2xl">
          <div className="text-5xl mb-4">⏰</div>
          <p className="text-white/40 text-sm">No correction requests found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#13151e]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Req. Check In</th>
                  <th className="px-5 py-3.5 font-medium">Req. Check Out</th>
                  <th className="px-5 py-3.5 font-medium">Reason</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {myRequests.map((row: AttendanceCorrectionRequestDTO) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-white/80 font-medium">{fmtDate(row.date)}</td>
                    <td className="px-5 py-4 text-white/60">{row.requestedCheckIn ? formatTime(row.requestedCheckIn) : "—"}</td>
                    <td className="px-5 py-4 text-white/60">{row.requestedCheckOut ? formatTime(row.requestedCheckOut) : "—"}</td>
                    <td className="px-5 py-4 text-white/50 max-w-[200px] truncate" title={row.reason}>{row.reason}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${STATUS_STYLES[row.status || ""] || "bg-gray-500/15 text-gray-400"}`}>
                        {row.status}
                      </span>
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
