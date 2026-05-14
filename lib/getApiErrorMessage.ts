import type { AxiosError } from "axios";

/** Best-effort message from Spring or generic axios errors */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as AxiosError<{ message?: string; error?: string }>;
    const data = ax.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      if (typeof data.message === "string") return data.message;
      if (typeof data.error === "string") return data.error;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
