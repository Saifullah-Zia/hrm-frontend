const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("hrm-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const t = parsed?.state?.token ?? null;
      if (t) return t;
    }
    return localStorage.getItem("token");
  } catch {
    return localStorage.getItem("token");
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res.text() as Promise<T>;
}

export interface MemberDTO {
  id: number;
  email: string;
  fullName: string;
  role: string;
  presenceStatus?: string;
}

export interface ChatMessageDTO {
  id: string;
  conversationId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  type: "TEXT" | "FILE" | "IMAGE";
  fileUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  type: "PRIVATE" | "GROUP";
  name?: string;
  avatarUrl?: string;
  members: MemberDTO[];
  lastMessage?: ChatMessageDTO;
  unreadCount?: number;
  createdAt: string;
}

export interface EmployeeSearchDTO {
  id: number;
  fullName: string;
  email: string;
  presenceStatus?: string;
}

export interface ChatPageResponse {
  content: ChatMessageDTO[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

export const chatApi = {
  startPrivateChat: (targetEmployeeId: number): Promise<ConversationDTO> =>
    apiFetch<ConversationDTO>(`/api/chat/private?targetEmployeeId=${targetEmployeeId}`, {
      method: "POST",
    }),

  createGroupChat: (name: string, memberIds: number[]): Promise<ConversationDTO> =>
    apiFetch<ConversationDTO>("/api/chat/group", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    }),

  addMember: (conversationId: string, employeeId: number): Promise<void> =>
    apiFetch<void>(`/api/chat/group/${conversationId}/members?employeeId=${employeeId}`, {
      method: "POST",
    }),

  removeMember: (conversationId: string, employeeId: number): Promise<void> =>
    apiFetch<void>(`/api/chat/group/${conversationId}/members/${employeeId}`, {
      method: "DELETE",
    }),

  getMyConversations: (): Promise<ConversationDTO[]> =>
    apiFetch<ConversationDTO[]>("/api/chat/conversations"),

  getMessages: (conversationId: string, page = 0, size = 30): Promise<ChatPageResponse> =>
    apiFetch<ChatPageResponse>(
      `/api/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`
    ),

  searchEmployees: (query: string): Promise<EmployeeSearchDTO[]> =>
    apiFetch<EmployeeSearchDTO[]>(`/api/chat/employees/search?query=${encodeURIComponent(query)}`),

  uploadChatFile: async (
    conversationId: string,
    file: File
  ): Promise<{ fileUrl: string; fileName: string; messageId: string; type: string }> => {
    const token = getToken();
    console.log("[uploadChatFile] uploading file - conversationId: " + conversationId + ", fileName: " + file.name + ", tokenPresent: " + (token ? "YES" : "NO"));
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/api/chat/upload/${conversationId}`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[uploadChatFile] upload failed - status: " + res.status + " (" + res.statusText + "), errorBody: " + errorText);
      throw new Error(errorText || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
