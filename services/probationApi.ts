/**
 * Probation HR — matches `ProbationService` / `UserService` on the backend.
 *
 * Add Spring endpoints (e.g. on `UserController` under `/api/users`), for example:
 * - GET  /api/users/probation/on-probation              → getUsersOnProbation()
 * - GET  /api/users/probation/pending-confirmation      → getUsersPendingProbationConfirmation()
 * - PUT  /api/users/{userId}/probation/confirm          → confirmProbation(userId, adminId from JWT or body)
 *
 * If your `confirm` endpoint expects a body, send `{ confirmedByAdminId }` when the second argument is set.
 */
import apiClient from "@/lib/apiClient";

export type ProbationStatus = "ON_PROBATION" | "COMPLETED" | "CONFIRMED";

export interface UserWithProbationDto {
  id: number;
  name: string;
  email: string;
  role: string;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  probationStatus?: ProbationStatus | null;
}

function normStatusKey(status: ProbationStatus | string | null | undefined): string {
  return (status ?? "").trim().toUpperCase().replace(/\s+/g, "_");
}

/** Tailwind classes for probation pills (matches admin probation page). */
export function probationStatusBadgeClass(status: ProbationStatus | string | null | undefined): string {
  const u = normStatusKey(status);
  if (u === "ON_PROBATION")
    return "bg-amber-500/15 text-amber-300 border border-amber-500/25";
  if (u === "COMPLETED")
    return "bg-sky-500/15 text-sky-300 border border-sky-500/25";
  if (u === "CONFIRMED")
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25";
  return "bg-white/10 text-white/40 border border-white/15";
}

/** Short label for profile / summary UI. */
export function probationStatusShortLabel(status: ProbationStatus | string | null | undefined): string {
  const u = normStatusKey(status);
  if (u === "ON_PROBATION") return "On probation";
  if (u === "COMPLETED") return "Awaiting HR confirmation";
  if (u === "CONFIRMED") return "Permanent";
  return "Probation";
}

function fmtProfileDate(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return s;
  }
}

export function formatProbationRange(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  const a = fmtProfileDate(start ?? undefined);
  const b = fmtProfileDate(end ?? undefined);
  if (a && b) return `${a} – ${b}`;
  if (b) return `Ends ${b}`;
  if (a) return `Started ${a}`;
  return null;
}

/** Spring sometimes returns a page object instead of a raw array. */
function normalizeUsersListPayload(data: unknown): UserWithProbationDto[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content as UserWithProbationDto[];
    if (Array.isArray(o.data)) return o.data as UserWithProbationDto[];
    if (Array.isArray(o.users)) return o.users as UserWithProbationDto[];
  }
  return [];
}

export const probationApi = {
  /**
   * Single user with probation fields (typical Spring: `GET /api/users/{id}`).
   * Returns null if the call fails (403/404) so callers can fall back to other DTOs.
   */
  getByUserId: async (userId: number): Promise<UserWithProbationDto | null> => {
    try {
      const res = await apiClient.get<UserWithProbationDto>(`/api/users/${userId}`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Full user list (`GET /api/users`). Used to merge probation rows when dedicated probation endpoints
   * return empty but users already carry `probationStatus` on the user entity.
   */
  getAllUsers: async (): Promise<UserWithProbationDto[]> => {
    try {
      const res = await apiClient.get<unknown>("/api/users");
      return normalizeUsersListPayload(res.data);
    } catch {
      return [];
    }
  },

  getOnProbation: async (): Promise<UserWithProbationDto[]> => {
    try {
      const res = await apiClient.get<unknown>("/api/users/probation/on-probation");
      return normalizeUsersListPayload(res.data);
    } catch {
      return [];
    }
  },

  getPendingConfirmation: async (): Promise<UserWithProbationDto[]> => {
    try {
      const res = await apiClient.get<unknown>("/api/users/probation/pending-confirmation");
      return normalizeUsersListPayload(res.data);
    } catch {
      return [];
    }
  },

  /**
   * HR confirms permanent employment after `COMPLETED` probation.
   * Optional `confirmedByAdminId` is sent as JSON if your controller expects `@RequestBody`.
   */
  confirmProbation: async (userId: number, confirmedByAdminId?: number): Promise<string> => {
    const url = `/api/users/${userId}/probation/confirm`;
    const res =
      confirmedByAdminId != null
        ? await apiClient.put<string | { message?: string }>(url, { confirmedByAdminId })
        : await apiClient.put<string | { message?: string }>(url);
    const d = res.data;
    if (typeof d === "string") return d;
    if (d && typeof d === "object" && "message" in d && typeof (d as { message?: string }).message === "string") {
      return (d as { message: string }).message;
    }
    return "OK";
  },
};
