import type { AnnouncementDTO } from "@/services/announcementApi";
import type { NotificationDTO } from "@/app/types/notification";

const SEEN_KEY = "hrm-seen-announcement-ids";

export function isAnnouncementNotificationType(type: string): boolean {
  return (type ?? "").toUpperCase().includes("ANNOUNCEMENT");
}

export function getSeenAnnouncementIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function markAnnouncementsSeen(ids: number[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const seen = new Set(getSeenAnnouncementIds());
  ids.forEach((id) => seen.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return "Just now";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "Recently";
  }
}

/** Client-side alerts when the API has no ANNOUNCEMENT rows yet (negative ids = not from server). */
export function buildUnseenAnnouncementNotifications(
  announcements: AnnouncementDTO[]
): NotificationDTO[] {
  const seen = new Set(getSeenAnnouncementIds());
  return announcements
    .filter((a) => a.active !== false && !seen.has(a.id))
    .map((a) => ({
      id: -a.id,
      message: `New announcement: ${a.title}`,
      type: "ANNOUNCEMENT",
      status: "UNREAD",
      userId: 0,
      createdBy: 0,
      createdByName: a.createdBy || undefined,
      referenceId: a.id,
      createdAt: a.createdAt,
      timeAgo: formatTimeAgo(a.createdAt),
    }));
}

export function mergeWithAnnouncementAlerts(
  apiNotifications: NotificationDTO[],
  announcements: AnnouncementDTO[]
): NotificationDTO[] {
  const apiAnnouncementRefs = new Set(
    apiNotifications
      .filter((n) => isAnnouncementNotificationType(n.type))
      .map((n) => n.referenceId)
  );
  const synthetic = buildUnseenAnnouncementNotifications(announcements).filter(
    (s) => !apiAnnouncementRefs.has(s.referenceId)
  );
  const merged = [...apiNotifications, ...synthetic];
  merged.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime() || 0;
    const tb = new Date(b.createdAt).getTime() || 0;
    return tb - ta;
  });
  return merged;
}

export function countUnreadIncludingAnnouncements(
  apiUnreadCount: number,
  apiNotifications: NotificationDTO[],
  announcements: AnnouncementDTO[]
): number {
  const apiUnread = apiNotifications.filter((n) => n.status === "UNREAD").length;
  const synthetic = buildUnseenAnnouncementNotifications(announcements);
  const apiAnnouncementRefs = new Set(
    apiNotifications
      .filter((n) => isAnnouncementNotificationType(n.type))
      .map((n) => n.referenceId)
  );
  const extraSynthetic = synthetic.filter((s) => !apiAnnouncementRefs.has(s.referenceId)).length;
  if (apiUnreadCount > 0 && apiUnreadCount >= apiUnread) {
    return apiUnreadCount + extraSynthetic;
  }
  return apiUnread + extraSynthetic;
}

export function isSyntheticAnnouncementNotification(id: number): boolean {
  return id < 0;
}
