import { protectedRoute } from "../middleware/auth";
import { listPois, listPoisNearby, createPoi, getPoiDetails } from "../services/pois";
import { asCreatePoi } from "../lib/validate";

// Simple in-memory rate limiter per IP (max 60 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// Clean up stale rate-limit keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 120000);

export const poisRoutes = {
  "/pois/:id": {
    GET: async (req: Request & { params: { id: string } }) => {
      const details = await getPoiDetails(req.params.id);
      if (!details) return Response.json({ error: "poi not found" }, { status: 404 });
      return Response.json(details);
    },
  },
  "/pois": {
    GET: async (req: Request) => {
      const clientIp = req.headers.get("x-forwarded-for") || "client";
      if (!checkRateLimit(clientIp, 60)) {
        return Response.json({ error: "Too many search requests. Please slow down." }, { status: 429 });
      }

      const params = new URL(req.url).searchParams;
      const q = params.get("q") ?? undefined;
      const category = params.get("category") ?? undefined;
      const limit = Number(params.get("limit") ?? "60");
      const offset = Number(params.get("offset") ?? "0");

      // Minimum query length protection
      if (q !== undefined && q.trim().length > 0 && q.trim().length < 2) {
        return Response.json([]);
      }

      return Response.json(await listPois(q, category, limit, offset));
    },
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
      const radiusKm = Number(params.get("radiusKm") ?? "50");
      const category = params.get("category") ?? undefined;
      const limit = Number(params.get("limit") ?? "80");
      const offset = Number(params.get("offset") ?? "0");

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return Response.json({ error: "lat/lon must be numbers" }, { status: 400 });
      }
      if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
        return Response.json({ error: "radiusKm must be a positive number" }, { status: 400 });
      }

      return Response.json(await listPoisNearby(lat, lon, radiusKm, category, limit, offset));
    },
  },
};
