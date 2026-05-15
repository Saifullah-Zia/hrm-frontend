/** Normalize JWT / API user ids (string "12" → 12). */
export function parseUserId(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.trunc(n);
}

/** Read user id from common JWT claim shapes (Spring, custom tokens, etc.). */
export function userIdFromJwtPayload(payload: Record<string, unknown> | null): number | undefined {
  if (!payload) return undefined;
  return (
    parseUserId(payload.userId) ??
    parseUserId(payload.user_id) ??
    parseUserId(payload.uid) ??
    // Only use `id` when it looks like a numeric user pk (not jti/uuid)
    parseUserId(payload.id)
  );
}

export function readPersistedAuthUserId(): number | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("hrm-auth");
    if (!raw) return undefined;
    return parseUserId(JSON.parse(raw)?.state?.user?.userId);
  } catch {
    return undefined;
  }
}
