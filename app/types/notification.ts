// app/types/notification.ts

export interface NotificationDTO {
  id: number;
  message: string;
  type: string;
  status: string;
  userId: number;
  createdBy: number;
  createdByName?: string;
  referenceId: number;
  createdAt: string;
  timeAgo: string;
}

export interface UnreadCountResponse {
  count: number;
}