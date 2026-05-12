// services/leaveApi.ts
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

/** Optional HR endpoint: `GET /api/leave/balance/user/{userId}` returning this shape. If missing, UI estimates from leave history. */
export interface LeaveBalanceDto {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

async function apiFetchOptionalJson<T>(path: string): Promise<T | null> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return (await res.json()) as T;
  return null;
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
    console.error(`❌ HTTP ${res.status}: ${errorText}`);
    throw new Error(errorText || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res.text() as Promise<T>;
}

export interface LeaveDto {
  id: number;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REJECT";
  userId: number;
  userName: string;
}

export const leaveApi = {
  getAll: (): Promise<LeaveDto[]> => apiFetch<LeaveDto[]>("/api/leave"),
  getByStatus: (status: string): Promise<LeaveDto[]> =>
    apiFetch<LeaveDto[]>(`/api/leave/status/${status}`),
  getById: (id: number): Promise<LeaveDto> =>
    apiFetch<LeaveDto>(`/api/leave/${id}`),
  getByUserId: (userId: number): Promise<LeaveDto[]> =>
    apiFetch<LeaveDto[]>(`/api/leave/user/${userId}`),

  /** Returns null if the backend does not expose balances yet. */
  getBalanceByUserId: (userId: number): Promise<LeaveBalanceDto[] | null> =>
    apiFetchOptionalJson<LeaveBalanceDto[]>(`/api/leave/balance/user/${userId}`),

  apply: (dto: Partial<LeaveDto>): Promise<LeaveDto> =>
    apiFetch<LeaveDto>("/api/leave", {
      method: "POST",
      body: JSON.stringify(dto),
    }),
  approveLeave: (leaveId: number): Promise<LeaveDto> =>
    apiFetch<LeaveDto>(`/api/leave/${leaveId}/approve`, { method: "PUT" }),
  rejectLeave: (leaveId: number): Promise<LeaveDto> =>
    apiFetch<LeaveDto>(`/api/leave/${leaveId}/reject`, { method: "PUT" }),
  update: (id: number, dto: Partial<LeaveDto>): Promise<LeaveDto> =>
    apiFetch<LeaveDto>(`/api/leave/${id}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    }),
  delete: (id: number): Promise<string> =>
    apiFetch<string>(`/api/leave/${id}`, { method: "DELETE" }),
};