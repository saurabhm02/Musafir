import { api } from "./api";

export type AppNotification = {
  id: string;
  type: "trip" | "visited" | "saved" | "discovery" | "alert" | "collection" | "map";
  title: string;
  subtitle: string;
  time_label: string;
  group: "today" | "earlier";
  is_read: boolean;
  data?: {
    entityType?: "trip" | "achievement" | "memory" | "poi" | "collection";
    entityId?: string;
    routeParams?: Record<string, any>;
  };
  created_at: string;
  link_id?: string;
};

export async function fetchNotifications(
  limit: number = 30,
  cursor?: string,
): Promise<{ items: AppNotification[]; unreadCount: number; nextCursor: string | null }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return api<{ items: AppNotification[]; unreadCount: number; nextCursor: string | null }>(
    `/notifications?${query.toString()}`,
  );
}

export async function fetchUnreadNotificationsCount(): Promise<number> {
  const res = await api<{ unreadCount: number }>("/notifications/unread-count");
  return res.unreadCount;
}

export async function markNotificationAsRead(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/notifications/mark-all-read", {
    method: "POST",
  });
}
