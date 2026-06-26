const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("hrm-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token ?? null;
      if (token) return token;
    }
    return localStorage.getItem("token");
  } catch {
    return localStorage.getItem("token");
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
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

export interface AttendanceCorrectionRequestDTO {
  id?: number;
  userId: number;
  userName?: string;
  attendanceId?: number | null;
  date: string; // YYYY-MM-DD
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status?: string; // PENDING, APPROVED, REJECTED
  createdAt?: string;
}

export const attendanceCorrectionApi = {
  submit: (dto: AttendanceCorrectionRequestDTO): Promise<AttendanceCorrectionRequestDTO> =>
    apiFetch<AttendanceCorrectionRequestDTO>("/api/attendance-corrections", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  getByUserId: (userId: number): Promise<AttendanceCorrectionRequestDTO[]> =>
    apiFetch<AttendanceCorrectionRequestDTO[]>(`/api/attendance-corrections/user/${userId}`),

  getPending: (): Promise<AttendanceCorrectionRequestDTO[]> =>
    apiFetch<AttendanceCorrectionRequestDTO[]>("/api/attendance-corrections/pending"),

  approve: (id: number): Promise<AttendanceCorrectionRequestDTO> =>
    apiFetch<AttendanceCorrectionRequestDTO>(`/api/attendance-corrections/${id}/approve`, {
      method: "POST",
    }),

  reject: (id: number): Promise<AttendanceCorrectionRequestDTO> =>
    apiFetch<AttendanceCorrectionRequestDTO>(`/api/attendance-corrections/${id}/reject`, {
      method: "POST",
    }),
};
