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
  // GET /treks
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

  // GET /treks/:id
  "/treks/:id": {
    GET: async (req: Request & { params: { id: string } }) => {
      const trek = await getTrekById(req.params.id);
      if (!trek) {
        return Response.json({ error: "Trek not found" }, { status: 404 });
      }
      return Response.json(trek);
    },
  },

  // GET /treks/:id/offline-package
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
