// services/employeeProfileApi.ts

import apiClient from "@/lib/apiClient";

export type EmployeeProfileLoadCode = "NOT_FOUND" | "FORBIDDEN" | "NETWORK";

export class EmployeeProfileLoadError extends Error {
  code: EmployeeProfileLoadCode;
  httpStatus?: number;

  constructor(code: EmployeeProfileLoadCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "EmployeeProfileLoadError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function axiosStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "response" in err) {
    return (err as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

export interface EmployeeProfileDto {
  id?: number;
  userId: number;
  firstName?: string;
  lastName?: string;
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
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  probationStatus?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface EmployeeProfilePageResponse {
  content: EmployeeProfileDto[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

function normalizeProfile(data: unknown): EmployeeProfileDto | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const userId = Number(o.userId ?? o.user_id);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  
  return {
    ...(o as unknown as EmployeeProfileDto),
    userId,
    firstName: (o.firstName ?? o.first_name) as string | undefined,
    lastName: (o.lastName ?? o.last_name) as string | undefined,
  };
}

function normalizeProfilesList(data: unknown): EmployeeProfileDto[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) list = o.content;
    else if (Array.isArray(o.data)) list = o.data;
  }
  return list
    .map(normalizeProfile)
    .filter((p): p is EmployeeProfileDto => p != null);
}

function findProfileForUser(
  profiles: EmployeeProfileDto[],
  userId: number,
  email?: string
): EmployeeProfileDto | null {
  const byUser = profiles.find((p) => Number(p.userId) === Number(userId));
  if (byUser) return byUser;
  if (email) {
    const e = email.trim().toLowerCase();
    const byEmail = profiles.find(
      (p) =>
        typeof (p as EmployeeProfileDto & { email?: string }).email === "string" &&
        (p as EmployeeProfileDto & { email?: string }).email!.trim().toLowerCase() === e
    );
    if (byEmail) return byEmail;
  }
  return null;
}

export const employeeProfileApi = {
  getAll: async (): Promise<EmployeeProfileDto[]> => {
    const res = await apiClient.get<unknown>(`/api/employee-profiles?_t=${Date.now()}`);
    return normalizeProfilesList(res.data);
  },

  getPaginated: async (
    page = 0,
    size = 10,
    sortBy = "firstName",
    sortDir = "asc"
  ): Promise<EmployeeProfilePageResponse> => {
    const res = await apiClient.get<EmployeeProfilePageResponse>(
      `/api/employee-profiles/paged?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`
    );
    return {
      ...res.data,
      content: normalizeProfilesList(res.data.content),
    };
  },

  getById: async (id: number): Promise<EmployeeProfileDto> => {
    const res = await apiClient.get<EmployeeProfileDto>(`/api/employee-profiles/${id}`);
    return res.data;
  },

  getByUserId: async (userId: number): Promise<EmployeeProfileDto> => {
    const res = await apiClient.get<EmployeeProfileDto>(
      `/api/employee-profiles/user/${userId}`
    );
    const profile = normalizeProfile(res.data);
    if (!profile) throw new Error("Invalid profile response");
    return profile;
  },

  /** Logged-in employee (Spring: `GET /api/employee-profiles/me`). */
  getMe: async (): Promise<EmployeeProfileDto | null> => {
    try {
      const res = await apiClient.get<unknown>("/api/employee-profiles/me");
      return normalizeProfile(res.data);
    } catch {
      return null;
    }
  },

  /**
   * Resolves the profile for the current employee account: tries user id route,
   * then `/me`, then filters the full list (when the employee can read it).
   */
  getForEmployeeAccount: async (
    userId: number,
    options?: { email?: string }
  ): Promise<EmployeeProfileDto> => {
    let forbidden = false;

    try {
      return await employeeProfileApi.getByUserId(userId);
    } catch (err: unknown) {
      const status = axiosStatus(err);
      if (status === 403) forbidden = true;
      // 400 and 404 both mean "no profile for this user" — fall through to try /me and full list
      else if (status && status !== 404 && status !== 400) {
        throw new EmployeeProfileLoadError(
          "NETWORK",
          "Could not load your profile. Check your connection or try again.",
          status
        );
      }
    }

    const me = await employeeProfileApi.getMe();
    if (me && Number(me.userId) === Number(userId)) return me;

    try {
      const all = await employeeProfileApi.getAll();
      const found = findProfileForUser(all, userId, options?.email);
      if (found) return found;
    } catch (err: unknown) {
      if (axiosStatus(err) === 403) forbidden = true;
    }

    if (forbidden) {
      throw new EmployeeProfileLoadError(
        "FORBIDDEN",
        "Your account cannot read employee profiles. On the backend, allow EMPLOYEE to call GET /api/employee-profiles/user/{userId} (own id only) or add GET /api/employee-profiles/me.",
        403
      );
    }

    throw new EmployeeProfileLoadError(
      "NOT_FOUND",
      `No HR profile is linked to user id ${userId}. In Employee Profiles, the "Employee account" must be this exact user.`,
      404
    );
  },

  create: async (dto: EmployeeProfileDto): Promise<EmployeeProfileDto> => {
    if (!dto.userId || dto.userId <= 0) {
      throw new Error("Select a valid employee user account (User ID must match their login).");
    }
    const res = await apiClient.post<EmployeeProfileDto>("/api/employee-profiles", dto);
    const profile = normalizeProfile(res.data);
    if (!profile) throw new Error("Invalid profile response from server");
    return profile;
  },

  update: async (
    id: number,
    dto: EmployeeProfileDto
  ): Promise<EmployeeProfileDto> => {
    const res = await apiClient.put<EmployeeProfileDto>(`/api/employee-profiles/${id}`, dto);
    return res.data;
  },

  delete: async (id: number): Promise<string> => {
    const res = await apiClient.delete(`/api/employee-profiles/${id}`);
    return res.data;
  },
};
