import { verifyUser, protectedRoute } from "../middleware/auth";
import {
  initiateMemoryUpload,
  completeMemoryUpload,
  listPoiMemories,
  listUserMemories,
  listTrekMemories,
  getMemoryById,
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
    GET: async (req: Request & { params: { id: string } }) => {
      try {
        const userId = await verifyUser(req);
        const memory = await getMemoryById(req.params.id, userId);
        if (!memory) {
          return Response.json({ error: "Memory not found" }, { status: 404 });
        }
        return Response.json(memory);
      } catch (err: any) {
        const status = err.message?.includes("Unauthorized") ? 403 : 400;
        return Response.json({ error: err.message || "Failed to get memory" }, { status });
      }
    },
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
  "/treks/:id/memories": {
    GET: async (req: Request & { params: { id: string } }) => {
      try {
        const userId = await verifyUser(req);
        const url = new URL(req.url);
        const limit = Number(url.searchParams.get("limit") ?? 50);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const routeId = url.searchParams.get("routeId") || undefined;
        const type = (url.searchParams.get("type") as any) || undefined;
        const time = (url.searchParams.get("time") as any) || undefined;
        const sortBy = (url.searchParams.get("sortBy") as any) || undefined;

        let bbox: [number, number, number, number] | undefined;
        const bboxParam = url.searchParams.get("bbox");
        if (bboxParam) {
          const parts = bboxParam.split(",").map(Number);
          if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
            bbox = [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
          }
        }

        const result = await listTrekMemories(req.params.id, userId, {
          routeId,
          bbox,
          type,
          time,
          sortBy,
          limit,
          offset,
        });
        return Response.json(result);
      } catch (err: any) {
        return Response.json({ error: err.message || "Failed to list trek memories" }, { status: 400 });
      }
    },
  },
};
