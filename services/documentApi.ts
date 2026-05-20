import apiClient from "@/lib/apiClient";
import { DocumentDtoRequest, DocumentDtoResponse, DocumentDtoUpdateRequest, DocumentType } from "@/app/types/document";

export const documentApi = {
  uploadDocument: async (
    request: DocumentDtoRequest,
    file: File,
    uploadedByUserId: number
  ): Promise<DocumentDtoResponse> => {
    const formData = new FormData();
    
    // The backend expects a RequestPart "data" and "file".
    // We send data as a JSON Blob to simulate application/json part.
    formData.append("data", new Blob([JSON.stringify(request)], { type: "application/json" }));
    formData.append("file", file);

    const res = await apiClient.post<DocumentDtoResponse>(
      `/api/documents/upload?uploadedBy=${uploadedByUserId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  },

  getByEmployee: async (employeeId: number): Promise<DocumentDtoResponse[]> => {
    const res = await apiClient.get<DocumentDtoResponse[]>(
      `/api/documents/employee/${employeeId}`
    );
    return res.data;
  },

  getByType: async (employeeId: number, type: DocumentType): Promise<DocumentDtoResponse[]> => {
    const res = await apiClient.get<DocumentDtoResponse[]>(
      `/api/documents/employee/${employeeId}/type/${type}`
    );
    return res.data;
  },

  getById: async (id: number): Promise<DocumentDtoResponse> => {
    const res = await apiClient.get<DocumentDtoResponse>(`/api/documents/${id}`);
    return res.data;
  },

  // Returns a Blob URL for downloading or viewing
  downloadDocument: async (id: number, filename: string): Promise<void> => {
    const res = await apiClient.get(`/api/documents/${id}/download`, {
      responseType: "blob",
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  updateDocument: async (
    id: number,
    request: DocumentDtoUpdateRequest
  ): Promise<DocumentDtoResponse> => {
    const res = await apiClient.put<DocumentDtoResponse>(`/api/documents/${id}`, request);
    return res.data;
  },

  deleteDocument: async (id: number): Promise<string> => {
    const res = await apiClient.delete(`/api/documents/${id}`);
    return res.data;
  },

  searchDocuments: async (keyword: string): Promise<DocumentDtoResponse[]> => {
    const res = await apiClient.get<DocumentDtoResponse[]>(
      `/api/documents/search?keyword=${encodeURIComponent(keyword)}`
    );
    return res.data;
  },

  getExpiringSoon: async (days: number = 30): Promise<DocumentDtoResponse[]> => {
    const res = await apiClient.get<DocumentDtoResponse[]>(
      `/api/documents/expiring?days=${days}`
    );
    return res.data;
  },
};
