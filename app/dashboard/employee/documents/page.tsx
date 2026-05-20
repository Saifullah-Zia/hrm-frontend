"use client";

import { useEffect, useState } from "react";
import { documentApi } from "@/services/documentApi";
import { DocumentDtoResponse, DocumentType, DocumentStatus } from "@/app/types/document";
import { employeeProfileApi } from "@/services/employeeProfileApi";
import { useAuthStore } from "@/store/authStore";
import {
  FileText,
  Search,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

const TypeBadge = ({ type }: { type: DocumentType }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1E2140] text-[#E2E4F0] border border-[#2A2D45]">
      {type.replace("_", " ")}
    </span>
  );
};

const StatusBadge = ({ status, isExpired }: { status: DocumentStatus; isExpired: boolean }) => {
  if (status === DocumentStatus.DELETED) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-red-500/15 text-red-400 border-red-500/30">
        <XCircle size={12} /> Deleted
      </span>
    );
  }
  if (isExpired || status === DocumentStatus.EXPIRED) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-400 border-amber-500/30">
        <AlertTriangle size={12} /> Expired
      </span>
    );
  }
  if (status === DocumentStatus.ARCHIVED) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-[#1E2140] text-[#8B8FA8] border-[#2A2D45]">
        <Clock size={12} /> Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
      <CheckCircle size={12} /> Active
    </span>
  );
};

export default function EmployeeDocumentsPage() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentDtoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [filteredDocs, setFilteredDocs] = useState<DocumentDtoResponse[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.userId) return;
      setLoading(true);
      setError(null);
      try {
        const profile = await employeeProfileApi.getForEmployeeAccount(user.userId);
        if (!profile || !profile.id) {
          setError("No employee profile linked to your account.");
          setLoading(false);
          return;
        }

        let docs: DocumentDtoResponse[] = [];

        // Strategy 1: try getByEmployee
        try {
          docs = await documentApi.getByEmployee(profile.id);
        } catch {
          // Strategy 2: getAll and filter client-side by employeeId or name
          try {
            const allDocs = await documentApi.getAll();
            const empName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim().toLowerCase();
            docs = allDocs.filter(d =>
              d.employeeId === profile.id ||
              (empName && (d.employeeName || "").toLowerCase().includes(empName))
            );
          } catch {
            docs = [];
          }
        }

        setDocuments(docs);
      } catch (err: any) {
        console.error("[MyDocuments]", err);
        setError(err.message || "Failed to load documents.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.userId]);

  useEffect(() => {
    let result = documents;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.fileName.toLowerCase().includes(q)
      );
    }
    setFilteredDocs(result);
  }, [documents, search]);

  const handleDownload = async (id: number, filename: string) => {
    try {
      await documentApi.downloadDocument(id, filename);
    } catch {
      alert("Failed to download document.");
    }
  };

  return (
    <div className="min-h-screen bg-[#070918] text-[#E2E4F0]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-[#FC0175]" /> My Documents
            </h1>
            <p className="text-sm text-[#8B8FA8] mt-1">
              View and download your official documents securely.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8FA8]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0D0F1E] border border-[#2A2D45] rounded-xl pl-9 pr-4 py-2 text-sm text-[#E2E4F0] placeholder-[#3D4065] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/20 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#2A2D45] text-xs font-semibold text-[#8B8FA8] uppercase tracking-wider">
            <span>Title & File</span>
            <span>Type</span>
            <span>Size</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-[#8B8FA8]">
              <Loader2 size={20} className="animate-spin text-[#FC0175]" />
              <span className="text-sm">Loading your documents...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-400">
              <AlertTriangle size={24} />
              <p className="text-sm">{error}</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <FileText size={32} className="text-[#2A2D45]" />
              <p className="text-sm text-[#8B8FA8]">No documents found</p>
            </div>
          ) : (
            filteredDocs.map((doc, i) => (
              <div
                key={doc.id}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[#111328] transition-colors ${
                  i < filteredDocs.length - 1 ? "border-b border-[#1A1D35]" : ""
                }`}
              >
                {/* Title & File */}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[#E2E4F0] truncate">{doc.title}</span>
                  <span className="text-xs text-[#8B8FA8] truncate">{doc.fileName}</span>
                </div>

                {/* Type */}
                <div><TypeBadge type={doc.documentType} /></div>

                {/* Size */}
                <div className="text-sm text-[#8B8FA8]">{doc.fileSizeFormatted}</div>

                {/* Status */}
                <div><StatusBadge status={doc.status} isExpired={doc.isExpired} /></div>

                {/* Actions */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => handleDownload(doc.id, doc.fileName)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#FC0175] bg-[#FC0175]/10 hover:bg-[#FC0175]/20 border border-[#FC0175]/20 transition-all"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
