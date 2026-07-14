import apiClient from "@/lib/apiClient";

export interface UserWithPermission {
  id: number;
  name: string;
  email: string;
  role: string;
  webCheckInAllowed: boolean;
}

/** Fetches all users including their webCheckInAllowed flag */
export async function getUsersWithPermissions(): Promise<UserWithPermission[]> {
  const res = await apiClient.get<UserWithPermission[]>("/api/users");
  return Array.isArray(res.data) ? res.data : [];
}

/** Admin: enable or disable web-based check-in for a specific employee */
export async function setWebCheckInAccess(
  userId: number,
  allowed: boolean
): Promise<void> {
  await apiClient.patch(`/api/users/${userId}/web-checkin-access`, { allowed });
}
