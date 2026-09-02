import { protectedRoute, verifyUser } from "../middleware/auth";
import { listTreks, getTrekById } from "../services/treks";
import {
  listRoutesForTrek,
  getTrekRouteById,
  createCommunityRoute,
  updateCommunityRoute,
  deleteTrekRoute,
} from "../services/trekRoutes";
import {
  asSubmitTrekRoute,
  asUpdateTrekRoute,
} from "../lib/validate";
import { getOfflineTrekPackage } from "../services/offlineTrekPackage";

export const treksRoutes = {
  /**
   * Endpoint: GET /treks
   * Returns a paginated list of mountain treks with optional search keywords, region, and difficulty grade.
   *
   * @example
   * // HTTP Request:
   * // GET /treks?q=fort&region=Himachal%20Pradesh&difficulty=moderate&limit=10&offset=0
   *
   * // Response (200 OK):
   * // [ { "id": "7a35cb99...", "name": "Raghupur Fort Trek", "difficulty": "moderate", "routesCount": 2 } ]
   */
  "/treks": {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q") ?? undefined;
      const region = url.searchParams.get("region") ?? undefined;
      const difficulty = url.searchParams.get("difficulty") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const offset = Number(url.searchParams.get("offset") ?? 0);

      const items = await listTreks({ q, region, difficulty, limit, offset });
      return Response.json(items);
    },
  },

  /**
   * Endpoint: GET /treks/:id
   * Fetches full trek details, verified routes, and top waypoints by trek UUID or URL slug.
   *
   * @example
   * // HTTP Request:
   * // GET /treks/raghupur-fort-trek
   *
   * // Response (200 OK):
   * // { "id": "7a35cb99...", "name": "Raghupur Fort Trek", "primaryRoute": { ... } }
   */
  "/treks/:id": {
    GET: async (req: Request & { params: { id: string } }) => {
      const trek = await getTrekById(req.params.id);
      if (!trek) {
        return Response.json({ error: "Trek not found" }, { status: 404 });
      }
      return Response.json(trek);
    },
  },

  /**
   * Endpoint: GET /treks/:id/offline-package
   * Downloads a lightweight self-contained offline package bundle for offline trail navigation.
   *
   * @example
   * // HTTP Request:
   * // GET /treks/raghupur-fort-trek/offline-package?routeId=c1f7a08b-2401-4ec9-8664-8830768e7ec8
   *
   * // Response (200 OK):
   * // { "packageVersion": "pkg_v1_c1f7a08b_...", "sizeEstimateBytes": 124500, "route": { ... }, "mapBoundary": { ... } }
   */
  "/treks/:id/offline-package": {
    GET: async (req: Request & { params: { id: string } }) => {
      try {
        const url = new URL(req.url);
        const routeId = url.searchParams.get("routeId") ?? undefined;
        const pkg = await getOfflineTrekPackage(req.params.id, routeId);
        return Response.json(pkg);
      } catch (err: any) {
        const status = err.status || 500;
        return Response.json({ error: err.message || "Failed to generate offline package" }, { status });
      }
    },
  },

  // GET /treks/:id/routes & POST /treks/:id/routes
  "/treks/:id/routes": {
    GET: async (req: Request & { params: { id: string } }) => {
      try {
        const url = new URL(req.url);
        const includeUnverified = url.searchParams.get("includeUnverified") === "true";
        const userId = await verifyUser(req);

        const routes = await listRoutesForTrek(req.params.id, {
          includeUnverified,
          userId: userId || undefined,
        });

        return Response.json(routes);
      } catch (err: any) {
        const status = err.status || 500;
        return Response.json({ error: err.message || "Failed to list routes" }, { status });
      }
    },
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId: string) => {
      const body = await req.json();
      const input = asSubmitTrekRoute(body);
      const routeId = await createCommunityRoute(req.params.id, input, userId);
      return Response.json({ id: routeId, message: "Route submitted successfully for verification" }, { status: 201 });
    }),
  },

  // GET /trek-routes/:id, PATCH /trek-routes/:id, DELETE /trek-routes/:id
  "/trek-routes/:id": {
    GET: async (req: Request & { params: { id: string } }) => {
      try {
        const userId = await verifyUser(req);
        const route = await getTrekRouteById(req.params.id, { userId: userId || undefined });
        if (!route) {
          return Response.json({ error: "Route not found" }, { status: 404 });
        }
        return Response.json(route);
      } catch (err: any) {
        const status = err.status || 500;
        return Response.json({ error: err.message || "Failed to get route" }, { status });
      }
    },
    PATCH: protectedRoute(async (req: Request & { params: { id: string } }, userId: string) => {
      const body = await req.json();
      const input = asUpdateTrekRoute(body);
      await updateCommunityRoute(req.params.id, input, userId);
      return Response.json({ success: true, message: "Route updated successfully" });
    }),
    DELETE: protectedRoute(async (req: Request & { params: { id: string } }, userId: string) => {
      await deleteTrekRoute(req.params.id, userId);
      return Response.json({ success: true, message: "Route deleted successfully" });
    }),
  },
};
