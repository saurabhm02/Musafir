import { asDiscoverJourneysInput } from "../lib/validate";
import { discoverJourneys } from "../services/transport/journeyDiscovery";

export const journeysRoutes = {
  // POST /journeys/discover
  "/journeys/discover": {
    POST: async (req: Request) => {
      try {
        const body = await req.json();
        const input = asDiscoverJourneysInput(body);
        const result = await discoverJourneys(input);
        return Response.json(result);
      } catch (err: any) {
        const status = err.status || 400;
        return Response.json({ error: err.message || "Failed to discover journeys" }, { status });
      }
    },
  },
};
