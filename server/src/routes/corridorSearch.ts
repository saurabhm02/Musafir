import { verifyUser } from "../middleware/auth";
import { searchRouteCorridor, type CorridorSearchInput } from "../services/corridorSearch";

export const corridorSearchRoutes = {
  "/routes/corridor-search": {
    POST: async (req: Request) => {
      try {
        const body = (await req.json()) as CorridorSearchInput;

        if (
          !body.origin ||
          typeof body.origin.lat !== "number" ||
          typeof body.origin.lon !== "number" ||
          !body.destination ||
          typeof body.destination.lat !== "number" ||
          typeof body.destination.lon !== "number"
        ) {
          return new Response(JSON.stringify({ error: "Invalid origin or destination coordinates" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const userId = (await verifyUser(req)) ?? undefined;
        const result = await searchRouteCorridor(body, userId);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Corridor search route error:", err);
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : "Internal corridor search error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },
  },
};
