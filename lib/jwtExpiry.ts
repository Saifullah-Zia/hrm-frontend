/** Returns the JWT expiry as epoch milliseconds, or null if it can't be read. */
export function getTokenExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null | undefined): boolean {
  const exp = getTokenExpiryMs(token);
  return exp === null || exp <= Date.now();
}