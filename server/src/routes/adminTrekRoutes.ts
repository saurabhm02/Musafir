import { verifyUser } from "../middleware/auth";
import {
  listPendingTrekRoutes,
  verifyTrekRoute,
  rejectTrekRoute,
} from "../services/trekRoutes";
import { asVerifyTrekRoute, asRejectTrekRoute } from "../lib/validate";

export const adminTrekRoutes = {
  // GET /admin/trek-routes/pending
  "/admin/trek-routes/pending": {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const limit = Number(url.searchParams.get("limit") ?? 50);
        const offset = Number(url.searchParams.get("offset") ?? 0);

        const routes = await listPendingTrekRoutes(limit, offset);
        return Response.json(routes);
      } catch (err: any) {
        return Response.json({ error: err.message || "Failed to list pending routes" }, { status: 500 });
      }
    },
  },

  // POST /admin/trek-routes/:id/verify
  "/admin/trek-routes/:id/verify": {
    POST: async (req: Request & { params: { id: string } }) => {
      try {
        const userId = (await verifyUser(req)) || "00000000-0000-0000-0000-000000000001"; // Fallback to system admin
        const body = await req.json().catch(() => ({}));
        const options = asVerifyTrekRoute(body);
        const result = await verifyTrekRoute(req.params.id, userId, options);
        return Response.json({ success: true, ...result });
      } catch (err: any) {
        const status = err.status || 400;
        return Response.json({ error: err.message || "Failed to verify route" }, { status });
      }
    },
  },

  // POST /admin/trek-routes/:id/reject
  "/admin/trek-routes/:id/reject": {
    POST: async (req: Request & { params: { id: string } }) => {
      try {
        const userId = (await verifyUser(req)) || "00000000-0000-0000-0000-000000000001"; // Fallback to system admin
        const body = await req.json().catch(() => ({}));
        const { rejectionReason } = asRejectTrekRoute(body);
        const result = await rejectTrekRoute(req.params.id, userId, rejectionReason);
        return Response.json({ success: true, ...result });
      } catch (err: any) {
        const status = err.status || 400;
        return Response.json({ error: err.message || "Failed to reject route" }, { status });
      }
    },
  },
};
