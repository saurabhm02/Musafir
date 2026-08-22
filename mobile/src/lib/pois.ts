import { api } from "./api";
import { compressImage, uploadToStorage } from "./imageUpload";

export type Poi = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_verified: boolean;
  lat: number;
  lon: number;
  photo_url: string | null;
  avg_rating: number | string | null;
  total_ratings: number | null;
  best_time: string | null;
};

// Input: an optional text query
// Output: every POI in the database (or a name/description/category match), with its cover photo if one exists
// ponytail: fetches all POIs and filters near the route in JS. Fine at
// seed-data scale; move the "near this route" check into a PostGIS RPC
// once POI count is too big to ship to the client whole.
export async function fetchAllPois(q?: string): Promise<Poi[]> {
  return api<Poi[]>(q ? `/pois?q=${encodeURIComponent(q)}` : "/pois");
}

export type NearbyPoi = Poi & { distance_km: number };

// Input: a device coordinate + search radius in km
// Output: POIs within that radius, nearest-first -- backs Explore's "Nearby" toggle
export async function fetchNearbyPois(lat: number, lon: number, radiusKm: number): Promise<NearbyPoi[]> {
  return api<NearbyPoi[]>(`/pois/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}`);
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

// Input: a route's coordinates and the full POI list
// Output: only the POIs within 3km of some point on the route
export function poisNearRoute(routeCoords: [number, number][], pois: Poi[], maxKm = 3): Poi[] {
  return pois.filter((poi) =>
    routeCoords.some((c) => haversineKm({ lat: c[1], lon: c[0] }, { lat: poi.lat, lon: poi.lon }) <= maxKm),
  );
}

// Input: a new POI's name/category/coordinates + an optional photo file uri
// Output: the created POI's id
export async function createPoi(input: {
  name: string;
  category: string;
  lat: number;
  lon: number;
  photoUri?: string;
}): Promise<string> {
  let photoUrl: string | undefined;
  if (input.photoUri) {
    const compressed = await compressImage(input.photoUri);
    photoUrl = await uploadToStorage(`poi-photos/new/${Date.now()}.jpg`, compressed);
  }
  const { id } = await api<{ id: string }>("/pois", {
    method: "POST",
    body: JSON.stringify({ name: input.name, category: input.category, lat: input.lat, lon: input.lon, photoUrl }),
  });
  return id;
}
