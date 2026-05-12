const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  try {
    // Try to get from hrm-auth first (zustand persist)
    const raw = localStorage.getItem("hrm-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token ?? null;
      if (token) {
        console.log("✅ Token found from hrm-auth");
        return token;
      }
    }
    
    // Fallback to direct token storage
    const directToken = localStorage.getItem("token");
    if (directToken) {
      console.log("✅ Token found from direct storage");
      return directToken;
    }
    
    console.warn("⚠️ No token found in localStorage");
    return null;
  } catch (e) {
    console.error("❌ Failed to parse auth token from localStorage:", e);
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

export interface AttendanceDTO {
  id: number;
  date: string;
  status: string;       // PRESENT, ABSENT, LATE
  checkIn: string;
  checkOut: string;
  userId: number;
}

export const attendanceApi = {
  getAll: (): Promise<AttendanceDTO[]> =>
    apiFetch<AttendanceDTO[]>("/api/attendance"),

  getById: (id: number): Promise<AttendanceDTO> =>
    apiFetch<AttendanceDTO>(`/api/attendance/${id}`),

  create: (data: Partial<AttendanceDTO>): Promise<AttendanceDTO> =>
    apiFetch<AttendanceDTO>("/api/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<void> =>
    apiFetch<void>(`/api/attendance/${id}`, { method: "DELETE" }),

  /**
   * Rows for one user. Your `AttendanceController` only exposes `GET /api/attendance` (all),
   * so this loads that list and filters client-side. Prefer adding `GET /api/attendance/user/{userId}`
   * (or `/me`) on the server so employees never receive other users' rows.
   */
  getByUserId: async (userId: number): Promise<AttendanceDTO[]> => {
    const all = await apiFetch<AttendanceDTO[]>("/api/attendance");
    return all.filter((r) => Number(r.userId) === Number(userId));
  },
};