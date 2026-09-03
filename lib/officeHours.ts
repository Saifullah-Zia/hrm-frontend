/** Office policy used for check-in / check-out status (must match `OfficeHoursDto` JSON). */
export interface OfficeHoursConfig {
  /** `HH:mm` 24h, local wall time, e.g. `"09:00"` */
  workdayStart: string;
  /** `HH:mm` 24h, e.g. `"18:00"` or overnight `"02:00"` */
  workdayEnd: string;
  /** Minutes after `workdayStart` that still count as on time */
  graceMinutes: number;
}

/** Fallback matches the overnight office shift (5:00 PM – 2:00 AM). */
export const DEFAULT_OFFICE_HOURS: OfficeHoursConfig = {
  workdayStart: "17:00",
  workdayEnd: "02:00",
  graceMinutes: 15,
};

/** Minutes after workday end when an open shift is auto-closed (2:00 AM → 2:15 AM). */
export const AUTO_CHECKOUT_AFTER_END_MINUTES = 15;

export function parseHHMMToMinutes(s: string): number {
  const parts = (s ?? "09:00").trim().split(":");
  const h = parseInt(parts[0] ?? "9", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 9 * 60;
  return h * 60 + m;
}

/** After start + grace → `LATE`, else `PRESENT`. */
export function statusForCheckIn(now: Date, policy: OfficeHoursConfig): "PRESENT" | "LATE" {
  const deadline = parseHHMMToMinutes(policy.workdayStart) + (policy.graceMinutes ?? 0);
  const nowM = now.getHours() * 60 + now.getMinutes();
  return nowM > deadline ? "LATE" : "PRESENT";
}

const PKT = "Asia/Karachi";

function addCalendarDaysPkt(ymd: string, days: number): string {
  const base = new Date(`${ymd}T12:00:00+05:00`);
  base.setTime(base.getTime() + days * 24 * 60 * 60 * 1000);
  return base.toLocaleDateString("en-CA", { timeZone: PKT });
}

/** True when end time is on or before start (e.g. 17:00 → 02:00). */
export function isOvernightShift(policy: OfficeHoursConfig): boolean {
  return parseHHMMToMinutes(policy.workdayEnd) <= parseHHMMToMinutes(policy.workdayStart);
}

/**
 * Instant when an open shift for `shiftDateYmd` (the attendance/check-in date)
 * should be auto-closed: workday end + {@link AUTO_CHECKOUT_AFTER_END_MINUTES}.
 */
export function autoCheckoutInstant(
  shiftDateYmd: string,
  policy: OfficeHoursConfig,
  afterEndMinutes = AUTO_CHECKOUT_AFTER_END_MINUTES
): Date {
  const startM = parseHHMMToMinutes(policy.workdayStart);
  const endM = parseHHMMToMinutes(policy.workdayEnd);
  let total = endM + afterEndMinutes;
  let dayOffset = endM <= startM ? 1 : 0;
  while (total >= 24 * 60) {
    total -= 24 * 60;
    dayOffset += 1;
  }
  const ymd = addCalendarDaysPkt(shiftDateYmd.slice(0, 10), dayOffset);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return new Date(`${ymd}T${hh}:${mm}:00+05:00`);
}

export function hasRealCheckIn(checkIn: string | null | undefined): boolean {
  if (checkIn == null) return false;
  const s = String(checkIn).trim();
  return s.length > 0 && s !== "—" && s.toLowerCase() !== "null";
}

/** Checkout is only valid when the employee actually checked in. */
export function hasRealCheckOut(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): boolean {
  if (!hasRealCheckIn(checkIn) || checkOut == null) return false;
  const s = String(checkOut).trim();
  return s.length > 0 && s !== "—" && s.toLowerCase() !== "null";
}

const LEAVE_STATUSES = new Set(["ON_LEAVE", "UNPAID_LEAVE"]);

/** Auto-close only real open punches — never leave placeholders. */
export function shouldAutoCheckoutOpenShift(
  record: {
    date?: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status?: string;
  },
  policy: OfficeHoursConfig,
  now: Date = new Date()
): boolean {
  if (!record.date || LEAVE_STATUSES.has(record.status ?? "")) return false;
  if (!hasRealCheckIn(record.checkIn) || hasRealCheckOut(record.checkIn, record.checkOut)) {
    return false;
  }
  return now.getTime() >= autoCheckoutInstant(record.date, policy).getTime();
}
