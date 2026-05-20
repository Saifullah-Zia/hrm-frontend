// services/offboardingTaskApi.ts

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

export type OffboardingTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export type OffboardingTaskCategory = "IT" | "HR" | "FINANCE" | "ADMIN" | "MANAGER" | "LEGAL";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface OffboardingTaskRequest {
  resignationId: number;
  taskName: string;
  taskDescription?: string;
  category: OffboardingTaskCategory;
  dueDate?: string; // "YYYY-MM-DD"
  assignedToUserId?: number;
}

export interface OffboardingTaskResponse {
  id: number;
  resignationId: number;
  employeeId?: number;
  employeeName: string;

  taskName: string;
  taskDescription?: string;
  category: OffboardingTaskCategory;
  taskStatus: OffboardingTaskStatus;

  dueDate?: string; // "YYYY-MM-DD"
  completedDate?: string; // "YYYY-MM-DD"
  isOverdue: boolean;

  assignedToName?: string;
  remarks?: string;
  createdAt: string;
}

export interface OffboardingTaskUpdateRequest {
  taskStatus?: OffboardingTaskStatus;
  completedDate?: string; // "YYYY-MM-DD"
  remarks?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const offboardingTaskApi = {
  create: (req: OffboardingTaskRequest): Promise<OffboardingTaskResponse> =>
    apiFetch<OffboardingTaskResponse>("/api/offboarding-tasks", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  getByResignation: (resignationId: number): Promise<OffboardingTaskResponse[]> =>
    apiFetch<OffboardingTaskResponse[]>(`/api/offboarding-tasks/resignation/${resignationId}?_t=${Date.now()}`),

  getMyTasks: (userId: number): Promise<OffboardingTaskResponse[]> =>
    apiFetch<OffboardingTaskResponse[]>(`/api/offboarding-tasks/my-tasks/${userId}?_t=${Date.now()}`),

  getOverdue: (): Promise<OffboardingTaskResponse[]> =>
    apiFetch<OffboardingTaskResponse[]>(`/api/offboarding-tasks/overdue?_t=${Date.now()}`),

  update: (id: number, req: OffboardingTaskUpdateRequest): Promise<OffboardingTaskResponse> =>
    apiFetch<OffboardingTaskResponse>(`/api/offboarding-tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),
};
