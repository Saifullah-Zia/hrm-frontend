export function getAvatarUrl(path?: string | null): string | undefined {
  if (!path || typeof path !== "string") return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Reject strings that do not look like valid file paths or API endpoints
  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    return undefined;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

export function getUserInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
