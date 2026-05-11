import { api } from '@app/lib/api-client';
import { EmployeeProfileDto, Department, Position } from '../app/types/employee';

/* ── Employee Profiles ── */
export const employeeProfileService = {
  getAll: () =>
    api.get<EmployeeProfileDto[]>('/employee-profiles'),

  getById: (id: number) =>
    api.get<EmployeeProfileDto>(`/employee-profiles/${id}`),

  getByUserId: (userId: number) =>
    api.get<EmployeeProfileDto>(`/employee-profiles/user/${userId}`),

  create: (dto: EmployeeProfileDto) =>
    api.post<EmployeeProfileDto>('/employee-profiles', dto),

  update: (id: number, dto: EmployeeProfileDto) =>
    api.put<EmployeeProfileDto>(`/employee-profiles/${id}`, dto),

  delete: (id: number) =>
    api.delete(`/employee-profiles/${id}`),
};

/* ── Departments ── */
export const departmentService = {
  getAll: () => api.get<Department[]>('/departments'),
};

/* ── Positions ── */
export const positionService = {
  getAll: () => api.get<Position[]>('/positions'),
};