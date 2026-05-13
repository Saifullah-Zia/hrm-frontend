import apiClient from "@/lib/apiClient";
import type { OfficeHoursConfig } from "@/lib/officeHours";
import { DEFAULT_OFFICE_HOURS } from "@/lib/officeHours";

const STORAGE_KEY = "hrm-office-hours";
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

function getFromLocalStorage(): OfficeHoursConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as OfficeHoursConfig;
    if (!data?.workdayStart || !data?.workdayEnd) return null;
    return {
      workdayStart: data.workdayStart,
      workdayEnd: data.workdayEnd,
      graceMinutes: typeof data.graceMinutes === "number" ? data.graceMinutes : 15,
    };
  } catch {
    return null;
  }
}

export const officeHoursApi = {
  /** Server first (`GET /api/settings/office-hours`), then localStorage (saved from admin UI), then defaults. */
  async get(): Promise<OfficeHoursConfig> {
    const server = await getFromServer().catch(() => null);
    if (server) return server;
    return getFromLocalStorage() ?? DEFAULT_OFFICE_HOURS;
  },

  /**
   * Persists for all users: tries `PUT /api/settings/office-hours` (ADMIN/SUPERADMIN).
   * Always writes browser `localStorage` so employees see the same policy until the API exists.
   */
  async update(config: OfficeHoursConfig): Promise<{ config: OfficeHoursConfig; source: "server" | "local" }> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    try {
      const res = await apiClient.put("/api/settings/office-hours", config);
      return { config: res.data as OfficeHoursConfig, source: "server" };
    } catch {
      return { config, source: "local" };
    }
  },
};
