// app/types/notification.ts

export interface NotificationDTO {
  id: number;
  message: string;
  type: string;      // LEAVE_REQUEST, LEAVE_APPROVED, LEAVE_REJECTED, PAYROLL
  status: string;    // UNREAD, READ
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