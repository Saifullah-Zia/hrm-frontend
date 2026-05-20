import apiClient from "@/lib/apiClient";
import {
  DocumentDtoRequest,
  DocumentDtoResponse,
  DocumentDtoUpdateRequest,
  DocumentType,
} from "@/app/types/document";

function getUserRole(): string {
  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
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

function getUserId(): number | null {
  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.id || null;
  } catch {
    return null;
  }
}

function isAdmin(): boolean {
  const role = getUserRole();
  return role === "ADMIN" || role === "SUPERADMIN";
}

export const documentApi = {

  getAll: async (): Promise<DocumentDtoResponse[]> => {
    if (isAdmin()) {
      const res = await apiClient.get<DocumentDtoResponse[]>("/api/documents/all");
      return Array.isArray(res.data) ? res.data : [];
    } else {
      const userId = getUserId();
      if (!userId) return [];
      const res = await apiClient.get<DocumentDtoResponse[]>(
        `/api/documents/employee/${userId}`
      );
      return Array.isArray(res.data) ? res.data : [];
    }
  },

  getByEmployee: async (employeeId: number): Promise<DocumentDtoResponse[]> => {
    const res = await apiClient.get<DocumentDtoResponse[]>(
      `/api/documents/employee/${employeeId}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  getByType: async (employeeId: number, type: DocumentType): Promise<DocumentDtoResponse[]> => {
    const res = await apiClient.get<DocumentDtoResponse[]>(
      `/api/documents/employee/${employeeId}/type/${type}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  getById: async (id: number): Promise<DocumentDtoResponse> => {
    const res = await apiClient.get<DocumentDtoResponse>(`/api/documents/${id}`);
    return res.data;
  },

  searchDocuments: async (keyword: string): Promise<DocumentDtoResponse[]> => {
    const trimmed = keyword.trim();
    if (!trimmed || trimmed === "%") return [];
    const res = await apiClient.get<DocumentDtoResponse[]>("/api/documents/search", {
      params: { keyword: trimmed },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  getExpiringSoon: async (days = 30): Promise<DocumentDtoResponse[]> => {
    const res = await apiClient.get<DocumentDtoResponse[]>("/api/documents/expiring", {
      params: { days },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  uploadDocument: async (
    request: DocumentDtoRequest,
    file: File,
    uploadedByUserId: number
  ): Promise<DocumentDtoResponse> => {
    const formData = new FormData();
    formData.append("data", new Blob([JSON.stringify(request)], { type: "application/json" }));
    formData.append("file", file);
    const res = await apiClient.post<DocumentDtoResponse>(
      `/api/documents/upload?uploadedBy=${uploadedByUserId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  downloadDocument: async (id: number, filename: string): Promise<void> => {
    const res = await apiClient.get(`/api/documents/${id}/download`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  updateDocument: async (id: number, request: DocumentDtoUpdateRequest): Promise<DocumentDtoResponse> => {
    const res = await apiClient.put<DocumentDtoResponse>(`/api/documents/${id}`, request);
    return res.data;
  },

  deleteDocument: async (id: number): Promise<string> => {
    const res = await apiClient.delete(`/api/documents/${id}`);
    return res.data;
  },
};
