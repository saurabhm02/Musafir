import { protectedRoute } from "../middleware/auth";
import {
  listCollections,
  getCollectionDetail,
  createCollection,
  updateCollection,
  deleteCollection,
  togglePoiInCollection,
} from "../services/collections";

export const collectionsRoutes = {
  "/me/collections": {
    GET: protectedRoute(async (_req, userId) => Response.json(await listCollections(userId))),
    POST: protectedRoute(async (req, userId) => {
      const body = (await req.json()) as any;
      if (!body?.name || !body.name.trim()) {
        return Response.json({ error: "Collection name is required" }, { status: 400 });
      }
      return Response.json(await createCollection(userId, body));
    }),
  },
  "/me/collections/:id": {
    GET: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const col = await getCollectionDetail(userId, req.params.id);
      if (!col) return Response.json({ error: "Collection not found" }, { status: 404 });
      return Response.json(col);
    }),
    PUT: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = (await req.json()) as any;
      const updated = await updateCollection(userId, req.params.id, body);
      if (!updated) return Response.json({ error: "Collection not found" }, { status: 404 });
      return Response.json(updated);
    }),
    DELETE: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const deleted = await deleteCollection(userId, req.params.id);
      return Response.json({ ok: deleted });
    }),
  },
  "/me/collections/:id/toggle-poi": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = (await req.json()) as any;
      if (!body?.poiId) return Response.json({ error: "poiId is required" }, { status: 400 });
      const result = await togglePoiInCollection(userId, req.params.id, body.poiId);
      return Response.json(result);
    }),
  },
};
