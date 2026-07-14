"use client";
import { Toast } from "@/app/components/Toast";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { announcementApi, AnnouncementDTO } from "@/services/announcementApi";

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ title: "", content: "", active: true });

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const isAdminOrSuperAdmin = () => {
    const role = user?.role?.toUpperCase();
    return role === "ADMIN" || role === "SUPERADMIN";
  };

  // Auto hide toast

  const fetchAnnouncements = async (pageIndex = page) => {
    setLoading(true);
    try {
      if (isAdminOrSuperAdmin()) {
        const pageData = await announcementApi.getPaginated(pageIndex, pageSize, "id", "desc");
        setAnnouncements(pageData.content);
        setTotalElements(pageData.totalElements);
        setTotalPages(Math.max(1, pageData.totalPages));
        setPage(pageIndex);
      } else {
        const data = await announcementApi.getActive();
        setAnnouncements(data);
        setTotalElements(data.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      setToast({ message: "Failed to load announcements", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [page, pageSize]);

  const resetForm = () => {
    setForm({ title: "", content: "", active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (announcement: AnnouncementDTO) => {
    setForm({
      title: announcement.title,
      content: announcement.content,
      active: announcement.active,
    });
    setEditingId(announcement.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setToast({ message: "Title and content are required", type: "error" });
      return;
    }

    setActionLoading(true);
    try {
      if (editingId) {
        const updated = await announcementApi.update(editingId, form);
        setAnnouncements(prev =>
          prev.map(a => (a.id === editingId ? updated : a))
        );
        if (form.active) await announcementApi.notifyEmployees(updated.id);
        setToast({ message: "✅ Announcement updated!", type: "success" });
      } else {
        const created = await announcementApi.create(form);
        fetchAnnouncements(0);
        if (form.active) await announcementApi.notifyEmployees(created.id);
        setToast({ message: "✅ Announcement created!", type: "success" });
      }
      resetForm();
    } catch (error: any) {
      setToast({ message: error.message || "Failed to save announcement", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(true);
    try {
      await announcementApi.delete(id);
      fetchAnnouncements(page);
      setToast({ message: "🗑️ Announcement deleted!", type: "success" });
      setDeleteConfirmId(null);
    } catch (error: any) {
      setToast({ message: error.message || "Failed to delete", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
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

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d28] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white/90 font-semibold text-lg mb-2">Delete Announcement?</h3>
            <p className="text-white/40 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/25 text-sm font-medium hover:bg-rose-500/30 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white/90">Announcements</h1>
            <p className="text-white/40 text-sm mt-1">
              {isAdminOrSuperAdmin()
                ? "Manage and publish company announcements"
                : "Stay updated with company news"}
            </p>
          </div>
          {isAdminOrSuperAdmin() && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
            >
              <span className="text-lg">+</span>
              New Announcement
            </button>
          )}
        </div>

        {/* Create / Edit Form */}
        {showForm && isAdminOrSuperAdmin() && (
          <div className="bg-[#13151e] border border-white/[0.08] rounded-2xl p-6 mb-6">
            <h2 className="text-white/90 font-semibold mb-4">
              {editingId ? "Edit Announcement" : "New Announcement"}
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter announcement title..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Content *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter announcement content..."
                  rows={4}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.active ? "bg-indigo-500" : "bg-white/10"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    form.active ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
                <span className="text-white/50 text-sm">
                  {form.active ? "Active — visible to all users" : "Inactive — hidden from users"}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  className="px-6 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : editingId ? "Update" : "Publish"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 rounded-xl bg-white/5 text-white/40 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcements List */}
        {loading ? (
          <div className="text-center py-16 text-white/40">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📢</div>
            <p className="text-white/40">No announcements yet</p>
            {isAdminOrSuperAdmin() && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
              >
                Create the first one
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(announcement => (
              <div
                key={announcement.id}
                className={`bg-[#13151e] border rounded-2xl p-5 transition-all ${
                  announcement.active
                    ? "border-white/[0.08]"
                    : "border-white/[0.04] opacity-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">

                    {/* Title + Badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-white/90 font-semibold">{announcement.title}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        announcement.active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-gray-500/15 text-gray-400"
                      }`}>
                        {announcement.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">
                      {announcement.content}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {announcement.createdBy && (
                        <span className="text-white/30 text-xs">
                          By {announcement.createdBy}
                        </span>
                      )}
                      {announcement.createdAt && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-white/30 text-xs">
                            {formatDate(announcement.createdAt)}
                          </span>
                        </>
                      )}
                      {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-white/30 text-xs">
                            Updated {formatDate(announcement.updatedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdminOrSuperAdmin() && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 border border-white/[0.06] transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(announcement.id)}
                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.06] transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer (Admin only) */}
        {isAdminOrSuperAdmin() && announcements.length > 0 && (
          <div className="px-5 py-4 mt-4 bg-[#13151e] border border-white/[0.08] rounded-2xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-white/40 animate-[scaleIn_0.2s_ease]">
            <div>
              Showing <span className="text-white/70">{announcements.length}</span> page rows ·{" "}
              <span className="text-white/70">{totalElements}</span> total
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <label className="flex items-center gap-1.5">
                <span>Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="rounded-lg border border-white/[0.08] bg-[#1a1d2e] px-2 py-1 text-xs text-white/90 focus:outline-none cursor-pointer"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n} className="bg-[#1a1d2e] text-white">
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="flex items-center px-1 text-white/60">
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/70 font-medium hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}