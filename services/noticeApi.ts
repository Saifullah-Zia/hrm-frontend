import apiClient from "@/lib/apiClient";

export interface NoticeDto {
  id?: number;
  userId: number;
  employeeName?: string;
  noticeType: "TERMINATION" | "WARNING";
  title: string;
  description: string;
  effectiveDate?: string;
  attachmentUrl?: string;
  createdAt?: string;
  createdBy?: number;
  createdByName?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const noticeApi = {
  sendNotice: async (dto: NoticeDto): Promise<NoticeDto> => {
    const response = await apiClient.post<NoticeDto>(`${BASE_URL}/api/notices/send`, dto);
    return response.data;
  },

  getAllNotices: async (): Promise<NoticeDto[]> => {
    const response = await apiClient.get<NoticeDto[]>(`${BASE_URL}/api/notices/all`);
    return response.data;
  },

  getNoticesByUserId: async (userId: number): Promise<NoticeDto[]> => {
    const response = await apiClient.get<NoticeDto[]>(`${BASE_URL}/api/notices/user/${userId}`);
    return response.data;
  },
};
