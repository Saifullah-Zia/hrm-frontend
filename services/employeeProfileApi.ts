// services/employeeProfileApi.ts

import apiClient from "@/lib/apiClient";

export interface EmployeeProfileDto {
  id?: number;
  userId: number;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  cnicNumber?: string;
  profilePicture?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  departmentId?: number;
  positionId?: number;
  employmentStatus?: "ACTIVE" | "INACTIVE" | "TERMINATED";
  /** Present when the backend embeds probation on the employee-profile resource. */
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  probationStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export const employeeProfileApi = {
  getAll: async (): Promise<EmployeeProfileDto[]> => {
    const res = await apiClient.get("/api/employee-profiles");
    return res.data;
  },
  getById: async (id: number): Promise<EmployeeProfileDto> => {
    const res = await apiClient.get(`/api/employee-profiles/${id}`);
    return res.data;
  },
  getByUserId: async (userId: number): Promise<EmployeeProfileDto> => {
    const res = await apiClient.get(`/api/employee-profiles/user/${userId}`);
    return res.data;
  },
  create: async (dto: EmployeeProfileDto): Promise<EmployeeProfileDto> => {
    const res = await apiClient.post("/api/employee-profiles", dto);
    return res.data;
  },
  update: async (
    id: number,
    dto: EmployeeProfileDto
  ): Promise<EmployeeProfileDto> => {
    const res = await apiClient.put(`/api/employee-profiles/${id}`, dto);
    return res.data;
  },
  delete: async (id: number): Promise<string> => {
    const res = await apiClient.delete(`/api/employee-profiles/${id}`);
    return res.data;
  },
};