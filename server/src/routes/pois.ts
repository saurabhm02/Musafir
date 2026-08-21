import { protectedRoute } from "../middleware/auth";
import { listPois, createPoi } from "../services/pois";
import { asCreatePoi } from "../lib/validate";

export const poisRoutes = {
  "/pois": {
    GET: async () => Response.json(await listPois()),
    POST: protectedRoute(async (req, userId) => {
      const body = asCreatePoi(await req.json());
      const id = await createPoi(body, userId);
      return Response.json({ id });
    }),
  },
};
