export type PasswordStrengthLabel = "Poor" | "Fair" | "Good" | "Excellent";

export interface PasswordStrength {
  score: number;
  label: PasswordStrengthLabel;
  percent: number;
}

/**
 * Heuristic strength for signup UX (not a security audit).
 * Maps score 0–4 to Poor / Fair / Good / Excellent and bar width 0–100%.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Poor", percent: 0 };
  }

  let bits = 0;
  if (password.length >= 8) bits++;
  if (password.length >= 12) bits++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) bits++;
  if (/\d/.test(password)) bits++;
  if (/[^A-Za-z0-9]/.test(password)) bits++;

  const score = Math.min(4, bits);

  const label: PasswordStrengthLabel =
    score <= 1 ? "Poor" : score === 2 ? "Fair" : score === 3 ? "Good" : "Excellent";

  const percent = score === 0 ? 15 : score * 25;

  return { score, label, percent };
}

export function strengthBarColor(label: PasswordStrengthLabel): string {
  switch (label) {
    case "Poor":
      return "bg-red-500";
    case "Fair":
      return "bg-amber-500";
    case "Good":
      return "bg-yellow-400";
    case "Excellent":
      return "bg-emerald-500";
    default:
      return "bg-zinc-600";
  }
}

export function strengthTextColor(label: PasswordStrengthLabel): string {
  switch (label) {
    case "Poor":
      return "text-red-400";
    case "Fair":
      return "text-amber-400";
    case "Good":
      return "text-yellow-300";
    case "Excellent":
      return "text-emerald-400";
    default:
      return "text-white/50";
  }
}
