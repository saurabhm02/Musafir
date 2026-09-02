import { db } from "../lib/db";

export interface ListTreksQuery {
  q?: string;
  region?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
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
  primaryRoute?: {
    id: string;
    name: string;
    distanceKm: number | null;
    elevationGainM: number | null;
    maxElevationM: number | null;
    verificationStatus: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Searches and lists treks in the database with optional keyword filters,
 * region, difficulty grade, and pagination.
 *
 * @example
 * // 1. Input parameters:
 * const query: ListTreksQuery = {
 *   q: "fort",
 *   region: "Himachal Pradesh",
 *   difficulty: "moderate",
 *   limit: 10,
 *   offset: 0,
 * };
 *
 * // 2. HTTP Request:
 * // GET /treks?q=fort&region=Himachal%20Pradesh&difficulty=moderate&limit=10&offset=0
 *
 * // 3. What the Server returns:
 * [
 *   {
 *     "id": "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *     "poiId": "d0598858-a53d-4951-b0db-67ce292b3a8a",
 *     "name": "Raghupur Fort Trek",
 *     "slug": "raghupur-fort-trek",
 *     "region": "Himachal Pradesh",
 *     "difficulty": "moderate",
 *     "summary": "Scenic ridge trek with 360-degree Himalayan views.",
 *     "bestMonths": [4, 5, 6, 9, 10, 11],
 *     "lat": 31.5348,
 *     "lon": 77.378,
 *     "coverPhoto": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
 *     "routesCount": 2,
 *     "primaryRoute": {
 *       "id": "c1f7a08b-2401-4ec9-8664-8830768e7ec8",
 *       "name": "Jalori Pass to Raghupur Fort Trail",
 *       "distanceKm": 3.5,
 *       "elevationGainM": 340,
 *       "maxElevationM": 3540,
 *       "verificationStatus": "musafir_verified"
 *     }
 *   }
 * ]
 */
export async function listTreks(query: ListTreksQuery = {}): Promise<TrekListItem[]> {
  const limit = Math.min(Math.max(1, query.limit ?? 50), 100);
  const offset = Math.max(0, query.offset ?? 0);

  const whereConditions: string[] = ["1=1"];
  const params: any[] = [];

  if (query.q && query.q.trim()) {
    params.push(`%${query.q.trim()}%`);
    whereConditions.push(`t.name ILIKE $${params.length}`);
  }

  if (query.region && query.region.trim()) {
    params.push(`%${query.region.trim()}%`);
    whereConditions.push(`t.region ILIKE $${params.length}`);
  }

  if (query.difficulty && query.difficulty.trim()) {
    params.push(query.difficulty.trim().toLowerCase());
    whereConditions.push(`t.difficulty = $${params.length}`);
  }

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const sql = `
    SELECT 
      t.id,
      t.poi_id as "poiId",
      t.name,
      t.slug,
      t.region,
      t.difficulty,
      t.summary,
      t.best_months as "bestMonths",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      st_y(p.location::geometry) as lat,
      st_x(p.location::geometry) as lon,
      (
        SELECT url FROM poi_photos pp 
        WHERE pp.poi_id = t.poi_id 
        ORDER BY pp.created_at ASC LIMIT 1
      ) as "coverPhoto",
      (
        SELECT COUNT(*)::int FROM trek_routes tr 
        WHERE tr.trek_id = t.id 
          AND tr.verification_status IN ('musafir_verified', 'community_verified')
      ) as "routesCount"
    FROM treks t
    JOIN pois p ON p.id = t.poi_id
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY t.name ASC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const rawTreks = await db.$queryRawUnsafe<any[]>(sql, ...params);

  // Fetch primary routes for these treks
  const trekIds = rawTreks.map(t => t.id);
  let primaryRoutesMap = new Map<string, any>();

  if (trekIds.length > 0) {
    const primaryRoutes = await db.$queryRawUnsafe<any[]>(
      `
      SELECT 
        tr.id,
        tr.trek_id as "trekId",
        tr.name,
        tr.distance_km as "distanceKm",
        tr.elevation_gain_m as "elevationGainM",
        tr.max_elevation_m as "maxElevationM",
        tr.verification_status as "verificationStatus"
      FROM trek_routes tr
      WHERE tr.trek_id = ANY($1::uuid[])
        AND tr.verification_status IN ('musafir_verified', 'community_verified')
      ORDER BY tr.is_primary DESC, tr.created_at ASC
    `,
      trekIds
    );

    for (const r of primaryRoutes) {
      if (!primaryRoutesMap.has(r.trekId)) {
        primaryRoutesMap.set(r.trekId, {
          id: r.id,
          name: r.name,
          distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
          elevationGainM: r.elevationGainM ? Number(r.elevationGainM) : null,
          maxElevationM: r.maxElevationM ? Number(r.maxElevationM) : null,
          verificationStatus: r.verificationStatus,
        });
      }
    }
  }

  return rawTreks.map(t => ({
    id: t.id,
    poiId: t.poiId,
    name: t.name,
    slug: t.slug,
    region: t.region,
    difficulty: t.difficulty,
    summary: t.summary,
    bestMonths: t.bestMonths || [],
    lat: Number(t.lat),
    lon: Number(t.lon),
    coverPhoto: t.coverPhoto,
    routesCount: Number(t.routesCount),
    primaryRoute: primaryRoutesMap.get(t.id) || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

/**
 * Fetches full details for a single trek by its UUID or slug, including
 * its primary verified route, all available routes, top waypoints, and photos.
 *
 * @example
 * // 1. Input:
 * const idOrSlug = "raghupur-fort-trek";
 *
 * // 2. HTTP Request:
 * // GET /treks/raghupur-fort-trek
 *
 * // 3. What the Server returns:
 * {
 *   "id": "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *   "name": "Raghupur Fort Trek",
 *   "slug": "raghupur-fort-trek",
 *   "region": "Himachal Pradesh",
 *   "difficulty": "moderate",
 *   "summary": "Historic fort ruins with oak forests and 360-degree Himalayan panorama.",
 *   "bestMonths": [4, 5, 6, 9, 10, 11],
 *   "lat": 31.5348,
 *   "lon": 77.378,
 *   "routesCount": 2,
 *   "primaryRoute": {
 *     "id": "c1f7a08b-2401-4ec9-8664-8830768e7ec8",
 *     "name": "Jalori Pass Standard Trail",
 *     "distanceKm": 3.5,
 *     "elevationGainM": 340,
 *     "maxElevationM": 3540,
 *     "verificationStatus": "musafir_verified"
 *   }
 * }
 */
export async function getTrekById(idOrSlug: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  const sql = isUuid
    ? `
      SELECT 
        t.id,
        t.poi_id as "poiId",
        t.name,
        t.slug,
        t.region,
        t.difficulty,
        t.summary,
        t.best_months as "bestMonths",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        st_y(p.location::geometry) as lat,
        st_x(p.location::geometry) as lon,
        p.avg_rating as "avgRating",
        p.total_ratings as "totalRatings",
        p.address
      FROM treks t
      JOIN pois p ON p.id = t.poi_id
      WHERE t.id = $1::uuid
      LIMIT 1
    `
    : `
      SELECT 
        t.id,
        t.poi_id as "poiId",
        t.name,
        t.slug,
        t.region,
        t.difficulty,
        t.summary,
        t.best_months as "bestMonths",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        st_y(p.location::geometry) as lat,
        st_x(p.location::geometry) as lon,
        p.avg_rating as "avgRating",
        p.total_ratings as "totalRatings",
        p.address
      FROM treks t
      JOIN pois p ON p.id = t.poi_id
      WHERE t.slug = $1
      LIMIT 1
    `;

  const treks = await db.$queryRawUnsafe<any[]>(sql, idOrSlug);
  if (treks.length === 0) return null;
  const trek = treks[0];

  // Fetch verified routes with GeoJSON geometries
  const routesSql = `
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
      st_asgeojson(tr.geometry) as "geometryGeoJson",
      st_asgeojson(tr.start_location) as "startLocationGeoJson",
      st_asgeojson(tr.end_location) as "endLocationGeoJson",
      tr.waypoints,
      tr.elevation_profile as "elevationProfile",
      tr.source_type as "sourceType",
      tr.source_id as "sourceId",
      tr.source_url as "sourceUrl",
      tr.source_license as "sourceLicense",
      tr.verification_status as "verificationStatus",
      tr.confidence,
      tr.is_primary as "isPrimary",
      tr.created_at as "createdAt",
      tr.updated_at as "updatedAt"
    FROM trek_routes tr
    WHERE tr.trek_id = $1::uuid
      AND tr.verification_status IN ('musafir_verified', 'community_verified')
    ORDER BY tr.is_primary DESC, tr.created_at ASC
  `;

  const routes = await db.$queryRawUnsafe<any[]>(routesSql, trek.id);

  // Fetch photos from poi_photos
  const photos = await db.poi_photos.findMany({
    where: { poi_id: trek.poiId },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      url: true,
      attribution: true,
      source: true,
      license: true,
    },
  });

  // Fetch public memories linked to this trek
  const memories = await db.memories.findMany({
    where: {
      trek_id: trek.id,
      visibility: "public",
      status: "ready",
      moderation_status: "approved",
    },
    orderBy: { created_at: "desc" },
    take: 20,
    select: {
      id: true,
      photo_url: true,
      caption: true,
      taken_at: true,
      trek_route_id: true,
    },
  });

  return {
    id: trek.id,
    poiId: trek.poiId,
    name: trek.name,
    slug: trek.slug,
    region: trek.region,
    difficulty: trek.difficulty,
    summary: trek.summary,
    bestMonths: trek.bestMonths || [],
    coordinates: { lat: Number(trek.lat), lon: Number(trek.lon) },
    rating: {
      avg: trek.avgRating ? Number(trek.avgRating) : 0,
      count: trek.totalRatings ? Number(trek.totalRatings) : 0,
    },
    address: trek.address,
    photos,
    memories,
    routes: routes.map(r => ({
      id: r.id,
      trekId: r.trekId,
      name: r.name,
      routeType: r.routeType,
      distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
      elevationGainM: r.elevationGainM ? Number(r.elevationGainM) : null,
      elevationLossM: r.elevationLossM ? Number(r.elevationLossM) : null,
      minElevationM: r.minElevationM ? Number(r.minElevationM) : null,
      maxElevationM: r.maxElevationM ? Number(r.maxElevationM) : null,
      startPointName: r.startPointName,
      endPointName: r.endPointName,
      geometry: r.geometryGeoJson ? JSON.parse(r.geometryGeoJson) : null,
      startLocation: r.startLocationGeoJson ? JSON.parse(r.startLocationGeoJson) : null,
      endLocation: r.endLocationGeoJson ? JSON.parse(r.endLocationGeoJson) : null,
      waypoints: r.waypoints,
      elevationProfile: r.elevationProfile,
      source: {
        type: r.sourceType,
        id: r.sourceId,
        url: r.sourceUrl,
        license: r.sourceLicense,
      },
      verificationStatus: r.verificationStatus,
      confidence: r.confidence,
      isPrimary: r.isPrimary,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    createdAt: trek.createdAt,
    updatedAt: trek.updatedAt,
  };
}
