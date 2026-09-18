import apiClient from "@/lib/apiClient";

export interface UserWithPermission {
  id: number;
  name: string;
  email: string;
  role: string;
  webCheckInAllowed: boolean;
  outsideAccessAllowed: boolean;
}

/** Fetches all users including their webCheckInAllowed flag (Admin only) */
export async function getUsersWithPermissions(): Promise<UserWithPermission[]> {
  const res = await apiClient.get<UserWithPermission[]>("/api/users");
  return Array.isArray(res.data) ? res.data : [];
}

/** Fetches the currently authenticated user's permissions and settings */
export async function getMyPermissions(): Promise<UserWithPermission | null> {
  try {
    const res = await apiClient.get<UserWithPermission>("/api/users/me");
    return res.data ?? null;
  } catch (err) {
    console.error("Failed to fetch my user permissions:", err);
    return null;
  }
}

/** Admin: enable or disable web-based check-in for a specific employee */
export async function setWebCheckInAccess(
  userId: number,
  allowed: boolean
): Promise<void> {
  await apiClient.patch(`/api/users/${userId}/web-checkin-access`, { allowed });
}

/** Admin: enable or disable access outside Office Wi-Fi for a specific employee */
export async function setOutsideAccess(
  userId: number,
  allowed: boolean
): Promise<void> {
  await apiClient.patch(`/api/users/${userId}/outside-access`, { allowed });
}
