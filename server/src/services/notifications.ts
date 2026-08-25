import { db } from "../lib/db";

export type AppNotification = {
  id: string;
  type: "trip" | "visited" | "saved" | "discovery" | "alert" | "collection" | "map";
  title: string;
  subtitle: string;
  time_label: string;
  group: "today" | "earlier";
  is_read: boolean;
  created_at: string;
  link_id?: string;
};

async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const prefs = (user?.preferences as any) || {};
  if (Array.isArray(prefs.notifications)) {
    return prefs.notifications;
  }

  return [];
}

async function saveUserNotifications(userId: string, notifications: AppNotification[]): Promise<void> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const prefs = (user?.preferences as any) || {};
  await db.users.update({
    where: { id: userId },
    data: {
      preferences: {
        ...prefs,
        notifications,
      },
    },
  });
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  return getUserNotifications(userId);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const notifs = await getUserNotifications(userId);
  const idx = notifs.findIndex((n) => n.id === notificationId);
  if (idx === -1) return false;

  const target = notifs[idx];
  if (!target) return false;

  target.is_read = true;
  await saveUserNotifications(userId, notifs);
  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const notifs = await getUserNotifications(userId);
  const updated = notifs.map((n) => ({ ...n, is_read: true }));
  await saveUserNotifications(userId, updated);
  return true;
}
