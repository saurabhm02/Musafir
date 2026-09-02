import { protectedRoute } from "../middleware/auth";
import { TrekTrackingService, type TrackPointInput } from "../services/trekTracking";

export const trekTrackingRoutes = {
  "/trek-sessions": {
    POST: protectedRoute(async (req, userId) => {
      try {
        const body: any = await req.json();
        if (!body || !body.trekId) {
          return Response.json({ error: "trekId is required" }, { status: 400 });
        }
        const session = await TrekTrackingService.startSession(userId, body);
        return Response.json(session, { status: 201 });
      } catch (err: any) {
        const status = err.message?.includes("not found") ? 404 : 400;
        return Response.json({ error: err.message }, { status });
      }
    }),
  },

  "/trek-sessions/active": {
    GET: protectedRoute(async (_req, userId) => {
      try {
        const session = await TrekTrackingService.getActiveSession(userId);
        return Response.json({ session });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }),
  },

  "/trek-sessions/:id": {
    GET: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const session = await TrekTrackingService.getSession(userId, req.params.id);
        if (!session) {
          return Response.json({ error: "Trek session not found" }, { status: 404 });
        }
        return Response.json(session);
      } catch (err: any) {
        const status = err.message?.includes("Unauthorized") ? 403 : 400;
        return Response.json({ error: err.message }, { status });
      }
    }),
  },

  "/trek-sessions/:id/points": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const body: any = await req.json();
        const points: TrackPointInput[] = Array.isArray(body?.points) ? body.points : [];
        const session = await TrekTrackingService.recordPoints(userId, req.params.id, points);
        return Response.json(session);
      } catch (err: any) {
        const status = err.message?.includes("not found")
          ? 404
          : err.message?.includes("Unauthorized")
          ? 403
          : 400;
        return Response.json({ error: err.message }, { status });
      }
    }),
  },

  "/trek-sessions/:id/pause": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const session = await TrekTrackingService.pauseSession(userId, req.params.id);
        return Response.json(session);
      } catch (err: any) {
        const status = err.message?.includes("Unauthorized") ? 403 : 400;
        return Response.json({ error: err.message }, { status });
      }
    }),
  },

  "/trek-sessions/:id/resume": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const session = await TrekTrackingService.resumeSession(userId, req.params.id);
        return Response.json(session);
      } catch (err: any) {
        const status = err.message?.includes("Unauthorized") ? 403 : 400;
        return Response.json({ error: err.message }, { status });
      }
    }),
  },

  "/trek-sessions/:id/complete": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      try {
        const session = await TrekTrackingService.completeSession(userId, req.params.id);
        return Response.json(session);
      } catch (err: any) {
        const status = err.message?.includes("Unauthorized") ? 403 : 400;
        return Response.json({ error: err.message }, { status });
      }
    }),
  },
};
