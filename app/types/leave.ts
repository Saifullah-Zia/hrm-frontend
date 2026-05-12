// types/leave.ts
export interface LeaveDto {
  id: number;
  startDate: string;   // ISO date string
  endDate: string;
  leaveType: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  userId: number;
  userName: string;
}