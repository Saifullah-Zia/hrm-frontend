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

export const probationApi = {
  getOnProbation: async (): Promise<UserWithProbationDto[]> => {
    const res = await apiClient.get<UserWithProbationDto[]>("/api/users/probation/on-probation");
    return res.data ?? [];
  },

  getPendingConfirmation: async (): Promise<UserWithProbationDto[]> => {
    const res = await apiClient.get<UserWithProbationDto[]>(
      "/api/users/probation/pending-confirmation"
    );
    return res.data ?? [];
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
