import { protectedRoute } from "../middleware/auth";
import {
  listTrips,
  createTrip,
  getTrip,
  updateTrip,
  deleteTrip,
  addTripStop,
  updateTripStop,
  deleteTripStop,
  optimizeTripDay,
} from "../services/trips";
import { asCreateTrip, asUpdateTrip, asAddTripStop, asUpdateTripStop } from "../lib/validate";

export const tripsRoutes = {
  "/trips": {
    GET: protectedRoute(async (_req, userId) => Response.json(await listTrips(userId))),
    POST: protectedRoute(async (req, userId) => {
      const body = asCreateTrip(await req.json());
      const id = await createTrip(body, userId);
      return Response.json({ id });
    }),
  },
  "/trips/:id": {
    GET: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const trip = await getTrip(req.params.id, userId);
      if (!trip) return Response.json({ error: "trip not found" }, { status: 404 });
      return Response.json(trip);
    }),
    PATCH: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = asUpdateTrip(await req.json());
      await updateTrip(req.params.id, body, userId);
      return Response.json({ ok: true });
    }),
    DELETE: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      await deleteTrip(req.params.id, userId);
      return Response.json({ ok: true });
    }),
  },
  "/trips/:id/stops": {
    POST: protectedRoute(async (req: Request & { params: { id: string } }, userId) => {
      const body = asAddTripStop(await req.json());
      const id = await addTripStop(req.params.id, body, userId);
      return Response.json({ id });
    }),
  },
  "/trips/:id/stops/:stopId": {
    PATCH: protectedRoute(async (req: Request & { params: { id: string; stopId: string } }, userId) => {
      const body = asUpdateTripStop(await req.json());
      await updateTripStop(req.params.id, req.params.stopId, body, userId);
      return Response.json({ ok: true });
    }),
    DELETE: protectedRoute(async (req: Request & { params: { id: string; stopId: string } }, userId) => {
      await deleteTripStop(req.params.id, req.params.stopId, userId);
      return Response.json({ ok: true });
    }),
  },
  "/trips/:id/days/:day/optimize": {
    POST: protectedRoute(async (req: Request & { params: { id: string; day: string } }, userId) => {
      const orderedStopIds = await optimizeTripDay(req.params.id, Number(req.params.day), userId);
      return Response.json({ orderedStopIds });
    }),
  },
};
