// services/auditLogApi.ts

import apiClient from "@/lib/apiClient";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "WITHDRAW"
  | "SUBMIT"
  | "COMPLETE"
  | "LOGIN"
  | "LOGOUT";

export interface AuditLogResponse {
  id: number;
  entityName: string;
  entityId: number;
  action: AuditAction;
  description: string;
  oldValue?: string | null;
  newValue?: string | null;
  performedById: number;
  performedByName: string;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AuditLogPageResponse {
  content: AuditLogResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AuditLogFilter {
  entityName?: string;
  action?: AuditAction;
  from?: string; // ISO datetime
  to?: string;   // ISO datetime
}

/* ─── API ───────────────────────────────────────────────────────────────────── */

export const auditLogApi = {
  /**
   * GET /api/audit-logs — Paged, filtered audit logs
   */
  getFiltered: async (
    filter: AuditLogFilter = {},
    page = 0,
    size = 20
  ): Promise<AuditLogPageResponse> => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(size));
    if (filter.entityName) params.set("entityName", filter.entityName);
    if (filter.action) params.set("action", filter.action);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);

    const res = await apiClient.get<AuditLogPageResponse>(
      `/api/audit-logs?${params.toString()}`
    );
    return res.data;
  },

  /**
   * GET /api/audit-logs/entity/{entityName}/{entityId}
   * Full change history of one record
   */
  getEntityHistory: async (
    entityName: string,
    entityId: number
  ): Promise<AuditLogResponse[]> => {
    const res = await apiClient.get<AuditLogResponse[]>(
      `/api/audit-logs/entity/${entityName}/${entityId}`
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * GET /api/audit-logs/user/{userId}
   * All actions performed by a specific user
   */
  getUserActivity: async (
    userId: number,
    page = 0,
    size = 20
  ): Promise<AuditLogPageResponse> => {
    const res = await apiClient.get<AuditLogPageResponse>(
      `/api/audit-logs/user/${userId}?page=${page}&size=${size}`
    );
    return res.data;
  },
};
