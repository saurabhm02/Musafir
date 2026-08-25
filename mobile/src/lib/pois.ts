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
  distance_km?: number;
};

export type PoiDetails = Poi & {
  address: string | null;
  tags: string[];
  metadata: {
    difficulty: string | null;
    distance_km: number | null;
    duration_hours: number | null;
    elevation_gain_m: number | null;
    max_elevation_m: number | null;
    best_time: string | null;
    starting_point: string | null;
    ending_point: string | null;
    state: string | null;
    district: string | null;
  } | null;
  photos: {
    id: string;
    url: string;
    source: string;
    attribution: string | null;
  }[];
  routes: {
    id: string;
    route_type: string;
    distance_km: number | null;
    elevation_gain_m: number | null;
    geometry: any;
  }[];
};

export type NearbyPoi = Poi & { distance_km: number };

// Server-side text search across all India POIs
export async function fetchSearchPois(
  query: string,
  category?: string,
  limit = 60,
  signal?: AbortSignal,
): Promise<Poi[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const catParam = category && category !== "all" ? `&category=${encodeURIComponent(category)}` : "";
  return api<Poi[]>(`/pois?q=${encodeURIComponent(cleanQ)}${catParam}&limit=${limit}`, { signal });
}

export async function fetchNearbyPois(
  lat: number,
  lon: number,
  radiusKm: number,
  category?: string,
  limit = 80,
  signal?: AbortSignal,
): Promise<NearbyPoi[]> {
  const catParam = category && category !== "all" ? `&category=${encodeURIComponent(category)}` : "";
  return api<NearbyPoi[]>(
    `/pois/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}${catParam}&limit=${limit}`,
    { signal },
  );
}

export async function fetchAllPois(q?: string): Promise<Poi[]> {
  return api<Poi[]>(q ? `/pois?q=${encodeURIComponent(q)}` : "/pois");
}

// Full POI details with photos, metadata, and routes
export async function fetchPoiDetails(id: string): Promise<PoiDetails> {
  return api<PoiDetails>(`/pois/${id}`);
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

// Returns only the POIs within maxKm of some point on the route
export function poisNearRoute(routeCoords: [number, number][], pois: Poi[], maxKm = 3): Poi[] {
  return pois.filter((poi) =>
    routeCoords.some((c) => haversineKm({ lat: c[1], lon: c[0] }, { lat: poi.lat, lon: poi.lon }) <= maxKm),
  );
}

// Create new POI
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
