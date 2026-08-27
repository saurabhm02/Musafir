import { db } from "../lib/db";

export type AppNotification = {
  id: string;
  type:
    | "trip"
    | "visited"
    | "saved"
    | "discovery"
    | "alert"
    | "collection"
    | "map"
    | "achievement"
    | "memory";
  title: string;
  subtitle: string;
  time_label: string;
  group: "today" | "earlier";
  is_read: boolean;
  data: Record<string, any>;
  created_at: string;
  link_id?: string;
};

export type NotificationEvent = {
  userId: string;
  type:
    | "trip_completed"
    | "achievement_unlocked"
    | "memory_moderated"
    | "memory_removed"
    | "memory_restored"
    | "poi_visited"
    | "saved"
    | "collection"
    | "alert";
  title: string;
  subtitle: string;
  data?: {
    entityType?: "trip" | "achievement" | "memory" | "poi" | "collection";
    entityId?: string;
    routeParams?: Record<string, any>;
  };
  idempotencyKey?: string;
};

function formatTimeLabel(date: Date): { timeLabel: string; group: "today" | "earlier" } {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const group: "today" | "earlier" = diffHours < 24 ? "today" : "earlier";

  if (diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return { timeLabel: `${mins}m ago`, group };
  }
  if (diffHours < 24) {
    return { timeLabel: `${Math.floor(diffHours)}h ago`, group };
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return { timeLabel: "Yesterday", group };
  }
  return {
    timeLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    group,
  };
}

function mapNotificationType(rawType: string): AppNotification["type"] {
  if (rawType.startsWith("trip")) return "trip";
  if (rawType.startsWith("achievement")) return "discovery";
  if (rawType.startsWith("memory")) return "map";
  if (rawType.startsWith("poi")) return "visited";
  if (rawType.startsWith("collection")) return "collection";
  if (rawType.startsWith("saved")) return "saved";
  return "alert";
}

export async function dispatchNotification(event: NotificationEvent): Promise<string | null> {
  try {
    if (event.idempotencyKey) {
      const existing = await db.notifications.findUnique({
        where: {
          user_id_idempotency_key: {
            user_id: event.userId,
            idempotency_key: event.idempotencyKey,
          },
        },
      });
      if (existing) return existing.id;
    }

    const created = await db.notifications.create({
      data: {
        user_id: event.userId,
        type: event.type,
        title: event.title,
        subtitle: event.subtitle,
        data: event.data || {},
        idempotency_key: event.idempotencyKey,
      },
    });

    return created.id;
  } catch (err) {
    console.warn("Failed to dispatch notification:", err);
    return null;
  }
}

export async function listNotifications(
  userId: string,
  limit: number = 30,
  cursor?: string,
): Promise<{ items: AppNotification[]; unreadCount: number; nextCursor: string | null }> {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const [raw, unreadCount] = await Promise.all([
    db.notifications.findMany({
      where: {
        user_id: userId,
        ...(cursor ? { created_at: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { created_at: "desc" },
      take: safeLimit + 1,
    }),
    db.notifications.count({
      where: { user_id: userId, is_read: false },
    }),
  ]);

  const hasMore = raw.length > safeLimit;
  const sliced = hasMore ? raw.slice(0, safeLimit) : raw;

  const items: AppNotification[] = sliced.map((n) => {
    const { timeLabel, group } = formatTimeLabel(n.created_at);
    const data = (n.data as Record<string, any>) || {};
    return {
      id: n.id,
      type: mapNotificationType(n.type),
      title: n.title,
      subtitle: n.subtitle,
      time_label: timeLabel,
      group,
      is_read: n.is_read,
      data,
      created_at: n.created_at.toISOString(),
      link_id: data.entityId || undefined,
    };
  });

  const lastItem = sliced[sliced.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.created_at.toISOString() : null;

  return { items, unreadCount, nextCursor };
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  return db.notifications.count({
    where: { user_id: userId, is_read: false },
  });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const target = await db.notifications.findFirst({
    where: { id: notificationId, user_id: userId },
  });
  if (!target) return false;

  await db.notifications.update({
    where: { id: notificationId },
    data: { is_read: true, read_at: new Date() },
  });
  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  await db.notifications.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true, read_at: new Date() },
  });
  return true;
}
