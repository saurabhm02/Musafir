import { api } from "./api";

export type Route = {
  coordinates: [number, number][]; // [lng, lat]
  distanceKm: number;
  durationMin: number;
};

// Input: origin/destination coordinates
// Output: the driving route between them (path, distance, duration)
// ponytail: uses OSRM's free public demo server, fine for MVP traffic.
// Self-host OSRM (or switch to a paid routing API) once usage grows.
// Stays a direct client call -- OSRM is a public routing service, not our database.
export async function fetchRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
): Promise<Route> {
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`routing failed: ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("no route found between these places");
  return {
    coordinates: route.geometry.coordinates,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

// Input: an ordered list of stop coordinates (2+)
// Output: one combined route threading through every stop in order
// Same OSRM call as fetchRoute, just with more than two coordinates --
// used to draw a trip day's full route through all its stops at once.
export async function fetchWaypointRoute(points: { lat: number; lon: number }[]): Promise<Route> {
  if (points.length < 2) throw new Error("need at least 2 points for a route");
  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`routing failed: ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("no route found between these stops");
  return {
    coordinates: route.geometry.coordinates,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

// Input: a route + where it's going
// Output: how many 500m pieces of it were already mapped by an earlier search
// The server saves the route and runs the overlap check (see server/src/routeSearch.ts)
export async function saveRouteAndCheckOverlap(route: Route, originText: string, destText: string): Promise<number> {
  const { matchedSegments } = await api<{ matchedSegments: number }>("/routes/search", {
    method: "POST",
    body: JSON.stringify({
      coordinates: route.coordinates,
      origin: originText,
      destination: destText,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
    }),
  });
  return matchedSegments;
}
