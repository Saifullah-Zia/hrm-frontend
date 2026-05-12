// app/services/notificationApi.ts

import { NotificationDTO, UnreadCountResponse } from "@/app/types/notification";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ✅ Fixed: reads token from zustand persisted storage key "hrm-auth"
function getToken(): string | null {
  try {
    const raw = localStorage.getItem("hrm-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const t = parsed?.state?.token ?? null;
      if (t) return t;
    }
    return localStorage.getItem("token");
  } catch (e) {
    console.error("❌ Failed to parse auth token from localStorage:", e);
    return localStorage.getItem("token");
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  console.log("🔑 Token found:", token ? "YES" : "NO");
  console.log("📡 Calling:", `${BASE_URL}${path}`);

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
    console.error(`❌ API Error ${res.status} on ${path}: ${errorText}`);
    throw new Error(errorText || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }

  return res.text() as Promise<T>;
}

export const notificationApi = {
  getNotifications: (): Promise<NotificationDTO[]> =>
    apiFetch<NotificationDTO[]>("/api/notifications"),

  getUnreadNotifications: (): Promise<NotificationDTO[]> =>
    apiFetch<NotificationDTO[]>("/api/notifications/unread"),

  getUnreadCount: (): Promise<UnreadCountResponse> =>
    apiFetch<UnreadCountResponse>("/api/notifications/unread/count"),

  markAsRead: (notificationId: number): Promise<void> =>
    apiFetch<void>(`/api/notifications/${notificationId}/read`, { method: "PUT" }),

  markAllAsRead: (): Promise<void> =>
    apiFetch<void>("/api/notifications/read/all", { method: "PUT" }),
};