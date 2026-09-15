/**
 * Timezone-agnostic calendar date utilities.
 * Ensures dates (e.g. "2026-09-14") display and compute consistently
 * without off-by-one shifts regardless of browser/system timezones (e.g. US timezones vs PKT).
 */

/**
 * Safely parses a date string ("YYYY-MM-DD" or ISO string) as a local calendar Date
 * at 12:00 PM (Noon) to avoid timezone boundary shifts.
 */
export function parseCalendarDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;

  const str = String(d).trim();
  if (!str) return null;

  // Match YYYY-MM-DD at the start of string
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 12, 0, 0); // Noon local time to avoid timezone edge cases
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date string or Date object as "Sep 14, 2026" without timezone shifting.
 */
export function formatCalendarDate(
  d: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!d) return "—";
  const date = parseCalendarDate(d);
  if (!date) return "—";

  const opts: Intl.DateTimeFormatOptions = options ?? {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  return date.toLocaleDateString("en-US", opts);
}

/**
 * Calculates inclusive working/calendar days between two date strings ("YYYY-MM-DD").
 * Excludes weekends (Saturday & Sunday) if excludeWeekends is true.
 */
export function calculateInclusiveDays(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  excludeWeekends = true
): number {
  const start = parseCalendarDate(startStr);
  const end = parseCalendarDate(endStr);
  if (!start || !end || end < start) return 0;

  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    if (excludeWeekends) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
    } else {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

/**
 * Calculates difference in calendar days between start and end (inclusive).
 */
export function calculateDaysBetween(
  startStr: string | null | undefined,
  endStr: string | null | undefined
): number {
  const start = parseCalendarDate(startStr);
  const end = parseCalendarDate(endStr);
  if (!start || !end || end < start) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

/**
 * Returns true if dateB is strictly before dateA.
 */
export function isDateBefore(
  dateAStr: string | null | undefined,
  dateBStr: string | null | undefined
): boolean {
  const a = parseCalendarDate(dateAStr);
  const b = parseCalendarDate(dateBStr);
  if (!a || !b) return false;
  return b.getTime() < a.getTime();
}
