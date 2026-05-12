"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { payrollApi, PayrollDTO } from "@/services/payrollApi";
import { openPayslipPrintView } from "@/lib/payslipExport";

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function EmployeePayslipsPage() {
  const { user } = useAuthStore();
  const userId = user?.userId;
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  const payrollQuery = useQuery({
    queryKey: ["employee-payroll", userId],
    queryFn: () => payrollApi.getByUserId(userId!),
    enabled: typeof userId === "number",
  });

  const handleDownload = async (p: PayrollDTO) => {
    setPdfLoadingId(p.id);
    try {
      const downloaded = await payrollApi.tryDownloadPdf(p.id);
      if (!downloaded) {
        openPayslipPrintView(p, user?.username ?? p.userName ?? "Employee");
      }
    } finally {
      setPdfLoadingId(null);
    }
  };

  if (typeof userId !== "number") {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
        Missing <code className="text-amber-100">userId</code> in your JWT — payslips cannot be loaded.
      </div>
    );
  }

  const rows = payrollQuery.data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white/90 tracking-tight">My payslips</h1>
        <p className="text-white/40 text-sm mt-1">
          Net salary and breakdown by period. Tap PDF to download when your API exposes{" "}
          <code className="text-indigo-400/90">GET /api/payroll/{"{id}"}/pdf</code>; otherwise a print dialog opens so
          you can save as PDF from the browser.
        </p>
      </div>

      {payrollQuery.isLoading ? (
        <div className="animate-pulse h-48 rounded-2xl bg-white/[0.04]" />
      ) : payrollQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          Could not load payroll. Add or align a Spring endpoint such as{" "}
          <code className="text-rose-100">GET /api/payroll/user/{"{userId}"}</code> (see payroll controller you share).
        </div>
      ) : rows.length === 0 ? (
        <p className="text-white/40 text-sm">No payroll records found for your account.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#13151e]">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium text-right">Salary</th>
                <th className="px-4 py-3 font-medium text-right">Bonuses</th>
                <th className="px-4 py-3 font-medium text-right">Deductions</th>
                <th className="px-4 py-3 font-medium text-right">Net</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((p: PayrollDTO) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/80">{p.month ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-white/70">{fmtMoney(p.salary)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400/80">{fmtMoney(p.bonuses)}</td>
                  <td className="px-4 py-3 text-right text-rose-400/80">{fmtMoney(p.deductions)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white/90">{fmtMoney(p.netSalary)}</td>
                  <td className="px-4 py-3 text-white/50 capitalize">{p.status ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pdfLoadingId === p.id}
                      onClick={() => void handleDownload(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/25 transition-colors disabled:opacity-50"
                    >
                      {pdfLoadingId === p.id ? "…" : "PDF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
