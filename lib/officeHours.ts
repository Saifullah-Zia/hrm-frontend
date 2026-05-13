/** Office policy used for check-in / check-out status (must match `OfficeHoursDto` JSON). */
export interface OfficeHoursConfig {
  /** `HH:mm` 24h, local wall time, e.g. `"09:00"` */
  workdayStart: string;
  /** `HH:mm` 24h, e.g. `"18:00"` — informational / future early-leave rules */
  workdayEnd: string;
  /** Minutes after `workdayStart` that still count as on time */
  graceMinutes: number;
}

export const DEFAULT_OFFICE_HOURS: OfficeHoursConfig = {
  workdayStart: "09:00",
  workdayEnd: "18:00",
  graceMinutes: 15,
};

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
