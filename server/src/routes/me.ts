import { protectedRoute } from "../middleware/auth";
import { getStats } from "../services/me";

export const meRoutes = {
  "/me/stats": {
    GET: protectedRoute(async (_req, userId) => Response.json(await getStats(userId))),
  },
};
