import apiClient from "@/lib/apiClient";
import type { OfficeHoursConfig } from "@/lib/officeHours";
import { DEFAULT_OFFICE_HOURS } from "@/lib/officeHours";

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

async function getFromServer(): Promise<OfficeHoursConfig | null> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/settings/office-hours`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as OfficeHoursConfig;
  if (!data?.workdayStart || !data?.workdayEnd) return null;
  return {
    workdayStart: data.workdayStart,
    workdayEnd: data.workdayEnd,
    graceMinutes: typeof data.graceMinutes === "number" ? data.graceMinutes : 15,
  };
}

export const officeHoursApi = {
  async get(): Promise<OfficeHoursConfig> {
    const server = await getFromServer().catch(() => null);
    if (server) return server;
    return DEFAULT_OFFICE_HOURS;
  },

  async update(config: OfficeHoursConfig): Promise<OfficeHoursConfig> {
    const res = await apiClient.put("/api/settings/office-hours", config);
    return res.data as OfficeHoursConfig;
  },
};
