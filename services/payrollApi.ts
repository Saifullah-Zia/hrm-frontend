import apiClient from "@/lib/apiClient";

export interface PayrollDTO {
  id: number;
  userId: number;
  userName?: string;
  salary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  month?: string;
  status?: string;
  basicSalary?: number;
  dailySalary?: number;
  workingDays?: number;
  presentDays?: number;
  lateDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  absentDays?: number;
  totalAllowances?: number;
  totalBonuses?: number;
  totalDeductions?: number;
  grossSalary?: number;
  generatedBy?: number;
  generatedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
  paidAt?: string;
}

export interface CreatePayrollPayload {
  userId: number;
  salary: number;
  bonuses: number;
  deductions: number;
  month?: string;
  status?: string;
}

export interface PayrollPeriodDTO {
  id: number;
  month: string;
  year: number;
  company?: string;
  department?: string;
  locked: boolean;
  lockedBy?: number;
  lockedByName?: string;
  lockedAt?: string;
  unlockedBy?: number;
  unlockedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload for creating a new period — server assigns id, lock fields, timestamps */
export type CreatePayrollPeriodPayload = Omit<
  PayrollPeriodDTO,
  "id" | "lockedBy" | "lockedByName" | "lockedAt" | "unlockedBy" | "unlockedAt" | "createdAt" | "updatedAt"
>;

export interface PayrollPolicyDTO {
  id: number;
  lateDeductionRule?: string;
  unpaidLeaveDeductionRule?: string;
  absentDeductionRule?: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload for creating a new policy — server assigns id/createdAt/updatedAt */
export type CreatePayrollPolicyPayload = Omit<
  PayrollPolicyDTO,
  "id" | "createdAt" | "updatedAt"
>;

/** Spring Data `Page<PayrollDTO>` JSON (camelCase) or a plain array from older APIs */
export interface PayrollPageResponse {
  content: PayrollDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
}

export function parsePayrollPageResponse(data: unknown): PayrollPageResponse {
  if (Array.isArray(data)) {
    const content = data as PayrollDTO[];
    return {
      content,
      totalElements: content.length,
      totalPages: 1,
      number: 0,
      size: content.length || 10,
      first: true,
      last: true,
    };
  }
  const o = data as Record<string, unknown>;
  const content = (Array.isArray(o.content) ? o.content : []) as PayrollDTO[];
  const totalElements = Number(o.totalElements ?? content.length);
  const size = Number(o.size ?? (content.length || 10));
  const number = Number(o.number ?? 0);
  const totalPages = Math.max(
    1,
    Number(o.totalPages ?? Math.ceil(totalElements / Math.max(1, size)))
  );
  return {
    content,
    totalElements,
    totalPages,
    number,
    size,
    first: typeof o.first === "boolean" ? o.first : number === 0,
    last: typeof o.last === "boolean" ? o.last : number >= totalPages - 1,
  };
}

export const payrollApi = {
  /**
   * Paginated list — Spring: `GET /api/payroll?page=&size=&sort=`
   */
  getPage: async (params: {
    page: number;
    size: number;
    sort?: string;
  }): Promise<PayrollPageResponse> => {
    const res = await apiClient.get<unknown>("/api/payroll", {
      params: {
        page: params.page,
        size: params.size,
        ...(params.sort ? { sort: params.sort } : { sort: "id,desc" }),
      },
    });
    return parsePayrollPageResponse(res.data);
  },

  /** Total payroll rows (uses page size 1 to read `totalElements` when backend is paginated). */
  getTotalCount: async (): Promise<number> => {
    const res = await apiClient.get<unknown>("/api/payroll", {
      params: { page: 0, size: 1, sort: "id,desc" },
    });
    const parsed = parsePayrollPageResponse(res.data);
    if (Array.isArray(res.data)) return parsed.content.length;
    return parsed.totalElements;
  },

  /** @deprecated Prefer getPage — kept for callers that expect a full list (loads first page only if API is paginated). */
  getAll: async (): Promise<PayrollDTO[]> => {
    const res = await apiClient.get<unknown>("/api/payroll");
    return parsePayrollPageResponse(res.data).content;
  },

  /**
   * Employee payslips — optional `page` / `size` when backend paginates
   * `GET /api/payroll/user/{userId}?page=&size=&sort=`
   */
  getByUserId: async (
    userId: number,
    opts?: { page?: number; size?: number }
  ): Promise<PayrollDTO[]> => {
    const page = opts?.page ?? 0;
    const size = opts?.size ?? 200;
    const res = await apiClient.get<unknown>(`/api/payroll/user/${userId}`, {
      params: { page, size, sort: "id,desc" },
    });
    return parsePayrollPageResponse(res.data).content;
  },

  getByUserIdPage: async (
    userId: number,
    params: { page: number; size: number }
  ): Promise<PayrollPageResponse> => {
    const res = await apiClient.get<unknown>(`/api/payroll/user/${userId}`, {
      params: { page: params.page, size: params.size, sort: "id,desc" },
    });
    return parsePayrollPageResponse(res.data);
  },

  create: async (payload: CreatePayrollPayload): Promise<PayrollDTO> => {
    const res = await apiClient.post<PayrollDTO>("/api/payroll", payload);
    return res.data;
  },

  update: async (id: number, payload: CreatePayrollPayload): Promise<PayrollDTO> => {
    const res = await apiClient.put<PayrollDTO>(`/api/payroll/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<string> => {
    const res = await apiClient.delete<string>(`/api/payroll/${id}`);
    return typeof res.data === "string" ? res.data : "";
  },

  tryDownloadPdf: async (id: number): Promise<boolean> => {
    try {
      const res = await apiClient.get(`/api/payroll/${id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${id}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  },

  // ─── Payroll Period Management ────────────────────────────────────────────────

  createPayrollPeriod: async (payload: CreatePayrollPeriodPayload): Promise<PayrollPeriodDTO> => {
    const res = await apiClient.post<PayrollPeriodDTO>("/api/payroll/periods", payload);
    return res.data;
  },

  getAllPayrollPeriods: async (): Promise<PayrollPeriodDTO[]> => {
    const res = await apiClient.get<PayrollPeriodDTO[]>("/api/payroll/periods");
    return res.data;
  },

  getPayrollPeriodById: async (id: number): Promise<PayrollPeriodDTO> => {
    const res = await apiClient.get<PayrollPeriodDTO>(`/api/payroll/periods/${id}`);
    return res.data;
  },

  lockPayrollPeriod: async (id: number, userId: number): Promise<PayrollPeriodDTO> => {
    const res = await apiClient.put<PayrollPeriodDTO>(`/api/payroll/periods/${id}/lock`, null, {
      params: { userId },
    });
    return res.data;
  },

  unlockPayrollPeriod: async (id: number, userId: number): Promise<PayrollPeriodDTO> => {
    const res = await apiClient.put<PayrollPeriodDTO>(`/api/payroll/periods/${id}/unlock`, null, {
      params: { userId },
    });
    return res.data;
  },

  isPeriodLocked: async (month: string, year: number, department?: string): Promise<boolean> => {
    const res = await apiClient.get<boolean>("/api/payroll/periods/check", {
      params: { month, year, department },
    });
    return res.data;
  },

  // ─── Payroll Generation ─────────────────────────────────────────────────────

  generatePayroll: async (payrollPeriodId: number, employeeId: number, generatedBy: number): Promise<PayrollDTO> => {
    const res = await apiClient.post<PayrollDTO>("/api/payroll/generate", null, {
      params: { payrollPeriodId, employeeId, generatedBy },
    });
    return res.data;
  },

  generateBulkPayroll: async (payrollPeriodId: number, generatedBy: number): Promise<string> => {
    const res = await apiClient.post<string>("/api/payroll/generate/bulk", null, {
      params: { payrollPeriodId, generatedBy },
    });
    return res.data;
  },

  approvePayroll: async (id: number, approvedBy: number): Promise<PayrollDTO> => {
    const res = await apiClient.put<PayrollDTO>(`/api/payroll/${id}/approve`, null, {
      params: { approvedBy },
    });
    return res.data;
  },

  markAsPaid: async (id: number): Promise<PayrollDTO> => {
    const res = await apiClient.put<PayrollDTO>(`/api/payroll/${id}/pay`);
    return res.data;
  },

  regeneratePayroll: async (id: number): Promise<PayrollDTO> => {
    const res = await apiClient.put<PayrollDTO>(`/api/payroll/${id}/regenerate`);
    return res.data;
  },

  getPayrollsByPeriod: async (periodId: number): Promise<PayrollDTO[]> => {
    const res = await apiClient.get<PayrollDTO[]>(`/api/payroll/period/${periodId}`);
    return res.data;
  },

  // ─── Payroll Policy Management ───────────────────────────────────────────────

  createPayrollPolicy: async (payload: CreatePayrollPolicyPayload): Promise<PayrollPolicyDTO> => {
    const res = await apiClient.post<PayrollPolicyDTO>("/api/payroll/policies", payload);
    return res.data;
  },

  getAllPayrollPolicies: async (): Promise<PayrollPolicyDTO[]> => {
    const res = await apiClient.get<PayrollPolicyDTO[]>("/api/payroll/policies");
    return res.data;
  },

  getActivePayrollPolicy: async (): Promise<PayrollPolicyDTO | null> => {
    try {
      const res = await apiClient.get<PayrollPolicyDTO>("/api/payroll/policies/active");
      return res.data;
    } catch {
      return null;
    }
  },

  updatePayrollPolicy: async (id: number, payload: CreatePayrollPolicyPayload): Promise<PayrollPolicyDTO> => {
    const res = await apiClient.put<PayrollPolicyDTO>(`/api/payroll/policies/${id}`, payload);
    return res.data;
  },

  // ─── Payslip Generation ───────────────────────────────────────────────────────

  getPayslipData: async (payrollId: number): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<Record<string, unknown>>(`/api/payslip/${payrollId}/data`);
    return res.data;
  },

  getPayslipHtml: async (payrollId: number): Promise<string> => {
    const res = await apiClient.get<string>(`/api/payslip/${payrollId}/html`);
    return res.data;
  },

  downloadPayslipPdf: async (payrollId: number): Promise<boolean> => {
    try {
      const res = await apiClient.get(`/api/payslip/${payrollId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${payrollId}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  },
};

