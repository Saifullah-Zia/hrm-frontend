"use client";

import { useCallback, useEffect, useState } from "react";
import { documentApi } from "@/services/documentApi";
import { DocumentDtoResponse, DocumentType, DocumentStatus } from "@/app/types/document";
import { employeeProfileApi, EmployeeProfileDto } from "@/services/employeeProfileApi";
import {
  FileText,
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
} from "lucide-react";
import UploadDocumentModal from "./_components/UploadDocumentModal";
import EditDocumentModal from "./_components/EditDocumentModal";

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

function isAdmin(): boolean {
  const role = getUserRole();
  return role === "ADMIN" || role === "SUPERADMIN";
}

// ─── sub-components ──────────────────────────────────────────────────────────

const TypeBadge = ({ type }: { type: DocumentType }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1E2140] text-[#E2E4F0] border border-[#2A2D45]">
    {type.replace(/_/g, " ")}
  </span>
);

const StatusBadge = ({
  status,
  isExpired,
}: {
  status: DocumentStatus;
  isExpired: boolean;
}) => {
  if (status === DocumentStatus.DELETED)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-red-500/15 text-red-400 border-red-500/30">
        <XCircle size={12} /> Deleted
      </span>
    );
  if (isExpired || status === DocumentStatus.EXPIRED)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-400 border-amber-500/30">
        <AlertTriangle size={12} /> Expired
      </span>
    );
  if (status === DocumentStatus.ARCHIVED)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-[#1E2140] text-[#8B8FA8] border-[#2A2D45]">
        <Clock size={12} /> Archived
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
      <CheckCircle size={12} /> Active
    </span>
  );
};

// ─── page ────────────────────────────────────────────────────────────────────

