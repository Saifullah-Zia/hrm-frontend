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

export interface AnnouncementDTO {
  id: number;
  title: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const announcementApi = {
  getAll: (): Promise<AnnouncementDTO[]> =>
    apiFetch<AnnouncementDTO[]>("/api/announcements"),

  getActive: (): Promise<AnnouncementDTO[]> =>
    apiFetch<AnnouncementDTO[]>("/api/announcements/active"),

  create: (data: Partial<AnnouncementDTO>): Promise<AnnouncementDTO> =>
    apiFetch<AnnouncementDTO>("/api/announcements", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<AnnouncementDTO>): Promise<AnnouncementDTO> =>
    apiFetch<AnnouncementDTO>(`/api/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<void> =>
    apiFetch<void>(`/api/announcements/${id}`, { method: "DELETE" }),

  /**
   * Ask the backend to create in-app notifications for all employees (Spring:
   * e.g. `POST /api/announcements/{id}/notify`). Safe to call if the endpoint
   * is missing — create may already fan out notifications on the server.
   */
  notifyEmployees: async (id: number): Promise<void> => {
    try {
      await apiFetch<void>(`/api/announcements/${id}/notify`, { method: "POST" });
    } catch {
      // Optional endpoint; employee bell still uses announcement alerts as fallback.
    }
  },
};