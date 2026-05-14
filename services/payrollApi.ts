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
}

export interface CreatePayrollPayload {
  userId: number;
  salary: number;
  bonuses: number;
  deductions: number;
  month?: string;
  status?: string;
}

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
};
