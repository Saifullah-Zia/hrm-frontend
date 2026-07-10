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

export interface HolidayDto {
  id?: number;
  name: string;
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  isActive: boolean;
}

export const holidayApi = {
  getAll: (): Promise<HolidayDto[]> =>
    apiFetch<HolidayDto[]>("/api/holidays"),

  getById: (id: number): Promise<HolidayDto> =>
    apiFetch<HolidayDto>(`/api/holidays/${id}`),

  create: (dto: HolidayDto): Promise<HolidayDto> =>
    apiFetch<HolidayDto>("/api/holidays", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  update: (id: number, dto: HolidayDto): Promise<HolidayDto> =>
    apiFetch<HolidayDto>(`/api/holidays/${id}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    }),

  delete: (id: number): Promise<void> =>
    apiFetch<void>(`/api/holidays/${id}`, {
      method: "DELETE",
    }),
};
