import { protectedRoute } from "../middleware/auth";
import {
  recordPoiVisit,
  deletePoiVisit,
  listVisitedPois,
  getPoiVisitHistory,
} from "../services/visitedPois";

export const visitedPoisRoutes = {
  "/visited": {
    GET: protectedRoute(async (req, userId) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") || 30);
      const cursor = url.searchParams.get("cursor") || undefined;
      const res = await listVisitedPois(userId, limit, cursor);
      return Response.json(res);
    }),
    POST: protectedRoute(async (req, userId) => {
      const body = (await req.json()) as {
        poiId?: string;
        tripId?: string;
        source?: "manual" | "trip_gps";
        visitedAt?: string;
      };
      if (!body?.poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }
      const visitId = await recordPoiVisit(userId, {
        poiId: body.poiId,
        tripId: body.tripId,
        source: body.source,
        visitedAt: body.visitedAt,
      });
      return Response.json({ success: true, visitId });
    }),
  },
  "/visited/:visitId": {
    DELETE: protectedRoute(async (req, userId) => {
      const visitId = (req as any).params?.visitId;
      if (!visitId) {
        return Response.json({ error: "visitId is required" }, { status: 400 });
      }
      await deletePoiVisit(userId, visitId);
      return Response.json({ success: true, visitId });
    }),
  },
  "/visited/poi/:poiId/history": {
    GET: protectedRoute(async (req, userId) => {
      const poiId = (req as any).params?.poiId;
      if (!poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }
      const history = await getPoiVisitHistory(userId, poiId);
      return Response.json(history);
    }),
  },
};
