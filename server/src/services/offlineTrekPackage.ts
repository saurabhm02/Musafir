import { db } from "../lib/db";
import { getTrekById } from "./treks";

export interface OfflineWaypoint {
  id: number | string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  tags?: {
    ele?: number;
    description?: string;
  };
}

export interface OfflineMemoryMeta {
  id: string;
  thumbnailUrl: string;
  photoUrl: string;
  caption: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
  authorName: string;
  authorAvatarUrl: string | null;
  likesCount: number;
  createdAt: string;
}

export interface OfflineMapBoundary {
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number]; // [lon, lat]
  defaultZoom: number;
  styleUrl: string;
  offlineResourceBundle: {
    requiredTileBbox: [number, number, number, number];
    minZoom: number;
    maxZoom: number;
  };
}

export interface OfflineTrekPackage {
  packageVersion: string;
  generatedAt: string;
  sizeEstimateBytes: number;
  trek: {
    id: string;
    name: string;
    slug: string;
    summary: string | null;
    difficulty: string | null;
    region: string | null;
    bestMonths: number[];
    coverPhoto: string | null;
    lat: number;
    lon: number;
  };
  route: {
    id: string;
    name: string;
    routeType: string | null;
    verificationStatus: string;
    distanceKm: number | null;
    elevationGainM: number | null;
    elevationLossM: number | null;
    minElevationM: number | null;
    maxElevationM: number | null;
    startPointName: string | null;
    endPointName: string | null;
    trailheadLat: number | null;
    trailheadLon: number | null;
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    } | null;
    waypoints: OfflineWaypoint[];
    elevationProfile: Array<{ distanceKm: number; elevationM: number }>;
    updatedAt: string;
  };
  waypoints: OfflineWaypoint[];
  memories: OfflineMemoryMeta[];
  mapBoundary: OfflineMapBoundary;
}

/**
 * Generates a lightweight, self-contained offline package bundle for a verified trek route,
 * including PostGIS LineString geometry, elevation profile, waypoints, and map bounding box.
 *
 * @example
 * // 1. Input:
 * const trekIdOrSlug = "raghupur-fort-trek";
 * const routeId = "c1f7a08b-2401-4ec9-8664-8830768e7ec8";
 *
 * // 2. HTTP Request:
 * // GET /treks/raghupur-fort-trek/offline-package?routeId=c1f7a08b-2401-4ec9-8664-8830768e7ec8
 *
 * // 3. What the Server returns:
 * {
 *   "packageVersion": "pkg_v1_c1f7a08b_1725283800000",
 *   "sizeEstimateBytes": 124500,
 *   "trek": {
 *     "id": "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *     "name": "Raghupur Fort Trek",
 *     "slug": "raghupur-fort-trek",
 *     "difficulty": "moderate",
 *     "region": "Himachal Pradesh"
 *   },
 *   "route": {
 *     "id": "c1f7a08b-2401-4ec9-8664-8830768e7ec8",
 *     "name": "Jalori Pass to Raghupur Fort Trail",
 *     "distanceKm": 3.5,
 *     "elevationGainM": 340,
 *     "geometry": { "type": "LineString", "coordinates": [ ... ] },
 *     "waypoints": [ ... ]
 *   },
 *   "mapBoundary": {
 *     "bbox": [77.365, 31.528, 77.388, 31.548],
 *     "center": [77.3765, 31.5380],
 *     "styleUrl": "https://tiles.openfreemap.org/styles/liberty"
 *   }
 * }
 */
