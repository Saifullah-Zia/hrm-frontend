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
  biometricPersonId?: number; // Hikvision device Employee ID
  basicSalary?: number;
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

function extractUserId(o: Record<string, unknown>): number | null {
  for (const key of ["userId", "user_id"]) {
    const n = Number(o[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const user = o.user;
  if (user && typeof user === "object") {
    const u = user as Record<string, unknown>;
    for (const key of ["id", "userId", "user_id"]) {
      const n = Number(u[key]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function optionalString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

function optionalPositiveInt(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Strip fields the backend does not persist on EmployeeProfile (probation lives on User). */
function buildProfilePayload(dto: EmployeeProfileDto): Record<string, unknown> {
  const firstName = optionalString(dto.firstName);
  const lastName = optionalString(dto.lastName);
  if (!firstName || !lastName) {
    throw new Error("First name and last name are required.");
  }

  const payload: Record<string, unknown> = {
    userId: dto.userId,
    firstName,
    lastName,
    employmentStatus: dto.employmentStatus ?? "ACTIVE",
  };

  for (const [key, val] of [
    ["phone", dto.phone],
    ["address", dto.address],
    ["dateOfBirth", dto.dateOfBirth],
    ["joiningDate", dto.joiningDate],
    ["cnicNumber", dto.cnicNumber],
    ["profilePicture", dto.profilePicture],
    ["emergencyContactName", dto.emergencyContactName],
    ["emergencyContactPhone", dto.emergencyContactPhone],
  ] as const) {
    const s = optionalString(val);
    if (s) payload[key] = s;
  }

  const departmentId = optionalPositiveInt(dto.departmentId);
  const positionId = optionalPositiveInt(dto.positionId);
  const biometricPersonId = optionalPositiveInt(dto.biometricPersonId);
  if (departmentId) payload.departmentId = departmentId;
  if (positionId) payload.positionId = positionId;
  if (biometricPersonId) payload.biometricPersonId = biometricPersonId;

  const basicSalary = dto.basicSalary !== undefined && dto.basicSalary !== null && String(dto.basicSalary).trim() !== "" ? Number(dto.basicSalary) : undefined;
  if (basicSalary !== undefined && !isNaN(basicSalary)) payload.basicSalary = basicSalary;

  return payload;
}

function normalizeProfile(
  data: unknown,
  fallbackUserId?: number
): EmployeeProfileDto | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const userId =
    extractUserId(o) ??
    (fallbackUserId && fallbackUserId > 0 ? fallbackUserId : null);
  const id = Number(o.id);

  if (!userId && (!Number.isFinite(id) || id <= 0)) return null;

  const departmentId = optionalPositiveInt(o.departmentId ?? o.department_id);
  const positionId = optionalPositiveInt(o.positionId ?? o.position_id);

  return {
    ...(o as unknown as EmployeeProfileDto),
    id: Number.isFinite(id) && id > 0 ? id : undefined,
    userId: userId ?? fallbackUserId ?? 0,
    firstName: optionalString(o.firstName ?? o.first_name),
    lastName: optionalString(o.lastName ?? o.last_name),
    phone: optionalString(o.phone),
    address: optionalString(o.address),
    dateOfBirth: optionalString(o.dateOfBirth ?? o.date_of_birth),
    joiningDate: optionalString(o.joiningDate ?? o.joining_date),
    cnicNumber: optionalString(o.cnicNumber ?? o.cnic_number),
    profilePicture: optionalString(o.profilePicture ?? o.profile_picture),
    emergencyContactName: optionalString(
      o.emergencyContactName ?? o.emergency_contact_name
    ),
    emergencyContactPhone: optionalString(
      o.emergencyContactPhone ?? o.emergency_contact_phone
    ),
    departmentId,
    positionId,
    employmentStatus: (o.employmentStatus ?? o.employment_status) as
      | EmployeeProfileDto["employmentStatus"]
      | undefined,
    basicSalary: o.basicSalary !== undefined && o.basicSalary !== null ? Number(o.basicSalary) : undefined,
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
    .map((item) => normalizeProfile(item))
    .filter((p): p is EmployeeProfileDto => p != null && p.userId > 0);
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

export function mergeProfiles(
  existing: EmployeeProfileDto[],
  ...incoming: EmployeeProfileDto[]
): EmployeeProfileDto[] {
  const byId = new Map<number, EmployeeProfileDto>();
  const byUserId = new Map<number, EmployeeProfileDto>();

  for (const p of existing) {
    if (p.id) byId.set(p.id, p);
    if (p.userId) byUserId.set(p.userId, p);
  }
  for (const p of incoming) {
    if (p.id) byId.set(p.id, p);
    if (p.userId) byUserId.set(p.userId, p);
  }

  const merged = new Map<number, EmployeeProfileDto>();
  for (const p of byId.values()) merged.set(p.id!, p);
  for (const p of byUserId.values()) {
    if (p.id) merged.set(p.id, p);
    else merged.set(-p.userId, p);
  }
  return Array.from(merged.values());
}

const headersConfig = (revealToken?: string) => {
  if (revealToken) {
    return {
      headers: {
        "X-Salary-Reveal-Token": revealToken,
      },
    };
  }
  return undefined;
};

export const employeeProfileApi = {
  getAll: async (revealToken?: string): Promise<EmployeeProfileDto[]> => {
    const res = await apiClient.get<unknown>(`/api/employee-profiles?_t=${Date.now()}`, headersConfig(revealToken));
    return normalizeProfilesList(res.data);
  },

  getPaginated: async (
    page = 0,
    size = 10,
    sortBy = "firstName",
    sortDir = "asc",
    revealToken?: string
  ): Promise<EmployeeProfilePageResponse> => {
    const res = await apiClient.get<unknown>(
      `/api/employee-profiles/paged?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}&_t=${Date.now()}`,
      headersConfig(revealToken)
    );
    const raw = res.data as Record<string, unknown>;
    const content = normalizeProfilesList(raw.content ?? raw);
    const pageMeta =
      raw.page && typeof raw.page === "object"
        ? (raw.page as Record<string, unknown>)
        : raw;
    const totalElements = Number(
      pageMeta.totalElements ?? raw.totalElements ?? content.length
    );
    const totalPages = Number(
      pageMeta.totalPages ??
        raw.totalPages ??
        (Math.ceil(totalElements / size) || 1)
    );
    const pageNumber = Number(pageMeta.number ?? raw.number ?? page);
    const pageSize = Number(pageMeta.size ?? raw.size ?? size);
    const safeTotalElements = Number.isFinite(totalElements) ? totalElements : content.length;
    const safeTotalPages = Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1;
    const safePageNumber = Number.isFinite(pageNumber) ? pageNumber : page;
    const safePageSize = Number.isFinite(pageSize) ? pageSize : size;
    const defaultSort = { empty: true, sorted: false, unsorted: true };

    return {
      content,
      totalElements: safeTotalElements,
      totalPages: safeTotalPages,
      size: safePageSize,
      number: safePageNumber,
      numberOfElements: content.length,
      first: safePageNumber <= 0,
      last: safeTotalPages <= 0 || safePageNumber >= safeTotalPages - 1,
      empty: content.length === 0,
      sort: defaultSort,
      pageable: {
        pageNumber: safePageNumber,
        pageSize: safePageSize,
        sort: defaultSort,
        offset: safePageNumber * safePageSize,
        paged: true,
        unpaged: false,
      },
    };
  },

  getById: async (id: number, revealToken?: string): Promise<EmployeeProfileDto> => {
    const res = await apiClient.get<unknown>(`/api/employee-profiles/${id}`, headersConfig(revealToken));
    const profile = normalizeProfile(res.data);
    if (!profile) throw new Error("Invalid profile response");
    return profile;
  },

  getByUserId: async (userId: number, revealToken?: string): Promise<EmployeeProfileDto> => {
    const res = await apiClient.get<EmployeeProfileDto>(
      `/api/employee-profiles/user/${userId}`,
      headersConfig(revealToken)
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

    // getMe() is a safe fallback — it suppresses all errors internally
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
    const payload = buildProfilePayload(dto);
    const res = await apiClient.post<unknown>("/api/employee-profiles", payload);
    let profile = normalizeProfile(res.data, dto.userId);

    if (!profile || !profile.userId) {
      const createdId = Number((res.data as Record<string, unknown> | null)?.id);
      if (Number.isFinite(createdId) && createdId > 0) {
        try {
          profile = await employeeProfileApi.getById(createdId);
        } catch {
          profile = normalizeProfile({ ...dto, id: createdId }, dto.userId);
        }
      } else {
        profile = normalizeProfile({ ...dto, ...(res.data as object) }, dto.userId);
      }
    }

    if (!profile?.userId) {
      throw new Error("Profile was saved but the server returned an unexpected response.");
    }
    return profile;
  },

  update: async (
    id: number,
    dto: EmployeeProfileDto
  ): Promise<EmployeeProfileDto> => {
    const res = await apiClient.put<unknown>(
      `/api/employee-profiles/${id}`,
      buildProfilePayload(dto)
    );
    const profile = normalizeProfile(res.data, dto.userId);
    if (profile?.userId) return profile;
    return employeeProfileApi.getById(id);
  },

  delete: async (id: number): Promise<string> => {
    const res = await apiClient.delete(`/api/employee-profiles/${id}`);
    return res.data;
  },
};

// ─── Salary OTP helpers ───────────────────────────────────────────────────────

/**
 * Sends a 6-digit OTP to the currently logged-in admin's registered email.
 * Returns { message: string } on success.
 */
export async function requestSalaryOtp(): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    "/api/employee-profiles/salary-otp/request"
  );
  return res.data;
}

/**
 * Verifies the submitted OTP code against the server-side cache.
 * Returns { valid: true } on success, { valid: false, error: string } on failure.
 */
export async function verifySalaryOtp(
  code: string
): Promise<{ valid: boolean; token?: string; error?: string }> {
  const res = await apiClient.post<{ valid: boolean; token?: string; error?: string }>(
    "/api/employee-profiles/salary-otp/verify",
    { code }
  );
  return res.data;
}

