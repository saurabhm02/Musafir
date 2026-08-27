import { protectedRoute } from "../middleware/auth";
import {
  addWantToGo,
  removeWantToGo,
  listWantToGo,
  moveWantToGoToTrip,
} from "../services/wantToGo";

export const wantToGoRoutes = {
  "/want-to-go": {
    GET: protectedRoute(async (req, userId) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") || 30);
      const cursor = url.searchParams.get("cursor") || undefined;
      const res = await listWantToGo(userId, limit, cursor);
      return Response.json(res);
    }),
    POST: protectedRoute(async (req, userId) => {
      const body = (await req.json()) as { poiId?: string; notes?: string };
      if (!body?.poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }
      await addWantToGo(userId, body.poiId, body.notes);
      return Response.json({ success: true, poiId: body.poiId });
    }),
  },
  "/want-to-go/:poiId": {
    DELETE: protectedRoute(async (req, userId) => {
      const poiId = (req as any).params?.poiId;
      if (!poiId) {
        return Response.json({ error: "poiId is required" }, { status: 400 });
      }
      await removeWantToGo(userId, poiId);
      return Response.json({ success: true, poiId });
    }),
  },
  "/want-to-go/:poiId/move-to-trip": {
    POST: protectedRoute(async (req, userId) => {
      const poiId = (req as any).params?.poiId;
      const body = (await req.json()) as {
        tripId?: string;
        dayNumber?: number;
        removeAfterMove?: boolean;
      };
      if (!poiId || !body?.tripId || !body?.dayNumber) {
        return Response.json(
          { error: "poiId, tripId, and dayNumber are required" },
          { status: 400 },
        );
      }
      const res = await moveWantToGoToTrip(
        userId,
        poiId,
        body.tripId,
        body.dayNumber,
        body.removeAfterMove ?? true,
      );
      return Response.json({ success: true, stopId: res.stopId });
    }),
  },
};
