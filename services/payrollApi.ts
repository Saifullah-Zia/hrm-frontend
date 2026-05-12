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

export const payrollApi = {
  getAll: async (): Promise<PayrollDTO[]> => {
    const res = await apiClient.get("/api/payroll");
    return res.data;
  },

  /** Employee payslip list — backend should expose `GET /api/payroll/user/{userId}` (or adjust to match your controller). */
  getByUserId: async (userId: number): Promise<PayrollDTO[]> => {
    const res = await apiClient.get(`/api/payroll/user/${userId}`);
    return res.data;
  },

  /**
   * Tries `GET /api/payroll/{id}/pdf` (binary). Returns true if download started.
   * If your Spring app does not implement this yet, returns false — use print fallback instead.
   */
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
