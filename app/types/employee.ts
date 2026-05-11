export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface EmployeeProfileDto {
  id?: number;
  userId: number;
  phone?: string;
  address?: string;
  dateOfBirth?: string;       // "YYYY-MM-DD"
  joiningDate?: string;       // "YYYY-MM-DD"
  cnicNumber?: string;
  profilePicture?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  departmentId?: number;
  positionId?: number;
  employmentStatus?: EmploymentStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
}

export interface Position {
  id: number;
  title: string;
  departmentId?: number;
}