export default function DocumentHubPage() {
  const [documents, setDocuments] = useState<DocumentDtoResponse[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfileDto[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [empLoading, setEmpLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "EXPIRING">("ALL");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editDocId, setEditDocId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const userIsAdmin = isAdmin();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!userIsAdmin) {
      setEmpLoading(false);
      return;
    }
    employeeProfileApi
      .getAll()
      .then(setEmployees)
      .catch(() => { })
      .finally(() => setEmpLoading(false));
  }, [userIsAdmin]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let docs: DocumentDtoResponse[] = [];

      if (activeTab === "EXPIRING") {
        if (userIsAdmin) {
          try {
            docs = await documentApi.getExpiringSoon(30);
          } catch {
            const allDocs = await documentApi.getAll();
            const now = new Date();
            const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            docs = allDocs.filter((d) => {
              if (!d.expiryDate) return false;
              const exp = new Date(d.expiryDate);
              return exp <= thirtyDays && exp >= now;
            });
          }
        } else {
          const allDocs = await documentApi.getAll();
          const now = new Date();
          const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          docs = allDocs.filter((d) => {
            if (!d.expiryDate) return false;
            const exp = new Date(d.expiryDate);
            return exp <= thirtyDays && exp >= now;
          });
        }
      } else if (debouncedSearch.trim().length >= 2) {
        // ✅ FIX: search branch — selectedEmployeeId is cleared when user types,
        // so this branch now always runs correctly when there is a search term.
        const q = debouncedSearch.trim().toLowerCase();
        const allDocs = await documentApi.getAll();
        docs = allDocs.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            (d.employeeName || "").toLowerCase().includes(q)
        );
      } else if (selectedEmployeeId !== "" && userIsAdmin) {
        docs = await documentApi.getByEmployee(Number(selectedEmployeeId));
      } else {
        docs = await documentApi.getAll();
      }

      setDocuments(docs);
    } catch (err: any) {
      console.error("[DocumentHub] loadDocuments error:", err);
      const status = err?.response?.status;
      if (status === 403) {
        setError("You don't have permission to view these documents.");
      } else if (status === 400) {
        setError("Invalid request. Please adjust your search or filters.");
      } else {
        setError(
          err?.response?.data?.message || "Failed to load documents. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, selectedEmployeeId, userIsAdmin]);

  useEffect(() => {
    if (!empLoading) loadDocuments();
  }, [loadDocuments, empLoading]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await documentApi.deleteDocument(deleteTarget);
      setDeleteTarget(null);
      loadDocuments();
    } catch {
      setError("Failed to delete document.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      await documentApi.downloadDocument(id, filename);
    } catch {
      alert("Failed to download document.");
    }
  };

  // ✅ FIX: Handler clears selectedEmployeeId so search branch runs correctly
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setSelectedEmployeeId(""); // clear employee filter when user types
  };

  // ✅ FIX: Handler clears search so employee filter branch runs correctly
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearch("");             // clear search when user picks an employee
    setDebouncedSearch("");    // also clear debounced so loadDocuments doesn't wait
    setSelectedEmployeeId(
      e.target.value === "" ? "" : Number(e.target.value)
    );
  };

  // Client-side filter when on EXPIRING tab with a search term
  const filteredDocs =
    activeTab === "EXPIRING" && search.trim()
      ? documents.filter((doc) => {
        const q = search.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          (doc.employeeName || "").toLowerCase().includes(q)
        );
      })
      : documents;

  const employeeName = (id: number | "") => {
    if (id === "") return null;
    const emp = employees.find((e) => e.id === Number(id));
    if (!emp) return null;
    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
    return name || `Employee #${id}`;
  };

  return (
    <div className="min-h-screen bg-[#070918] text-[#E2E4F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-[#FC0175]" /> Document Hub
            </h1>
            <p className="text-sm text-[#8B8FA8] mt-1">
              Manage, view, and organize all employee documents securely.
            </p>
          </div>
          {userIsAdmin && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FC0175] hover:bg-[#d40068] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-[#FC0175]/20"
            >
              <Plus size={16} /> Upload Document
            </button>
          )}
        </div>

        {/* Filters & Tabs */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Tabs */}
            <div className="flex bg-[#0D0F1E] p-1 rounded-xl border border-[#2A2D45]">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === "ALL"
                    ? "bg-[#2A2D45] text-white"
                    : "text-[#8B8FA8] hover:text-[#E2E4F0]"
                  }`}
              >
                All Documents
              </button>
              <button
                onClick={() => setActiveTab("EXPIRING")}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "EXPIRING"
                    ? "bg-[#2A2D45] text-white"
                    : "text-[#8B8FA8] hover:text-[#E2E4F0]"
                  }`}
              >
                <AlertTriangle
                  size={14}
                  className={activeTab === "EXPIRING" ? "text-amber-400" : ""}
                />
                Expiring Soon
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8FA8]"
              />
              <input
                type="text"
                placeholder={
                  userIsAdmin
                    ? "Search by title or employee..."
                    : "Search by title..."
                }
                value={search}
                onChange={handleSearchChange}
                className="w-full bg-[#0D0F1E] border border-[#2A2D45] rounded-xl pl-9 pr-4 py-2 text-sm text-[#E2E4F0] placeholder-[#3D4065] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/20 transition-all"
              />
              {search.trim().length === 1 && (
                <p className="absolute -bottom-5 left-1 text-[10px] text-[#8B8FA8]">
                  Type at least 2 characters to search
                </p>
              )}
            </div>
          </div>

          {/* Employee Filter — admin only, ALL tab only */}
          {activeTab === "ALL" && userIsAdmin && (
            <div className="flex items-center gap-3">
              <Users size={15} className="text-[#8B8FA8] flex-shrink-0" />
              <select
                value={selectedEmployeeId}
                onChange={handleEmployeeChange}
                className="bg-[#0D0F1E] border border-[#2A2D45] rounded-xl px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/20 transition-all"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => {
                  const name =
                    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                    `Employee #${emp.id}`;
                  return (
                    <option key={emp.id} value={emp.id}>
                      {name}
                    </option>
                  );
                })}
              </select>
              {selectedEmployeeId !== "" && (
                <button
                  onClick={() => setSelectedEmployeeId("")}
                  className="text-xs text-[#FC0175] hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#2A2D45] text-xs font-semibold text-[#8B8FA8] uppercase tracking-wider">
            <span>Title & File</span>
            <span>Employee</span>
            <span>Type</span>
            <span>Size</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {empLoading || loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-[#8B8FA8]">
              <Loader2 size={20} className="animate-spin text-[#FC0175]" />
              <span className="text-sm">Loading documents...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-400">
              <AlertTriangle size={24} />
              <p className="text-sm">{error}</p>
              <button
                onClick={loadDocuments}
                className="text-xs text-[#FC0175] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <FileText size={32} className="text-[#2A2D45]" />
              <p className="text-sm text-[#8B8FA8]">
                {selectedEmployeeId !== ""
                  ? `No documents for ${employeeName(selectedEmployeeId)}`
                  : search.trim()
                    ? "No documents match your search"
                    : "No documents found"}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc, i) => (
              <div
                key={doc.id}
                className={`grid grid-cols-[2.5fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[#111328] transition-colors ${i < filteredDocs.length - 1 ? "border-b border-[#1A1D35]" : ""
                  }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[#E2E4F0] truncate">
                    {doc.title}
                  </span>
                  <span className="text-xs text-[#8B8FA8] truncate">{doc.fileName}</span>
                </div>
                <div className="text-sm text-[#E2E4F0] truncate">
                  {doc.employeeName || "—"}
                </div>
                <div>
                  <TypeBadge type={doc.documentType} />
                </div>
                <div className="text-sm text-[#8B8FA8]">{doc.fileSizeFormatted}</div>
                <div>
                  <StatusBadge status={doc.status} isExpired={doc.isExpired} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDownload(doc.id, doc.fileName)}
                    title="Download"
                    className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-[#FC0175] hover:bg-[#FC0175]/10 transition-colors"
                  >
                    <Download size={16} />
                  </button>
                  {userIsAdmin && (
                    <>
                      <button
                        onClick={() => setEditDocId(doc.id)}
                        title="Edit Metadata"
                        className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(doc.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-[#8B8FA8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-center text-lg font-semibold text-[#E2E4F0] mb-1">
              Delete Document?
            </h3>
            <p className="text-center text-sm text-[#8B8FA8] mb-6">
              This action cannot be undone. The file will be soft deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-sm rounded-lg border border-[#2A2D45] text-[#8B8FA8] hover:text-white hover:border-[#FC0175] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal — admin only */}
      {isUploadOpen && userIsAdmin && (
        <UploadDocumentModal
          employees={employees}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={(uploadedForEmpId) => {
            setIsUploadOpen(false);
            if (uploadedForEmpId) setSelectedEmployeeId(uploadedForEmpId);
          }}
        />
      )}

      {/* Edit Modal — admin only */}
      {editDocId && userIsAdmin && (
        <EditDocumentModal
          documentId={editDocId}
          onClose={() => setEditDocId(null)}
          onSuccess={() => {
            setEditDocId(null);
            loadDocuments();
          }}
        />
      )}
    </div>
  );
}