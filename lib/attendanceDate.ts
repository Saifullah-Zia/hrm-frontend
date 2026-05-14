/** `YYYY-MM-DD` in the browser's local timezone (matches `AttendanceClockCard`). */
export function localDateKey(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA");
}

/** Attendance rows whose `date` falls on the given calendar day (local). */
export function attendanceRowsOnLocalDate(
  rows: { date?: string; userId?: number }[] | undefined | null,
  ymd: string
): { date?: string; userId?: number }[] {
  if (!rows?.length) return [];
  return rows.filter(
    (r) => (r.date ?? "").slice(0, 10) === ymd && r.userId != null && !Number.isNaN(Number(r.userId))
  );
}

/** Distinct employees with at least one attendance row on that local calendar day. */
export function distinctUserAttendanceCountOnLocalDate(
  rows: { date?: string; userId?: number }[] | undefined | null,
  d: Date = new Date()
): number {
  const ymd = localDateKey(d);
  const forDay = attendanceRowsOnLocalDate(rows, ymd);
  return new Set(forDay.map((r) => Number(r.userId))).size;
}
