import type { AttendanceDTO } from "@/services/attendanceApi";

export type AttendanceExportUser = {
  id: number;
  name: string;
  email: string;
  designation?: string;
};

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

function mapStatus(status: string | null | undefined): string {
  if (!status) return "A";
  switch (status.toUpperCase()) {
    case "PRESENT":
      return "P";
    case "LATE":
      return "L";
    case "ABSENT":
      return "A";
    default:
      return "A";
  }
}

function isOffDay(date: Date): boolean {
  const day = date.getDay();
  return day === 6 || day === 0; // Saturday (6) or Sunday (0)
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let i = 1; i <= lastDay; i++) {
    days.push(new Date(year, month - 1, i));
  }
  return days;
}

function formatDateHeader(date: Date): string {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

function getDayName(date: Date): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[date.getDay()];
}

export function exportMonthlyAttendanceCsv(options: {
  month: string;
  records: AttendanceDTO[];
  users: AttendanceExportUser[];
}): number {
  const { month, records, users } = options;

  // Parse month (format: "2024-11" or "November 2024")
  let year: number;
  let monthNum: number;

  if (month.includes("-")) {
    const [y, m] = month.split("-");
    year = parseInt(y);
    monthNum = parseInt(m);
  } else {
    // Try to parse "November 2024" format
    const parts = month.split(" ");
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthNum = monthNames.indexOf(parts[0]) + 1;
    year = parseInt(parts[1]);
  }

  if (!year || !monthNum) {
    console.error("Invalid month format:", month);
    return 0;
  }

  // Get all days in the month
  const daysInMonth = getDaysInMonth(year, monthNum);

  // Group records by employee and date
  const userById = new Map(users.map((u) => [u.id, u]));
  const recordsByUser = new Map<number, Map<string, AttendanceDTO>>();

  records.forEach((record) => {
    if (!recordsByUser.has(record.userId)) {
      recordsByUser.set(record.userId, new Map());
    }
    recordsByUser.get(record.userId)!.set(record.date, record);
  });

  // Generate CSV lines
  const lines: string[] = [];

  // First header row: Day names
  const dayNamesRow = ["", "", "", ...daysInMonth.map(getDayName)];
  lines.push(dayNamesRow.map(escapeCsvCell).join(","));

  // Second header row: Dates
  const datesRow = ["", "", "", ...daysInMonth.map(formatDateHeader)];
  lines.push(datesRow.map(escapeCsvCell).join(","));

  // Third header row: Column headers
  const headerRow = ["Sr. No.", "Employee Name", "Designation", ...daysInMonth.map(formatDateHeader)];
  lines.push(headerRow.map(escapeCsvCell).join(","));

  // Sort users by name
  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

  // Generate rows for each employee
  sortedUsers.forEach((user, index) => {
    const userRecords = recordsByUser.get(user.id) || new Map();

    // Status row
    const statusRow: string[] = [String(index + 1), user.name, user.designation || ""];
    daysInMonth.forEach((day) => {
      const dateStr = day.toISOString().slice(0, 10);
      const record = userRecords.get(dateStr);

      if (isOffDay(day)) {
        statusRow.push("H");
      } else if (record) {
        statusRow.push(mapStatus(record.status));
      } else {
        statusRow.push(""); // Leave blank for days with no record
      }
    });
    lines.push(statusRow.map(escapeCsvCell).join(","));

    // Check-In row
    const checkInRow: string[] = ["", "", "Check In"];
    daysInMonth.forEach((day) => {
      const dateStr = day.toISOString().slice(0, 10);
      const record = userRecords.get(dateStr);

      if (isOffDay(day)) {
        checkInRow.push("");
      } else if (record && record.checkIn) {
        checkInRow.push(formatPktTime(record.checkIn));
      } else {
        checkInRow.push("");
      }
    });
    lines.push(checkInRow.map(escapeCsvCell).join(","));

    // Check-Out row
    const checkOutRow: string[] = ["", "", "Check Out"];
    daysInMonth.forEach((day) => {
      const dateStr = day.toISOString().slice(0, 10);
      const record = userRecords.get(dateStr);

      if (isOffDay(day)) {
        checkOutRow.push("");
      } else if (record && record.checkOut) {
        checkOutRow.push(formatPktTime(record.checkOut));
      } else {
        checkOutRow.push("");
      }
    });
    lines.push(checkOutRow.map(escapeCsvCell).join(","));
  });

  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-matrix-${month || "export"}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return sortedUsers.length;
}