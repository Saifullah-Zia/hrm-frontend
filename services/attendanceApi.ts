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
  console.log(`🔑 Token found: ${token ? "YES" : "NO"}`);
  console.log(`📡 Calling: ${BASE_URL}${path}`);

  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
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
  status: string;     // PRESENT, ABSENT, LATE
  checkIn: string;    // stored as PKT, no timezone suffix
  checkOut: string;   // stored as PKT, no timezone suffix
  userId: number;
}

export interface AttendancePageResponse {
  content: AttendanceDTO[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// ── Manual attendance marking (admin backup for scheduled job) ───────────────
export interface ManualAttendanceResult {
  created: number;
  updatedToLeave: number;
  skippedAlreadyHandled: number;
  skippedWeekend: number;
}

export const attendanceApi = {

  getAll: (): Promise<AttendanceDTO[]> =>
    apiFetch<AttendanceDTO[]>("/api/attendance"),

  getById: (id: number): Promise<AttendanceDTO> =>
    apiFetch<AttendanceDTO>(`/api/attendance/${id}`),

  // ── Admin: manual record creation ─────────────────────────────────────────
  create: (data: Partial<AttendanceDTO>): Promise<AttendanceDTO> =>
    apiFetch<AttendanceDTO>("/api/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Admin only: full record edit ───────────────────────────────────────────
  adminUpdate: (id: number, data: Partial<AttendanceDTO>): Promise<AttendanceDTO> =>
    apiFetch<AttendanceDTO>(`/api/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<void> =>
    apiFetch<void>(`/api/attendance/${id}`, { method: "DELETE" }),

  // ── Employee: check-in (server stamps PKT time) ────────────────────────────
  checkIn: (userId: number): Promise<AttendanceDTO> =>
    apiFetch<AttendanceDTO>(`/api/attendance/checkin?userId=${userId}`, {
      method: "POST",
    }),

  // ── Employee: check-out (server stamps PKT time) ───────────────────────────
  checkOut: (userId: number): Promise<AttendanceDTO> =>
    apiFetch<AttendanceDTO>(`/api/attendance/checkout?userId=${userId}`, {
      method: "POST",
    }),

  // ── Paginated: all records (admin) ────────────────────────────────────────
  getPaginated: (
    page = 0,
    size = 10,
    sortBy = "date",
    sortDir = "desc"
  ): Promise<AttendancePageResponse> =>
    apiFetch<AttendancePageResponse>(
      `/api/attendance/paged?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`
    ),

  // ── Per-user: all records ─────────────────────────────────────────────────
  getByUserId: (userId: number): Promise<AttendanceDTO[]> =>
    apiFetch<AttendancePageResponse>(
      `/api/attendance/user/${userId}/paged?page=0&size=1000&sortBy=date&sortDir=desc`
    ).then((res) => res.content ?? []),

  // ── Per-user: paginated ───────────────────────────────────────────────────
  getPaginatedByUserId: (
    userId: number,
    page = 0,
    size = 10,
    sortBy = "date",
    sortDir = "desc"
  ): Promise<AttendancePageResponse> =>
    apiFetch<AttendancePageResponse>(
      `/api/attendance/user/${userId}/paged?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`
    ),

  // ── Admin: manual attendance marking for a date range (backup for scheduled job) ──
  // Creates missing records and updates stale ABSENT placeholders to
  // ON_LEAVE/UNPAID_LEAVE where approved leave exists. Never touches a real check-in.
  // Pass userIds = undefined/omitted to apply to all tracked employees.
  markManualAttendance: (
    startDate: string,
    endDate: string,
    userIds?: number[]
  ): Promise<ManualAttendanceResult> =>
    apiFetch<ManualAttendanceResult>("/api/attendance/mark-manual", {
      method: "POST",
      body: JSON.stringify({
        startDate,
        endDate,
        userIds: userIds && userIds.length ? userIds : null,
      }),
    }),
};

