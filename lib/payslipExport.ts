import type { PayrollDTO } from "@/services/payrollApi";

/** Opens a print-friendly payslip so the user can use the browser “Save as PDF” dialog. */
export function openPayslipPrintView(p: PayrollDTO, employeeName: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) {
    alert("Please allow pop-ups to print or save your payslip.");
    return;
  }
  const fmt = (n: number) =>
    (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Payslip — ${p.month ?? ""}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; color: #111; max-width: 640px; margin: 0 auto; }
    h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
    .muted { color: #555; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th, td { text-align: left; padding: 0.5rem 0; border-bottom: 1px solid #ddd; }
    td.num { text-align: right; }
    .net { font-size: 1.125rem; font-weight: 700; margin-top: 1rem; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  <h1>HRM — Payslip</h1>
  <p class="muted">${employeeName}</p>
  <p class="muted">Period: ${p.month ?? "—"} · Status: ${p.status ?? "—"}</p>
  <table>
    <tr><th>Salary</th><td class="num">${fmt(p.salary)}</td></tr>
    <tr><th>Bonuses</th><td class="num">${fmt(p.bonuses)}</td></tr>
    <tr><th>Deductions</th><td class="num">${fmt(p.deductions)}</td></tr>
  </table>
  <p class="net">Net pay: ${fmt(p.netSalary)}</p>
  <p class="muted" style="margin-top:2rem;">Use your browser Print dialog → “Save as PDF” if you need a file.</p>
</body>
</html>`);
  w.document.close();
  w.focus();
  requestAnimationFrame(() => {
    w.print();
  });
}
