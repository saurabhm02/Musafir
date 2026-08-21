import { verifyUser, protectedRoute } from "../middleware/auth";
import { listMemories, addMemory } from "../services/memories";
import { asAddMemory } from "../lib/validate";

export const memoriesRoutes = {
  "/pois/:id/memories": {
    GET: async (req: Request & { params: { id: string } }) => {
      const userId = await verifyUser(req);
      return Response.json(await listMemories(req.params.id, userId));
    },
  },
  "/memories": {
    POST: protectedRoute(async (req, userId) => {
      const body = asAddMemory(await req.json());
      await addMemory(body, userId);
      return Response.json({ ok: true });
    }),
  },
};
