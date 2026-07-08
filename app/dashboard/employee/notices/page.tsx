"use client";

import { useEffect, useState } from "react";
import { noticeApi, NoticeDto } from "@/services/noticeApi";
import {
  Bell,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function getCurrentUserId(): number | null {
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Adjust these keys if your JWT payload uses a different claim name
    // for the numeric user id (e.g. "id", "sub", "uid").
    const raw = payload.userId ?? payload.id ?? payload.uid ?? payload.sub;
    const id = Number(raw);
    return Number.isNaN(id) ? null : id;
  } catch {
    return null;
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

export default function MyNoticesPage() {
  const [notices, setNotices] = useState<NoticeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setError("Could not determine your user account. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    noticeApi
      .getNoticesByUserId(userId)
      .then((data) => {
        setNotices(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load your notices");
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#070918] text-[#E2E4F0]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Notices</h1>
          <p className="text-sm text-[#8B8FA8] mt-1">
            Warnings and termination notices sent to you by HR
          </p>
        </div>

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
            </div>
          ) : notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Bell size={32} className="text-[#2A2D45]" />
              <p className="text-sm text-[#8B8FA8]">You have no notices</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {notices.map((notice) => (
                <div key={notice.id} className="px-5 py-5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <NoticeTypeBadge type={notice.noticeType} />
                        <p className="text-white/90 text-sm font-semibold truncate">
                          {notice.title}
                        </p>
                      </div>
                      <p className="text-white/60 text-sm whitespace-pre-wrap">
                        {notice.description}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-white/40">
                        {notice.effectiveDate && (
                          <span>
                            Effective:{" "}
                            {new Date(notice.effectiveDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        {notice.createdByName && (
                          <span>From: {notice.createdByName}</span>
                        )}
                        {notice.createdAt && (
                          <span>
                            Sent:{" "}
                            {new Date(notice.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
