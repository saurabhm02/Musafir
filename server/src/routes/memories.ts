import { verifyUser, protectedRoute } from "../middleware/auth";
import {
  initiateMemoryUpload,
  completeMemoryUpload,
  listPoiMemories,
  listUserMemories,
  updateMemory,
  deleteMemory,
} from "../services/memories";

export const memoriesRoutes = {
  "/memories/upload": {
    POST: protectedRoute(async (req, userId) => {
      try {
        const body = (await req.json()) as any;
        const result = await initiateMemoryUpload(userId, body);
        return Response.json(result);
      } catch (err: any) {
        return Response.json({ error: err.message || "Failed to initiate memory upload" }, { status: 400 });
      }
    }),
  },
  "/memories/:id/complete": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const result = await completeMemoryUpload(userId, req.params.id);
        return Response.json(result);
      } catch (err: any) {
        return Response.json({ error: err.message || "Failed to complete upload" }, { status: 400 });
      }
    }),
  },
  "/memories/:id": {
    PATCH: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const body = (await req.json()) as any;
        const result = await updateMemory(userId, req.params.id, body);
        return Response.json(result);
      } catch (err: any) {
        return Response.json({ error: err.message || "Failed to update memory" }, { status: 400 });
      }
    }),
    DELETE: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const ok = await deleteMemory(userId, req.params.id);
        if (!ok) return Response.json({ error: "Memory not found or access denied" }, { status: 404 });
        return Response.json({ ok: true });
      } catch (err: any) {
        return Response.json({ error: err.message || "Failed to delete memory" }, { status: 400 });
      }
    }),
  },
  "/memories/me": {
    GET: protectedRoute(async (req, userId) => {
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 30);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const result = await listUserMemories(userId, limit, offset);
      return Response.json(result);
    }),
  },
  "/pois/:id/memories": {
    GET: async (req: Request & { params: { id: string } }) => {
      const userId = await verifyUser(req);
      const url = new URL(req.url);
      const limit = Number(url.searchParams.get("limit") ?? 30);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const result = await listPoiMemories(req.params.id, userId, limit, offset);
      return Response.json(result);
    },
  },
};
