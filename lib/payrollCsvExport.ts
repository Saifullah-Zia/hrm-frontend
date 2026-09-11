import type { PayrollDTO } from "@/services/payrollApi";

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Replace quotes with double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Export an array of PayrollDTO items to a CSV file.
 * Returns the count of exported records.
 */
export function exportPayrollCsv(payrolls: PayrollDTO[], periodLabel: string): number {
  if (!payrolls || payrolls.length === 0) {
    return 0;
  }

  const headers = [
    "Payroll ID",
    "Employee ID",
    "Employee Name",
    "Period / Month",
    "Basic Salary (PKR)",
    "Daily Salary (PKR)",
    "Working Days",
    "Present Days",
    "Late Days",
    "Paid Leave Days",
    "Unpaid Leave Days",
    "Absent Days",
    "Total Allowances (PKR)",
    "Total Bonuses (PKR)",
    "Late Deduction (PKR)",
    "FBR Tax Deduction (PKR)",
    "Total Deductions (PKR)",
    "Gross Salary (PKR)",
    "Net Salary (PKR)",
    "Status",
    "Generated At",
    "Approved At",
    "Paid At",
  ];

  const rows = payrolls.map((p) => {
    const totalDed = p.totalDeductions || p.deductions || 0;
    const lateDays = p.lateDays || 0;

    let lateDeduction = p.lateDeduction;
    if (lateDeduction === undefined || lateDeduction === null) {
      if (lateDays > 0) {
        if (lateDays > 3) lateDeduction = (lateDays - 3) * 100;
        else if (lateDays > 2 && totalDed === (lateDays - 2) * 100) lateDeduction = (lateDays - 2) * 100;
        else if (totalDed > 0 && (p.absentDays || 0) === 0 && (p.unpaidLeaveDays || 0) === 0) lateDeduction = totalDed;
        else lateDeduction = 0;
      } else {
        lateDeduction = 0;
      }
    }

    const fbrTaxDeduction = p.fbrTaxDeduction ?? p.taxDeduction ?? 0;

    return [
      p.id,
      p.userId,
      p.userName || `Employee ${p.userId}`,
      p.month || periodLabel,
      (p.basicSalary || p.salary || 0).toFixed(2),
      (p.dailySalary || 0).toFixed(2),
      p.workingDays || 0,
      p.presentDays || 0,
      p.lateDays || 0,
      p.paidLeaveDays || 0,
      p.unpaidLeaveDays || 0,
      p.absentDays || 0,
      (p.totalAllowances || 0).toFixed(2),
      (p.totalBonuses || p.bonuses || 0).toFixed(2),
      (lateDeduction || 0).toFixed(2),
      (fbrTaxDeduction || 0).toFixed(2),
      (totalDed || 0).toFixed(2),
      (p.grossSalary || p.salary || 0).toFixed(2),
      (p.netSalary || 0).toFixed(2),
      p.status || "DRAFT",
      p.generatedAt ? new Date(p.generatedAt).toLocaleString() : "",
      p.approvedAt ? new Date(p.approvedAt).toLocaleString() : "",
      p.paidAt ? new Date(p.paidAt).toLocaleString() : "",
    ].map(escapeCsvField);
  });

  const csvContent = "\uFEFF" + [headers.map(escapeCsvField).join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const cleanLabel = (periodLabel || "payroll").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
  const filename = `payroll_report_${cleanLabel}.csv`;

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return payrolls.length;
}
