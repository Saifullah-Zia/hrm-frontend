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

/** Spring `Page<LeaveBalanceDto>` JSON from `/api/leave/balance/all` and `/user/{id}`. */
export interface LeaveBalancePage {
  content: LeaveBalanceDto[];
  totalElements: number;
  totalPages: number;
  /** 0-based page index (Spring `number`). */
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
}

/** Normalizes either a raw array (legacy) or a Spring `Page` body. */
export function parseLeaveBalancePayload(data: unknown): LeaveBalancePage {
  if (Array.isArray(data)) {
    const len = data.length;
    return {
      content: data as LeaveBalanceDto[],
      totalElements: len,
      totalPages: len > 0 ? 1 : 0,
      number: 0,
      size: len || 10,
      first: true,
      last: true,
    };
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const content = Array.isArray(o.content) ? (o.content as LeaveBalanceDto[]) : [];
    const totalElements = Number(o.totalElements ?? content.length);
    const totalPages = Math.max(0, Number(o.totalPages ?? 0));
    const number = Number(o.number ?? 0);
    const size = Number(o.size ?? (content.length || 10));
    return {
      content,
      totalElements,
      totalPages,
      number,
      size,
      first: typeof o.first === "boolean" ? o.first : number <= 0,
      last: typeof o.last === "boolean" ? o.last : totalPages <= 0 || number >= totalPages - 1,
    };
  }
  return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true };
}

async function fetchLeaveBalanceUserPage(
  userId: number,
  page: number,
  size: number
): Promise<LeaveBalancePage | null> {
  const raw = await apiFetchOptionalJson<unknown>(
    `/api/leave/balance/user/${userId}?page=${page}&size=${size}`
  );
  if (raw === null) return null;
  return parseLeaveBalancePayload(raw);
}

async function fetchLeaveBalanceUserMerged(
  userId: number,
  maxRows = 100
): Promise<LeaveBalanceDto[] | null> {
  const pageSize = 50;
  const first = await fetchLeaveBalanceUserPage(userId, 0, pageSize);
  if (first === null) return null;
  const out: LeaveBalanceDto[] = [...first.content];
  for (let p = 1; p < first.totalPages && out.length < maxRows; p++) {
    const next = await fetchLeaveBalanceUserPage(userId, p, pageSize);
    if (next === null) break;
    out.push(...next.content);
  }
  return out.slice(0, maxRows);
}

async function fetchMyBalanceLegacy(userId: number): Promise<LeaveBalanceDto[] | null> {
  const raw = await apiFetchOptionalJson<unknown>(`/api/leave/my-balance?userId=${userId}`);
  if (raw === null) return null;
  return parseLeaveBalancePayload(raw).content;
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

async function fetchAllLeaveBalancesPage(page: number, size: number): Promise<LeaveBalancePage> {
  const raw = await apiFetch<unknown>(`/api/leave/balance/all?page=${page}&size=${size}`);
  return parseLeaveBalancePayload(raw);
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

export interface LeavePageResponse {
  content: LeaveDto[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

/** Uppercase trim — use when comparing API `status` to literals (DB may use `REJECT` vs `REJECTED`). */
export function normalizeLeaveStatus(s: string | undefined): string {
  return (s ?? "").toString().trim().toUpperCase();
}

export function isRejectedLeaveStatus(s: string | undefined): boolean {
  const u = normalizeLeaveStatus(s);
  return u === "REJECT" || u === "REJECTED";
}

function mergeLeaveLists(chunks: LeaveDto[][]): LeaveDto[] {
  const byId = new Map<number, LeaveDto>();
  for (const chunk of chunks) {
    if (!Array.isArray(chunk)) continue;
    for (const row of chunk) {
      if (row == null || row.id == null || Number.isNaN(Number(row.id))) continue;
      byId.set(Number(row.id), row);
    }
  }
  return [...byId.values()];
}

async function apiFetchLeaveListQuiet(path: string): Promise<LeaveDto[]> {
  try {
    const data = await apiFetch<LeaveDto[]>(path);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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
  /**
   * Full list for admin screens. Some backends only return pending (or a subset) from `GET /api/leave`;
   * we merge that with `GET /api/leave/status/{status}` for PENDING, APPROVED, REJECTED, REJECT, CANCELLED
   * (DB may store rejected as `REJECT` while another path uses `REJECTED`).
   */
  getAll: async (): Promise<LeaveDto[]> => {
    const statuses = ["PENDING", "APPROVED", "REJECT", "CANCELLED"] as const;
    const [root, ...byStatus] = await Promise.all([
      apiFetchLeaveListQuiet("/api/leave"),
      ...statuses.map((s) => apiFetchLeaveListQuiet(`/api/leave/status/${s}`)),
    ]);
    return mergeLeaveLists([root, ...byStatus]);
  },
  getPaginated: (
    page = 0,
    size = 10,
    status?: string
  ): Promise<LeavePageResponse> => {
    let cleanStatus = status;
    if (cleanStatus === "REJECTED") {
      cleanStatus = "REJECT";
    }
    const statusParam = cleanStatus && cleanStatus !== "ALL" ? `&status=${cleanStatus}` : "";
    return apiFetch<LeavePageResponse>(
      `/api/leave/requests/paged?page=${page}&size=${size}${statusParam}`
    );
  },
  getByStatus: (status: string): Promise<LeaveDto[]> =>
    apiFetch<LeaveDto[]>(`/api/leave/status/${status}`),
  getById: (id: number): Promise<LeaveDto> =>
    apiFetch<LeaveDto>(`/api/leave/${id}`),
  getByUserId: (userId: number): Promise<LeaveDto[]> =>
    apiFetch<LeaveDto[]>(`/api/leave/user/${userId}`),

  getBalanceByUserIdPage: (userId: number, page = 0, size = 10) =>
    fetchLeaveBalanceUserPage(userId, page, size),

  getBalanceByUserId: (userId: number, maxRows = 100) => fetchLeaveBalanceUserMerged(userId, maxRows),

  getMyBalance: (userId: number) => fetchMyBalanceLegacy(userId),

  getAllBalancesPage: (page = 0, size = 10) => fetchAllLeaveBalancesPage(page, size),

  /** @deprecated Prefer `getAllBalancesPage` — fetches a single large page (legacy callers). */
  getAllBalances: async (): Promise<LeaveBalanceDto[]> =>
    (await fetchAllLeaveBalancesPage(0, 500)).content,

  /** Tries `GET /api/leave/balance/user/{id}` (paginated, merged) then `GET /api/leave/my-balance?userId=`. */
  async getBalancesForEmployee(userId: number): Promise<LeaveBalanceDto[] | null> {
    const direct = await fetchLeaveBalanceUserMerged(userId, 100);
    if (direct !== null) return direct;
    return fetchMyBalanceLegacy(userId);
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