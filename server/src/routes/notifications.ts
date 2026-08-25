import { protectedRoute } from "../middleware/auth";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "../services/notifications";

export const notificationsRoutes = {
  "/me/notifications": {
    GET: protectedRoute(async (_req, userId) => Response.json(await listNotifications(userId))),
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
