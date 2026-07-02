import type { AttendanceDTO } from "@/services/attendanceApi";

export type AttendanceExportUser = {
  id: number;
  name: string;
  email: string;
};

const CSV_HEADERS = [
  "Employee ID",
  "Employee Name",
  "Email",
  "Date",
  "Status",
  "Check In",
  "Check Out",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatPktTime(dt: string): string {
  if (!dt) return "";
  return new Date(dt + "+05:00").toLocaleTimeString("en-PK", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatExportDate(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

export function exportMonthlyAttendanceCsv(options: {
  month: string;
  records: AttendanceDTO[];
  users: AttendanceExportUser[];
}): number {
  const { month, records, users } = options;
  const userById = new Map(users.map((u) => [u.id, u]));

  const sorted = [...records].sort((a, b) => {
    const dateCmp = (a.date ?? "").localeCompare(b.date ?? "");
    if (dateCmp !== 0) return dateCmp;
    const nameA = userById.get(a.userId)?.name ?? "";
    const nameB = userById.get(b.userId)?.name ?? "";
    return nameA.localeCompare(nameB);
  });

  const lines = [
    CSV_HEADERS.join(","),
    ...sorted.map((row) => {
      const user = userById.get(row.userId);
      return [
        String(row.userId ?? ""),
        user?.name ?? "",
        user?.email ?? "",
        formatExportDate(row.date),
        row.status ?? "",
        formatPktTime(row.checkIn),
        formatPktTime(row.checkOut),
      ]
        .map((cell) => escapeCsvCell(cell))
        .join(",");
    }),
  ];

  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${month || "export"}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return sorted.length;
}
