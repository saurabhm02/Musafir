import { api } from "./api";
import type { Poi } from "./pois";

export type VerificationStatus =
  | "musafir_verified"
  | "community_verified"
  | "pending"
  | "rejected";

export type RouteConfidence = "high" | "medium" | "low" | "unverified";

export interface TrekWaypoint {
  id?: number | string;
  name: string;
  type: "trailhead" | "water" | "campsite" | "shelter" | "viewpoint" | "peak" | "pass" | string;
  lat: number;
  lng: number;
  tags?: Record<string, any>;
}

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevationM: number;
}

export interface TrekRouteItem {
  id: string;
  trekId: string;
  name: string;
  routeType: string;
  distanceKm: number | null;
  elevationGainM: number | null;
  elevationLossM: number | null;
  minElevationM: number | null;
  maxElevationM: number | null;
  startPointName: string | null;
  endPointName: string | null;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  } | null;
  startLocation: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  endLocation: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  waypoints: TrekWaypoint[];
  elevationProfile: ElevationPoint[];
  source: {
    type: string;
    id: string | null;
    url: string | null;
    license: string;
  };
  verificationStatus: VerificationStatus;
  confidence: RouteConfidence;
  submittedBy?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrekListItem {
  id: string;
  poiId: string;
  name: string;
  slug: string;
  region: string | null;
  difficulty: string | null;
  summary: string | null;
  bestMonths: number[];
  lat: number;
  lon: number;
  coverPhoto: string | null;
  routesCount: number;
  primaryRoute: {
    id: string;
    name: string;
    distanceKm: number | null;
    elevationGainM: number | null;
    maxElevationM: number | null;
    verificationStatus: VerificationStatus;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrekDetailsData {
  id: string;
  poiId: string;
  name: string;
  slug: string;
  region: string | null;
  difficulty: string | null;
  summary: string | null;
  bestMonths: number[];
  coordinates: {
    lat: number;
    lon: number;
  };
  rating: {
    avg: number;
    count: number;
  };
  address: string | null;
  photos: {
    id: string;
    url: string;
    attribution: string | null;
    source: string;
    license: string | null;
  }[];
  memories: {
    id: string;
    photo_url: string;
    caption: string | null;
    taken_at: string | null;
    trek_route_id: string | null;
  }[];
  routes: TrekRouteItem[];
  createdAt: string;
  updatedAt: string;
}

export interface NearbyTrekItem {
  id: string;
  poiId: string;
  name: string;
  slug?: string;
  distanceKm: number | null;
  difficulty: string | null;
  distanceFromPlaceKm: number;
  ratingAvg: number;
  ratingCount: number;
  photoUrl: string | null;
  region?: string | null;
}

export async function fetchTreks(params?: {
  q?: string;
  region?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}): Promise<TrekListItem[]> {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.region) query.set("region", params.region);
  if (params?.difficulty) query.set("difficulty", params.difficulty);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const qs = query.toString();
  return api<TrekListItem[]>(`/treks${qs ? `?${qs}` : ""}`);
}

export async function fetchTrekById(idOrSlug: string): Promise<TrekDetailsData> {
  return api<TrekDetailsData>(`/treks/${encodeURIComponent(idOrSlug)}`);
}

export async function fetchTrekRoutes(
  trekId: string,
  includeUnverified = false
): Promise<TrekRouteItem[]> {
  const qs = includeUnverified ? "?includeUnverified=true" : "";
  return api<TrekRouteItem[]>(`/treks/${encodeURIComponent(trekId)}/routes${qs}`);
}

export async function fetchTrekRouteById(routeId: string): Promise<TrekRouteItem> {
  return api<TrekRouteItem>(`/trek-routes/${encodeURIComponent(routeId)}`);
}

// Fetch nearby treks relative to a destination POI (e.g. Jibhi)
export async function fetchNearbyTreks(
  lat: number,
  lon: number,
  radiusKm = 50,
  limit = 10
): Promise<NearbyTrekItem[]> {
  try {
    const nearbyPois = await api<
      Array<{
        id: string;
        name: string;
        category: string;
        lat: number;
        lon: number;
        avg_rating: number | string | null;
        total_ratings: number | null;
        photo_url: string | null;
        distance_km: number;
      }>
    >(`/pois/nearby?lat=${lat}&lon=${lon}&radiusKm=${radiusKm}&category=trek&limit=${limit}`);

    // Match with seeded treks for richer metadata
    const allTreks = await fetchTreks({ limit: 50 });
    const treksByPoiId = new Map(allTreks.map((t) => [t.poiId, t]));
    const treksByName = new Map(allTreks.map((t) => [t.name.toLowerCase(), t]));

    return nearbyPois.map((p) => {
      const matchedTrek =
        treksByPoiId.get(p.id) ||
        treksByName.get(p.name.toLowerCase()) ||
        treksByName.get(p.name.toLowerCase().replace(" trek", ""));

      return {
        id: matchedTrek?.id || p.id,
        poiId: p.id,
        name: p.name,
        slug: matchedTrek?.slug,
        distanceKm: matchedTrek?.primaryRoute?.distanceKm ?? null,
        difficulty: matchedTrek?.difficulty ?? "Moderate",
        distanceFromPlaceKm: Number(p.distance_km.toFixed(1)),
        ratingAvg: Number(p.avg_rating ?? 4.6),
        ratingCount: p.total_ratings || 128,
        photoUrl: p.photo_url || matchedTrek?.coverPhoto || null,
        region: matchedTrek?.region || null,
      };
    });
  } catch {
    return [];
  }
}
