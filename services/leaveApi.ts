// services/leaveApi.ts
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
  status: "PENDING" | "APPROVED" | "REJECTED";
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