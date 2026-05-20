"use client";

import { useEffect, useState } from "react";
import { documentApi } from "@/services/documentApi";
import { DocumentDtoUpdateRequest, DocumentType, DocumentStatus, DocumentDtoResponse } from "@/app/types/document";
import { X, Loader2 } from "lucide-react";

export default function EditDocumentModal({
  documentId,
  onClose,
  onSuccess,
}: {
  documentId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [doc, setDoc] = useState<DocumentDtoResponse | null>(null);
  const [form, setForm] = useState<DocumentDtoUpdateRequest>({});

  useEffect(() => {
    const loadDoc = async () => {
      setLoading(true);
      try {
        const data = await documentApi.getById(documentId);
        setDoc(data);
        setForm({
          title: data.title,
          documentType: data.documentType,
          description: data.description || "",
          expiryDate: data.expiryDate || "",
          status: data.status,
        });
      } catch (err) {
        setError("Failed to load document metadata.");
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [documentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Clean up empty expiry date string
      const requestPayload = { ...form };
      if (!requestPayload.expiryDate) {
        requestPayload.expiryDate = undefined;
      }
      
      await documentApi.updateDocument(documentId, requestPayload);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update document.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D0F1E] border border-[#2A2D45] rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2D45]">
          <div>
            <h2 className="text-lg font-semibold text-[#E2E4F0]">Edit Metadata</h2>
            <p className="text-xs text-[#8B8FA8] mt-0.5">Update document details</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#1E2140] text-[#8B8FA8] hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-[#8B8FA8]">
            <Loader2 className="animate-spin text-[#FC0175]" />
            <span className="text-sm">Loading details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B8FA8]">Document Title *</label>
              <input
                type="text"
                required
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#8B8FA8]">Type *</label>
                <select
                  required
                  value={form.documentType || ""}
                  onChange={(e) => setForm({ ...form, documentType: e.target.value as DocumentType })}
                  className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
                >
                  {Object.values(DocumentType).map((type) => (
                    <option key={type} value={type}>{type.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#8B8FA8]">Status *</label>
                <select
                  required
                  value={form.status || ""}
                  onChange={(e) => setForm({ ...form, status: e.target.value as DocumentStatus })}
                  className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
                >
                  {Object.values(DocumentStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B8FA8]">Expiry Date (Optional)</label>
              <input
                type="datetime-local"
                value={form.expiryDate || ""}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B8FA8]">Description (Optional)</label>
              <textarea
                rows={3}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-[#0F1120] border border-[#2A2D45] rounded-lg px-3 py-2 text-sm text-[#E2E4F0] placeholder-[#3D4065] focus:outline-none focus:border-[#FC0175] focus:ring-1 focus:ring-[#FC0175]/30 transition-all resize-none"
              />
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
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-[#FC0175] hover:bg-[#d40068] text-white font-medium transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
