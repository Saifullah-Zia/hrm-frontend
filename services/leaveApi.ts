// app/services/leaveApi.ts

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

export const leaveApi = {
  // ✅ Fixed: /api/leave not /api/leaves
  approveLeave: (leaveId: number): Promise<void> =>
    apiFetch<void>(`/api/leave/${leaveId}/approve`, { method: "PUT" }),

  rejectLeave: (leaveId: number): Promise<void> =>
    apiFetch<void>(`/api/leave/${leaveId}/reject`, { method: "PUT" }),
};