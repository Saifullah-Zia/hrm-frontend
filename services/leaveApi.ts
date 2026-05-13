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

/** `GET /api/leave/balance/user/{userId}` — matches Spring `LeaveBalanceDto`. */
export interface LeaveBalanceDto {
  id?: number;
  userId?: number;
  userName?: string;
  leaveType: string;
  year?: number;
  totalDays: number;
  usedDays: number;
  pendingDays?: number;
  remainingDays: number;
  carryForwardDays?: number;
}

/** `GET /api/leave/policy` — matches Spring `LeavePolicyDto`. */
export interface LeavePolicyDto {
  id: number;
  leaveType: string;
  totalDaysPerYear: number;
  requiresOneYear: boolean;
  carryForward: boolean;
  maxCarryForwardDays: number;
  isPublicHoliday: boolean;
  applyBeforeDays: number | null;
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
    let message = errorText || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(errorText) as { message?: string; error?: string };
      if (typeof j.message === "string") message = j.message;
      else if (typeof j.error === "string") message = j.error;
    } catch {
      /* plain text */
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }
  return res.text() as Promise<T>;
}

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "REJECT" | "CANCELLED";

export interface LeaveDto {
  id: number;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason?: string;
  status: LeaveStatus;
  userId: number;
  userName?: string;
  durationDays?: number;
  /** Populated on successful `POST /api/leave` apply. */
  remainingDaysAfterRequest?: number | null;
}

export const leavePolicyApi = {
  getAll: (): Promise<LeavePolicyDto[]> => apiFetch<LeavePolicyDto[]>("/api/leave/policy"),
  getByType: (leaveType: string): Promise<LeavePolicyDto> =>
    apiFetch<LeavePolicyDto>(`/api/leave/policy/${encodeURIComponent(leaveType)}`),
  update: (id: number, dto: Partial<LeavePolicyDto>): Promise<LeavePolicyDto> =>
    apiFetch<LeavePolicyDto>(`/api/leave/policy/${id}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    }),
};

export const leaveApi = {
  getAll: (): Promise<LeaveDto[]> => apiFetch<LeaveDto[]>("/api/leave"),
  getByStatus: (status: string): Promise<LeaveDto[]> =>
    apiFetch<LeaveDto[]>(`/api/leave/status/${status}`),
  getById: (id: number): Promise<LeaveDto> =>
    apiFetch<LeaveDto>(`/api/leave/${id}`),
  getByUserId: (userId: number): Promise<LeaveDto[]> =>
    apiFetch<LeaveDto[]>(`/api/leave/user/${userId}`),

  /** Current-year balances; returns `null` if the endpoint is missing or non-JSON error. */
  getBalanceByUserId: (userId: number): Promise<LeaveBalanceDto[] | null> =>
    apiFetchOptionalJson<LeaveBalanceDto[]>(`/api/leave/balance/user/${userId}`),

  /** Shortcut supported by `LeaveController` (same data as balance/user). */
  getMyBalance: (userId: number): Promise<LeaveBalanceDto[] | null> =>
    apiFetchOptionalJson<LeaveBalanceDto[]>(`/api/leave/my-balance?userId=${userId}`),

  getAllBalances: (): Promise<LeaveBalanceDto[]> =>
    apiFetch<LeaveBalanceDto[]>("/api/leave/balance/all"),

  /** Tries `GET /api/leave/balance/user/{id}` then `GET /api/leave/my-balance?userId=`. */
  async getBalancesForEmployee(userId: number): Promise<LeaveBalanceDto[] | null> {
    const direct = await apiFetchOptionalJson<LeaveBalanceDto[]>(`/api/leave/balance/user/${userId}`);
    if (direct !== null) return direct;
    return apiFetchOptionalJson<LeaveBalanceDto[]>(`/api/leave/my-balance?userId=${userId}`);
  },

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