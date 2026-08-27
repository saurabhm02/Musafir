import { protectedRoute } from "../middleware/auth";
import {
  listCollections,
  getCollectionDetail,
  createCollection,
  updateCollection,
  deleteCollection,
  addPoiToCollection,
  removePoiFromCollection,
  reorderCollectionPois,
} from "../services/collections";

export const collectionsRoutes = {
  "/collections": {
    GET: protectedRoute(async (_req, userId) => Response.json(await listCollections(userId))),
    POST: protectedRoute(async (req, userId) => {
      const body = (await req.json()) as any;
      if (!body?.name || !body.name.trim()) {
        return Response.json({ error: "Collection name is required" }, { status: 400 });
      }
      return Response.json(await createCollection(userId, body));
    }),
  },
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
  "/collections/:id": {
    GET: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const col = await getCollectionDetail(userId, req.params.id);
      if (!col) return Response.json({ error: "Collection not found" }, { status: 404 });
      return Response.json(col);
    }),
    PATCH: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = (await req.json()) as any;
      const updated = await updateCollection(userId, req.params.id, body);
      if (!updated) return Response.json({ error: "Collection not found" }, { status: 404 });
      return Response.json(updated);
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
  "/collections/:id/pois": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = (await req.json()) as any;
      if (!body?.poiId) return Response.json({ error: "poiId is required" }, { status: 400 });
      const result = await addPoiToCollection(userId, req.params.id, body.poiId);
      return Response.json(result);
    }),
  },
  "/collections/:id/pois/:poiId": {
    DELETE: protectedRoute(async (req: Request & { params: { id: string; poiId: string } }, userId) => {
      const result = await removePoiFromCollection(userId, req.params.id, req.params.poiId);
      return Response.json(result);
    }),
  },
  "/collections/:id/reorder": {
    PUT: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = (await req.json()) as any;
      if (!Array.isArray(body?.poiIds)) {
        return Response.json({ error: "poiIds array is required" }, { status: 400 });
      }
      const result = await reorderCollectionPois(userId, req.params.id, body.poiIds);
      return Response.json({ success: result });
    }),
  },
  "/me/collections/:id/toggle-poi": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = (await req.json()) as any;
      if (!body?.poiId) return Response.json({ error: "poiId is required" }, { status: 400 });
      const col = await getCollectionDetail(userId, req.params.id);
      const isPresent = col?.pois.some((p) => p.id === body.poiId);
      if (isPresent) {
        await removePoiFromCollection(userId, req.params.id, body.poiId);
        return Response.json({ inCollection: false });
      } else {
        await addPoiToCollection(userId, req.params.id, body.poiId);
        return Response.json({ inCollection: true });
      }
    }),
  },
};
