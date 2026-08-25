import { protectedRoute } from "../middleware/auth";
import { getPoiStatusMap, getPoiStatusCounts, getPoiStatusPlaces, setPoiStatus } from "../services/poiStatus";
import { asSetPoiStatus } from "../lib/validate";

export const poiStatusRoutes = {
  "/me/poi-status": {
    GET: protectedRoute(async (_req, userId) => Response.json(await getPoiStatusMap(userId))),
  },
  "/me/poi-status/counts": {
    GET: protectedRoute(async (_req, userId) => Response.json(await getPoiStatusCounts(userId))),
  },
  "/me/poi-status/places": {
    GET: protectedRoute(async (req, userId) => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") ?? undefined;
      return Response.json(await getPoiStatusPlaces(userId, status));
    }),
  },
  "/pois/:id/status": {
    PUT: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const { status } = asSetPoiStatus(await req.json());
      await setPoiStatus(req.params.id, status, userId);
      return Response.json({ ok: true });
    }),
  },
};