export async function getOfflineTrekPackage(
  trekIdOrSlug: string,
  routeId?: string
): Promise<OfflineTrekPackage> {
  // 1. Resolve Trek
  const trek = await getTrekById(trekIdOrSlug);
  if (!trek) {
    throw Object.assign(new Error("Trek not found"), { status: 404 });
  }

  // 2. Resolve Verified Route
  let routeSql = `
    SELECT 
      tr.id,
      tr.trek_id as "trekId",
      tr.name,
      tr.route_type as "routeType",
      tr.distance_km as "distanceKm",
      tr.elevation_gain_m as "elevationGainM",
      tr.elevation_loss_m as "elevationLossM",
      tr.min_elevation_m as "minElevationM",
      tr.max_elevation_m as "maxElevationM",
      tr.start_point_name as "startPointName",
      tr.end_point_name as "endPointName",
      st_y(tr.start_location::geometry) as "trailheadLat",
      st_x(tr.start_location::geometry) as "trailheadLon",
      st_asgeojson(tr.geometry) as "geometryGeoJson",
      tr.waypoints,
      tr.elevation_profile as "elevationProfile",
      tr.verification_status as "verificationStatus",
      tr.updated_at as "updatedAt"
    FROM trek_routes tr
    WHERE tr.trek_id = $1::uuid
      AND tr.verification_status IN ('musafir_verified', 'community_verified')
  `;
  const params: any[] = [trek.id];

  if (routeId) {
    params.push(routeId);
    routeSql += ` AND tr.id = $2::uuid`;
  } else {
    routeSql += ` ORDER BY tr.is_primary DESC, tr.created_at ASC LIMIT 1`;
  }

  const rawRoutes = await db.$queryRawUnsafe<any[]>(routeSql, ...params);
  const rawRoute = rawRoutes[0];

  if (!rawRoute) {
    throw Object.assign(new Error("No verified route available for offline package"), { status: 404 });
  }

  const geometry = rawRoute.geometryGeoJson ? JSON.parse(rawRoute.geometryGeoJson) : null;
  const parsedWaypoints: OfflineWaypoint[] = Array.isArray(rawRoute.waypoints)
    ? rawRoute.waypoints
    : typeof rawRoute.waypoints === "string"
    ? JSON.parse(rawRoute.waypoints)
    : [];

  // 3. Compute Map Boundary & Tile Bounding Box from route coordinates
  const coords: [number, number][] = geometry?.coordinates || [
    [trek.coordinates?.lon ?? 77.374, trek.coordinates?.lat ?? 31.543],
    [(trek.coordinates?.lon ?? 77.374) + 0.01, (trek.coordinates?.lat ?? 31.543) + 0.01],
  ];

  let minLon = coords[0]![0],
    maxLon = coords[0]![0];
  let minLat = coords[0]![1],
    maxLat = coords[0]![1];

  for (const [cLon, cLat] of coords) {
    if (cLon < minLon) minLon = cLon;
    if (cLon > maxLon) maxLon = cLon;
    if (cLat < minLat) minLat = cLat;
    if (cLat > maxLat) maxLat = cLat;
  }

  // Add 0.01 degree buffer (~1km) for safety
  const buffer = 0.01;
  const bbox: [number, number, number, number] = [
    minLon - buffer,
    minLat - buffer,
    maxLon + buffer,
    maxLat + buffer,
  ];
  const center: [number, number] = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];

  // 4. Fetch Public Memory Metadata along this trek
  const rawMemories = await db.$queryRaw<Array<any>>`
    SELECT 
      m.id,
      m.thumbnail_url as "thumbnailUrl",
      m.photo_url as "photoUrl",
      m.caption,
      st_y(m.location::geometry) as lat,
      st_x(m.location::geometry) as lon,
      m.created_at as "createdAt",
      u.full_name as "authorName",
      u.avatar_url as "authorAvatarUrl"
    FROM memories m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.trek_id = ${trek.id}::uuid
      AND m.visibility = 'public'
      AND m.status = 'ready'
      AND m.moderation_status = 'approved'
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 20;
  `;

  const memories: OfflineMemoryMeta[] = rawMemories.map((m) => ({
    id: m.id,
    thumbnailUrl: m.thumbnailUrl || m.photoUrl,
    photoUrl: m.photoUrl,
    caption: m.caption,
    lat: Number(m.lat),
    lon: Number(m.lon),
    altitude: null,
    authorName: m.authorName || "Musafir Traveler",
    authorAvatarUrl: m.authorAvatarUrl,
    likesCount: 0,
    createdAt: new Date(m.createdAt).toISOString(),
  }));

  // 5. Versioning
  const routeUpdatedTime = new Date(rawRoute.updatedAt).getTime();
  const packageVersion = `pkg_v1_${rawRoute.id.slice(0, 8)}_${routeUpdatedTime}`;

  const pkg: OfflineTrekPackage = {
    packageVersion,
    generatedAt: new Date().toISOString(),
    sizeEstimateBytes: 0,
    trek: {
      id: trek.id,
      name: trek.name,
      slug: trek.slug,
      summary: trek.summary,
      difficulty: trek.difficulty,
      region: trek.region,
      bestMonths: trek.bestMonths || [],
      coverPhoto: trek.photos?.[0]?.url ?? null,
      lat: trek.coordinates?.lat ?? 0,
      lon: trek.coordinates?.lon ?? 0,
    },
    route: {
      id: rawRoute.id,
      name: rawRoute.name,
      routeType: rawRoute.routeType,
      verificationStatus: rawRoute.verificationStatus,
      distanceKm: rawRoute.distanceKm ? Number(rawRoute.distanceKm) : null,
      elevationGainM: rawRoute.elevationGainM ? Number(rawRoute.elevationGainM) : null,
      elevationLossM: rawRoute.elevationLossM ? Number(rawRoute.elevationLossM) : null,
      minElevationM: rawRoute.minElevationM ? Number(rawRoute.minElevationM) : null,
      maxElevationM: rawRoute.maxElevationM ? Number(rawRoute.maxElevationM) : null,
      startPointName: rawRoute.startPointName,
      endPointName: rawRoute.endPointName,
      trailheadLat: rawRoute.trailheadLat ? Number(rawRoute.trailheadLat) : null,
      trailheadLon: rawRoute.trailheadLon ? Number(rawRoute.trailheadLon) : null,
      geometry,
      waypoints: parsedWaypoints,
      elevationProfile: rawRoute.elevationProfile || [],
      updatedAt: new Date(rawRoute.updatedAt).toISOString(),
    },
    waypoints: parsedWaypoints,
    memories,
    mapBoundary: {
      bbox,
      center,
      defaultZoom: 13.5,
      styleUrl: "https://tiles.openfreemap.org/styles/liberty",
      offlineResourceBundle: {
        requiredTileBbox: bbox,
        minZoom: 11,
        maxZoom: 16,
      },
    },
  };

  // Estimate payload size
  pkg.sizeEstimateBytes = Buffer.byteLength(JSON.stringify(pkg), "utf8");

  return pkg;
}
