import { protectedRoute } from "../middleware/auth";
import { searchRoute } from "../services/routeSearch";
import { asSearchRoute } from "../lib/validate";

export const routeSearchRoutes = {
  "/routes/search": {
    POST: protectedRoute(async (req, userId) => {
      const body = asSearchRoute(await req.json());
      const matchedSegments = await searchRoute(body, userId);
      return Response.json({ matchedSegments });
    }),
  },
};
