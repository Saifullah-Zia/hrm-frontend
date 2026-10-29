import apiClient from "@/lib/apiClient";

export interface OnlineUser {
  id: number;
  name: string;
  email: string;
  role: string;
  lastSeenAt: string;
}

export interface OnlineUsersResponse {
  onlineCount: number;
  totalUsers: number;
  users: OnlineUser[];
}

export const presenceApi = {
  heartbeat: () => apiClient.post("/api/presence/heartbeat"),
  getOnline: async (): Promise<OnlineUsersResponse> =>
    (await apiClient.get<OnlineUsersResponse>("/api/presence/online")).data,
};