import { protectedRoute } from "../middleware/auth";
import { getPoiStatusMap, getPoiStatusCounts, setPoiStatus } from "../services/poiStatus";
import { asSetPoiStatus } from "../lib/validate";

export const poiStatusRoutes = {
  "/me/poi-status": {
    GET: protectedRoute(async (_req, userId) => Response.json(await getPoiStatusMap(userId))),
  },
  "/me/poi-status/counts": {
    GET: protectedRoute(async (_req, userId) => Response.json(await getPoiStatusCounts(userId))),
  },
  "/pois/:id/status": {
    PUT: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const { status } = asSetPoiStatus(await req.json());
      await setPoiStatus(req.params.id, status, userId);
      return Response.json({ ok: true });
    }),
  },
};
