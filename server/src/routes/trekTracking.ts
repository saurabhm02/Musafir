import { protectedRoute } from "../middleware/auth";
import { TrekTrackingService, type TrackPointInput } from "../services/trekTracking";

export const trekTrackingRoutes = {
  /**
   * Endpoint: POST /trek-sessions
   * Starts a new persistent trek tracking session for the authenticated user.
   *
   * @example
   * // HTTP Request:
   * // POST /trek-sessions
   * // Body: { "trekId": "7a35cb99...", "trekRouteId": "c1f7a08b...", "startLat": 31.5348, "startLon": 77.3780 }
   *
   * // Response (201 Created):
   * // { "id": "sess_8a21f03d...", "status": "active", "actualDistanceKm": 0, "pointsCount": 1 }
   */
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

  /**
   * Endpoint: GET /trek-sessions/active
   * Recovers the user's currently active or paused hike session on app restart.
   *
   * @example
   * // HTTP Request:
   * // GET /trek-sessions/active
   *
   * // Response (200 OK):
   * // { "session": { "id": "sess_8a21f03d...", "status": "active", "actualDistanceKm": 1.8 } }
   */
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

  /**
   * Endpoint: GET /trek-sessions/:id
   * Fetches full details, recorded GPS track points, and photo memories for a trek session.
   *
   * @example
   * // HTTP Request:
   * // GET /trek-sessions/sess_8a21f03d...
   *
   * // Response (200 OK):
   * // { "id": "sess_8a21f03d...", "status": "completed", "actualDistanceKm": 3.85, "points": [ ... ] }
   */
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

  /**
   * Endpoint: POST /trek-sessions/:id/points
   * Ingests a batch of GPS track points recorded on the trail with deduplication.
   *
   * @example
   * // HTTP Request:
   * // POST /trek-sessions/sess_8a21f03d.../points
   * // Body: { "points": [ { "lat": 31.5348, "lon": 77.3780, "altitude": 3120, "sequence": 1, "timestamp": "..." } ] }
   *
   * // Response (200 OK):
   * // { "id": "sess_8a21f03d...", "actualDistanceKm": 0.45, "pointsCount": 3 }
   */
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
