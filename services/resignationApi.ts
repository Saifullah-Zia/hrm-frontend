// services/resignationApi.ts
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

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ResignationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "COMPLETED";

export type ResignationType =
  | "VOLUNTARY"
  | "INVOLUNTARY"
  | "RETIREMENT"
  | "CONTRACT_END"
  | "MUTUAL_SEPARATION";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ResignationRequest {
  employeeId: number;
  resignationDate: string;   // ISO date: "YYYY-MM-DD"
  lastWorkingDay: string;    // ISO date: "YYYY-MM-DD"
  reason: string;
  resignationType: ResignationType;
}

export interface ResignationApprovalRequest {
  status: "APPROVED" | "REJECTED";
  hrComments?: string;
  isEligibleForRehire?: boolean;
  noticePeriodEndDate?: string; // ISO date
}

export interface ResignationResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeDepartment?: string;
  employeePosition?: string;

  resignationDate: string;
  lastWorkingDay: string;
  noticePeriodEndDate?: string;

  reason: string;
  resignationType: ResignationType;
  status: ResignationStatus;

  hrComments?: string;
  managerComments?: string;
  isNoticePeriodServed?: boolean;
  isEligibleForRehire?: boolean;

  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;

  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resignationStatusBadgeClass(status: ResignationStatus | string): string {
  switch (status) {
    case "PENDING":   return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    case "APPROVED":  return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "REJECTED":  return "bg-rose-500/15 text-rose-400 border-rose-500/25";
    case "WITHDRAWN": return "bg-white/10 text-white/50 border-white/15";
    case "COMPLETED": return "bg-sky-500/15 text-sky-400 border-sky-500/25";
    default:          return "bg-white/10 text-white/30 border-white/10";
  }
}

export function resignationStatusDotClass(status: ResignationStatus | string): string {
  switch (status) {
    case "PENDING":   return "bg-amber-400";
    case "APPROVED":  return "bg-emerald-400";
    case "REJECTED":  return "bg-rose-400";
    case "WITHDRAWN": return "bg-white/40";
    case "COMPLETED": return "bg-sky-400";
    default:          return "bg-white/20";
  }
}

export function resignationTypeLabel(type: ResignationType | string): string {
  switch (type) {
    case "VOLUNTARY":         return "Voluntary";
    case "INVOLUNTARY":       return "Involuntary";
    case "RETIREMENT":        return "Retirement";
    case "CONTRACT_END":      return "Contract End";
    case "MUTUAL_SEPARATION": return "Mutual Separation";
    default:                  return type ?? "—";
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const resignationApi = {
  /** POST /api/resignations — employee submits a resignation */
  submit: (req: ResignationRequest): Promise<ResignationResponse> =>
    apiFetch<ResignationResponse>("/api/resignations", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  /** GET /api/resignations — HR: all resignations */
  getAll: (): Promise<ResignationResponse[]> =>
    apiFetch<ResignationResponse[]>(`/api/resignations?_t=${Date.now()}`),

  /** GET /api/resignations/status/{status} — filtered by status */
  getByStatus: (status: ResignationStatus): Promise<ResignationResponse[]> =>
    apiFetch<ResignationResponse[]>(`/api/resignations/status/${status}?_t=${Date.now()}`),

  /** GET /api/resignations/employee/{employeeId} */
  getByEmployee: (employeeId: number): Promise<ResignationResponse[]> =>
    apiFetch<ResignationResponse[]>(`/api/resignations/employee/${employeeId}?_t=${Date.now()}`),

  /** GET /api/resignations/{id} */
  getById: (id: number): Promise<ResignationResponse> =>
    apiFetch<ResignationResponse>(`/api/resignations/${id}?_t=${Date.now()}`),

  /** PUT /api/resignations/{id}/process?approvedBy={userId} — HR approves/rejects */
  process: (
    id: number,
    req: ResignationApprovalRequest,
    approvedBy: number
  ): Promise<ResignationResponse> =>
    apiFetch<ResignationResponse>(
      `/api/resignations/${id}/process?approvedBy=${approvedBy}`,
      { method: "PUT", body: JSON.stringify(req) }
    ),

  /** PUT /api/resignations/{id}/withdraw?reason={reason} */
  withdraw: (id: number, reason: string): Promise<ResignationResponse> =>
    apiFetch<ResignationResponse>(
      `/api/resignations/${id}/withdraw?reason=${encodeURIComponent(reason)}`,
      { method: "PUT" }
    ),

  /** PUT /api/resignations/{id}/complete */
  complete: (id: number): Promise<ResignationResponse> =>
    apiFetch<ResignationResponse>(`/api/resignations/${id}/complete`, {
      method: "PUT",
    }),
};
