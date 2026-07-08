"use client";

import { useEffect, useState } from "react";
import { noticeApi, NoticeDto } from "@/services/noticeApi";
import { employeeProfileApi, EmployeeProfileDto } from "@/services/employeeProfileApi";
import {
  FileText,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Bell,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function getUserRole(): string {
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    if (!token) return "";
    const payload = JSON.parse(atob(token.split(".")[1]));
    const raw: string =
      payload.role ||
      (Array.isArray(payload.roles) ? payload.roles[0] : "") ||
      (Array.isArray(payload.authorities) ? payload.authorities[0] : "") ||
      "";
    return raw.replace(/^ROLE_/, "").toUpperCase();
  } catch {
    return "";
  }
}

// ─── sub-components ──────────────────────────────────────────────────────────

const NoticeTypeBadge = ({ type }: { type: string }) => {
  const isTermination = type === "TERMINATION";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
        isTermination
          ? "bg-red-500/15 text-red-400 border-red-500/30"
          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
      }`}
    >
      {isTermination ? <XCircle size={12} /> : <AlertTriangle size={12} />}
      {type}
    </span>
  );
};

// ─── page ────────────────────────────────────────────────────────────────────

export default function NoticesPage() {
  const [notices, setNotices] = useState<NoticeDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfileDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [empLoading, setEmpLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    userId: "",
    noticeType: "WARNING" as "TERMINATION" | "WARNING",
    title: "",
    description: "",
    effectiveDate: "",
  });

  // Load employees
  useEffect(() => {
    setEmpLoading(true);
    employeeProfileApi
      .getAll()
      .then((data) => {
        setEmployees(data);
        setEmpLoading(false);
      })
      .catch(() => {
        setError("Failed to load employees");
        setEmpLoading(false);
      });
  }, []);

  // Load notices
  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = () => {
    setLoading(true);
    noticeApi
      .getAllNotices()
      .then((data) => {
        setNotices(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load notices");
        setLoading(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.title || !form.description) {
      setError("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      await noticeApi.sendNotice({
        userId: Number(form.userId),
        noticeType: form.noticeType,
        title: form.title,
        description: form.description,
        effectiveDate: form.effectiveDate || undefined,
      });
      setToast({ message: "Notice sent successfully!", type: "success" });
      setShowForm(false);
      setForm({
        userId: "",
        noticeType: "WARNING",
        title: "",
        description: "",
        effectiveDate: "",
      });
      loadNotices();
    } catch (err: any) {
      setError(err.message || "Failed to send notice");
      setToast({ message: "Failed to send notice", type: "error" });
    } finally {
      setSending(false);
    }
  };

  // Auto hide toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-[#070918] text-[#E2E4F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Employee Notices</h1>
            <p className="text-sm text-[#8B8FA8] mt-1">
              Send termination and warning notices to employees
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FC0175] hover:bg-[#d40068] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-[#FC0175]/20"
          >
            <Plus size={16} />
            {showForm ? "Cancel" : "Send Notice"}
          </button>
        </div>

        {toast && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Send Notice Form */}
        {showForm && (
          <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Send Notice</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Employee *</label>
                  <select
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    required
                    className="w-full bg-[#0F1120] border border-[#2A2D45] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-[#FC0175] transition-colors"
                  >
                    <option value="">Select employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.userId}>
                        {emp.firstName} {emp.lastName} (ID: {emp.userId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Notice Type *</label>
                  <select
                    value={form.noticeType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        noticeType: e.target.value as "TERMINATION" | "WARNING",
                      })
                    }
                    className="w-full bg-[#0F1120] border border-[#2A2D45] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-[#FC0175] transition-colors"
                  >
                    <option value="WARNING">Warning</option>
                    <option value="TERMINATION">Termination</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="Notice title..."
                    className="w-full bg-[#0F1120] border border-[#2A2D45] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-[#FC0175] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Effective Date</label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                    className="w-full bg-[#0F1120] border border-[#2A2D45] rounded-xl px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-[#FC0175] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="Enter notice description..."
                  className="w-full bg-[#0F1120] border border-[#2A2D45] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-[#FC0175] transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2 rounded-xl bg-[#FC0175] hover:bg-[#d40068] text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {sending && <Loader2 size={14} className="animate-spin" />}
                  Send Notice
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

        {/* Notices List */}
        <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-[#8B8FA8]">
              <Loader2 size={20} className="animate-spin text-[#FC0175]" />
              <span className="text-sm">Loading notices...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <AlertTriangle size={24} className="text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={loadNotices}
                className="mt-2 text-xs text-[#FC0175] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Bell size={32} className="text-[#2A2D45]" />
              <p className="text-sm text-[#8B8FA8]">No notices sent yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2D45]">
                    {["Employee", "Type", "Title", "Effective Date", "Sent By", "Sent At"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-medium text-[#8B8FA8] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {notices.map((notice) => (
                    <tr key={notice.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">
                            {notice.employeeName
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "NA"}
                          </div>
                          <div>
                            <p className="text-white/80 text-sm font-medium">{notice.employeeName || "—"}</p>
                            <p className="text-white/30 text-xs">ID: {notice.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <NoticeTypeBadge type={notice.noticeType} />
                      </td>
                      <td className="px-5 py-4 text-white/70 text-sm">{notice.title}</td>
                      <td className="px-5 py-4 text-white/60 text-sm">
                        {notice.effectiveDate
                          ? new Date(notice.effectiveDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-white/60 text-sm">{notice.createdByName || "—"}</td>
                      <td className="px-5 py-4 text-white/50 text-xs">
                        {notice.createdAt
                          ? new Date(notice.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
