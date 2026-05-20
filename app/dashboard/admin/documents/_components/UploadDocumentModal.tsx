"use client";

import { useState } from "react";
import { documentApi } from "@/services/documentApi";
import { DocumentDtoRequest, DocumentType } from "@/app/types/document";
import { EmployeeProfileDto } from "@/services/employeeProfileApi";
import { useAuthStore } from "@/store/authStore";
import { X, Loader2, UploadCloud, FileText } from "lucide-react";

export default function UploadDocumentModal({
  employees,
  onClose,
  onSuccess,
}: {
  employees: EmployeeProfileDto[];
  onClose: () => void;
  onSuccess: (uploadedForEmpId?: number) => void;
}) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<DocumentDtoRequest>>({
    documentType: DocumentType.OTHER,
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.title || !form.documentType || !file) {
      setError("Please fill in all required fields and select a file.");
      return;
    }
    
    if (!user?.userId) {
      setError("Authentication error. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const request: DocumentDtoRequest = {
        employeeId: Number(form.employeeId),
        title: form.title,
        documentType: form.documentType as DocumentType,
        description: form.description,
        expiryDate: form.expiryDate || undefined,
      };

      await documentApi.uploadDocument(request, file, user.userId);
      onSuccess(Number(form.employeeId));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2D45]">
          <div>
            <h2 className="text-lg font-semibold text-[#E2E4F0]">Upload Document</h2>
            <p className="text-xs text-[#8B8FA8] mt-0.5">Add a new document to an employee's profile</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1E2140] text-[#8B8FA8] hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Employee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8B8FA8]">Employee *</label>
            <select
              required
              value={form.employeeId || ""}
              onChange={(e) => setForm({ ...form, employeeId: Number(e.target.value) })}
              className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
            >
              <option value="">Select an employee...</option>
              {employees.map((emp) => {
                const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || `Employee #${emp.id}`;
                return (
                  <option key={emp.id} value={emp.id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Title & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B8FA8]">Document Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Identity Card"
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] placeholder-[#3D4065] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B8FA8]">Type *</label>
              <select
                required
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value as DocumentType })}
                className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
              >
                {Object.values(DocumentType).map((type) => (
                  <option key={type} value={type}>{type.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiry Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8B8FA8]">Expiry Date (Optional)</label>
            <input
              type="datetime-local"
              value={form.expiryDate || ""}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8B8FA8]">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Any additional notes..."
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] placeholder-[#3D4065] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all resize-none"
            />
          </div>

          {/* File Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8B8FA8]">File *</label>
            <div className="border-2 border-dashed border-[#2A2D45] hover:border-[#FC0175]/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all relative">
              <input
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <>
                  <FileText className="text-[#FC0175] mb-1" size={24} />
                  <p className="text-sm font-medium text-[#E2E4F0]">{file.name}</p>
                  <p className="text-xs text-[#8B8FA8]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <UploadCloud className="text-[#8B8FA8] mb-1" size={24} />
                  <p className="text-sm font-medium text-[#E2E4F0]">Click to upload or drag & drop</p>
                  <p className="text-xs text-[#8B8FA8]">PDF, JPG, PNG or DOCX</p>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#2A2D45]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-[#2A2D45] text-[#8B8FA8] hover:text-white hover:border-[#FC0175] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-[#FC0175] hover:bg-[#d40068] text-white font-medium transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Upload Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
