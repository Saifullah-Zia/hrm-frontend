const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("hrm-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
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
};