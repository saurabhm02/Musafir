import { api } from "./api";

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

export function fetchNotifications(): Promise<AppNotification[]> {
  return api<AppNotification[]>("/me/notifications");
}

export function markNotificationAsRead(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/me/notifications/${id}/read`, {
    method: "PUT",
  });
}

export function markAllNotificationsAsRead(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/me/notifications", {
    method: "PUT",
  });
}
