import type { PayrollDTO } from "@/services/payrollApi";

/** Customize to match your company. */
const COMPANY = {
  name: "JCAT Solutions",
  tagline: "Human Resource Management",
  address: "Rawalpindi, Punjab, Pakistan",
  currency: "PKR",
};

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: "#FEF3E2", fg: "#92400E", label: "Pending" },
  PAID: { bg: "#E7F5EC", fg: "#166534", label: "Paid" },
  APPROVED: { bg: "#E7F5EC", fg: "#166534", label: "Approved" },
  REJECTED: { bg: "#FDEAEA", fg: "#991B1B", label: "Rejected" },
};

function monthLabel(month?: string) {
  if (!month) return "—";
  const parts = month.split("-");
  if (parts.length !== 2) return month;
  const [y, m] = parts;
  const date = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "E";
}

/** Opens a print-friendly payslip so the user can use the browser “Save as PDF” dialog. */
export function openPayslipPrintView(p: PayrollDTO, employeeName: string) {
  const w = window.open("", "_blank", "width=860,height=1000");
  if (!w) {
    alert("Please allow pop-ups to print or save your payslip.");
    return;
  }

  const fmt = (n: number) =>
    (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const status = (p.status ?? "PENDING").toUpperCase();
  const statusStyle = STATUS_STYLES[status] ?? { bg: "#F1F0EA", fg: "#44443F", label: p.status ?? "—" };
  const period = monthLabel(p.month);
  const generatedOn = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const payslipId = `PS-${p.month?.replace("-", "") ?? "000000"}-${String(p.id).padStart(4, "0")}`;

  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Payslip — ${period} — ${employeeName}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #EDECE6;
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #1C1B18;
    -webkit-font-smoothing: antialiased;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 16px auto;
    background: #FFFFFF;
    padding: 16mm 15mm 14mm;
    position: relative;
  }
  .band {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    border-bottom: 2px solid #1C1B18;
  }
  .company-name {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.2px;
    margin: 0;
  }
  .company-meta {
    margin: 4px 0 0;
    font-size: 11px;
    color: #6B6A63;
    letter-spacing: 0.3px;
  }
  .doc-title {
    text-align: right;
  }
  .doc-title .label {
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #6B6A63;
    margin: 0 0 3px;
  }
  .doc-title .period {
    font-size: 17px;
    font-weight: 700;
    margin: 0;
  }
  .doc-title .payslip-id {
    font-size: 10.5px;
    color: #9C9A90;
    margin: 3px 0 0;
    font-variant-numeric: tabular-nums;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 32px;
    margin-top: 22px;
    padding-bottom: 20px;
    border-bottom: 1px solid #E3E1D9;
  }
  .meta-item .k {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9C9A90;
    margin: 0 0 3px;
  }
  .meta-item .v {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
  .employee-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
  }
  .avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: #1C1B18;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .employee-name {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }
  .employee-sub {
    font-size: 11.5px;
    color: #6B6A63;
    margin: 2px 0 0;
  }
  .status-pill {
    margin-left: auto;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 100px;
    background: ${statusStyle.bg};
    color: ${statusStyle.fg};
    white-space: nowrap;
  }

  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9C9A90;
    margin: 28px 0 10px;
  }
  table.ledger {
    width: 100%;
    border-collapse: collapse;
  }
  table.ledger th {
    text-align: left;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #9C9A90;
    font-weight: 600;
    padding: 0 0 8px;
    border-bottom: 1px solid #1C1B18;
  }
  table.ledger th.num, table.ledger td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  table.ledger td {
    padding: 11px 0;
    font-size: 13.5px;
    border-bottom: 1px solid #EDECE6;
  }
  table.ledger tr:last-child td { border-bottom: none; }
  .row-deduction td { color: #A3402F; }
  .row-deduction td.num::before { content: "\u2212 "; }
  .row-earning td.num::before { content: ""; }

  .net-block {
    margin-top: 26px;
    padding: 16px 18px;
    background: #1C1B18;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .net-block .label {
    color: #C9C7BC;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
  }
  .net-block .amount {
    color: #FFFFFF;
    font-size: 24px;
    font-weight: 700;
    margin: 2px 0 0;
    font-variant-numeric: tabular-nums;
  }
  .net-block .currency {
    font-size: 13px;
    font-weight: 500;
    color: #9C9A90;
    margin-right: 4px;
  }

  .footer {
    margin-top: 40px;
    padding-top: 14px;
    border-top: 1px solid #E3E1D9;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .footer .note {
    font-size: 10.5px;
    color: #9C9A90;
    max-width: 340px;
    line-height: 1.5;
    margin: 0;
  }
  .footer .stamp {
    font-size: 10px;
    color: #9C9A90;
    text-align: right;
    margin: 0;
  }
  .print-hint {
    max-width: 210mm;
    margin: 0 auto 8px;
    text-align: center;
    font-size: 12px;
    color: #6B6A63;
  }

  @media print {
    body { background: #fff; }
    .print-hint { display: none; }
    .sheet { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>
  <p class="print-hint">Use your browser Print dialog → “Save as PDF” if you need a file.</p>
  <div class="sheet">
    <div class="band">
      <div>
        <p class="company-name">${COMPANY.name}</p>
        <p class="company-meta">${COMPANY.tagline} &middot; ${COMPANY.address}</p>
      </div>
      <div class="doc-title">
        <p class="label">Payslip</p>
        <p class="period">${period}</p>
        <p class="payslip-id">${payslipId}</p>
      </div>
    </div>

    <div class="employee-row">
      <div class="avatar">${initials(employeeName)}</div>
      <div>
        <p class="employee-name">${employeeName}</p>
        <p class="employee-sub">Employee ID: ${p.userId}</p>
      </div>
      <span class="status-pill">${statusStyle.label}</span>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <p class="k">Pay period</p>
        <p class="v">${period}</p>
      </div>
      <div class="meta-item">
        <p class="k">Payment status</p>
        <p class="v">${statusStyle.label}</p>
      </div>
    </div>

    <p class="section-title">Earnings</p>
    <table class="ledger">
      <thead>
        <tr><th>Description</th><th class="num">Amount (${COMPANY.currency})</th></tr>
      </thead>
      <tbody>
        <tr class="row-earning"><td>Base salary</td><td class="num">${fmt(p.salary)}</td></tr>
        <tr class="row-earning"><td>Bonuses</td><td class="num">${fmt(p.bonuses)}</td></tr>
      </tbody>
    </table>

    <p class="section-title">Deductions</p>
    <table class="ledger">
      <thead>
        <tr><th>Description</th><th class="num">Amount (${COMPANY.currency})</th></tr>
      </thead>
      <tbody>
        <tr class="row-deduction"><td>Total deductions</td><td class="num">${fmt(p.deductions)}</td></tr>
      </tbody>
    </table>

    <div class="net-block">
      <p class="label">Net pay</p>
      <div>
        <span class="currency">${COMPANY.currency}</span><span class="amount">${fmt(p.netSalary)}</span>
      </div>
    </div>

    <div class="footer">
      <p class="note">This is a computer-generated payslip issued by ${COMPANY.name} and does not require a signature or stamp to be valid.</p>
      <p class="stamp">Generated on ${generatedOn}</p>
    </div>
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
  requestAnimationFrame(() => {
    w.print();
  });
}