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
};

// Input: nothing
// Output: every POI in the database, with its cover photo if one exists
// ponytail: fetches all POIs and filters near the route in JS. Fine at
// seed-data scale; move the "near this route" check into a PostGIS RPC
// once POI count is too big to ship to the client whole.
export async function fetchAllPois(): Promise<Poi[]> {
  return api<Poi[]>("/pois");
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
