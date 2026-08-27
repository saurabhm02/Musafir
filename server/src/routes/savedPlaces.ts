import { protectedRoute } from "../middleware/auth";
import { savePoi, unsavePoi, listSavedPois } from "../services/savedPlaces";

export const savedPlacesRoutes = {
  "/saved": {
    GET: protectedRoute(async (req, userId) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") || 30);
      const cursor = url.searchParams.get("cursor") || undefined;
      const res = await listSavedPois(userId, limit, cursor);
      return Response.json(res);
    }),
    POST: protectedRoute(async (req, userId) => {
      const body = (await req.json()) as { poiId?: string };
      if (!body?.poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }
      await savePoi(userId, body.poiId);
      return Response.json({ success: true, poiId: body.poiId });
    }),
  },
  "/saved/:poiId": {
    DELETE: protectedRoute(async (req, userId) => {
      const poiId = (req as any).params?.poiId;
      if (!poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }
      await unsavePoi(userId, poiId);
      return Response.json({ success: true, poiId });
    }),
  },
};
