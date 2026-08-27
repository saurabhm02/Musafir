import { protectedRoute } from "../middleware/auth";
import {
  listNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications";

export const notificationsRoutes = {
  "/notifications": {
    GET: protectedRoute(async (req, userId) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") || 30);
      const cursor = url.searchParams.get("cursor") || undefined;
      const res = await listNotifications(userId, limit, cursor);
      return Response.json(res);
    }),
  },
  "/notifications/unread-count": {
    GET: protectedRoute(async (_req, userId) => {
      const count = await getUnreadNotificationsCount(userId);
      return Response.json({ unreadCount: count });
    }),
  },
  "/notifications/:id/read": {
    PATCH: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const ok = await markNotificationRead(userId, req.params.id);
      return Response.json({ ok });
    }),
  },
  "/notifications/mark-all-read": {
    POST: protectedRoute(async (_req, userId) => {
      const ok = await markAllNotificationsRead(userId);
      return Response.json({ ok });
    }),
  },
  // Backward compatibility routes for /me/notifications
  "/me/notifications": {
    GET: protectedRoute(async (_req, userId) => {
      const res = await listNotifications(userId);
      return Response.json(res.items);
    }),
    PUT: protectedRoute(async (_req, userId) => {
      await markAllNotificationsRead(userId);
      return Response.json({ ok: true });
    }),
  },
  "/me/notifications/:id/read": {
    PUT: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const ok = await markNotificationRead(userId, req.params.id);
      return Response.json({ ok });
    }),
  },
};
