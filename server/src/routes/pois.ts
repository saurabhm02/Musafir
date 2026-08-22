import { protectedRoute } from "../middleware/auth";
import { listPois, listPoisNearby, createPoi, getPoiDetails } from "../services/pois";
import { asCreatePoi } from "../lib/validate";

export const poisRoutes = {
  "/pois/:id": {
    GET: async (req: Request & { params: { id: string } }) => {
      const details = await getPoiDetails(req.params.id);
      if (!details) return Response.json({ error: "poi not found" }, { status: 404 });
      return Response.json(details);
    },
  },
  "/pois": {
    GET: async (req: Request) => Response.json(await listPois(new URL(req.url).searchParams.get("q") ?? undefined)),
    POST: protectedRoute(async (req, userId) => {
      const body = asCreatePoi(await req.json());
      const id = await createPoi(body, userId);
      return Response.json({ id });
    }),
  },
  "/pois/nearby": {
    GET: async (req: Request) => {
      const params = new URL(req.url).searchParams;
      const lat = Number(params.get("lat"));
      const lon = Number(params.get("lon"));
      const radiusKm = Number(params.get("radiusKm") ?? "25");
      const category = params.get("category") ?? undefined;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Response.json({ error: "lat/lon must be numbers" }, { status: 400 });
      if (!Number.isFinite(radiusKm) || radiusKm <= 0) return Response.json({ error: "radiusKm must be a positive number" }, { status: 400 });
      return Response.json(await listPoisNearby(lat, lon, radiusKm, category));
    },
  },
};
