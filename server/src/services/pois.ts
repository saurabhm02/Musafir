import { db } from "../lib/db";

export type PoiSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_verified: boolean;
  lat: number;
  lon: number;
  avg_rating: number | null;
  total_ratings: number | null;
  best_time: string | null;
  photo_url: string | null;
  distance_km?: number;
};

// Efficient helper to fetch cover photos only for a slice of POI IDs
async function attachCoverPhotos<T extends { id: string }>(
  pois: T[],
): Promise<(T & { photo_url: string | null })[]> {
  if (pois.length === 0) return [];

  const poiIds = pois.map((p) => p.id);
  const photos = await db.poi_photos.findMany({
    where: { poi_id: { in: poiIds } },
    select: { poi_id: true, url: true },
    orderBy: { created_at: "asc" },
  });

  const coverByPoi = new Map<string, string>();
  for (const p of photos) {
    if (p.poi_id && !coverByPoi.has(p.poi_id)) {
      coverByPoi.set(p.poi_id, p.url);
    }
  }

  const missingPoiIds = poiIds.filter((id) => !coverByPoi.has(id));
  if (missingPoiIds.length > 0) {
    const covers = await db.memories.findMany({
      where: { poi_id: { in: missingPoiIds }, visibility: "public" },
      select: { poi_id: true, photo_url: true },
      orderBy: { created_at: "asc" },
    });
    for (const c of covers) {
      if (c.poi_id && !coverByPoi.has(c.poi_id)) {
        coverByPoi.set(c.poi_id, c.photo_url);
      }
    }
  }

  return pois.map((p) => ({
    ...p,
    photo_url: coverByPoi.get(p.id) ?? null,
  }));
}

// Server-side text search with ranking, category filter, and pagination
export async function listPois(
  q?: string,
  category?: string,
  limit = 60,
  offset = 0,
): Promise<PoiSummary[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);
  const cleanQ = q?.trim();
  const cleanCat = category && category !== "all" ? category.trim() : null;

  if (cleanQ) {
    const searchPattern = `%${cleanQ}%`;
    const prefixPattern = `${cleanQ}%`;

    const sql = cleanCat
      ? `
        SELECT id, name, description, category, is_verified,
          st_y(location::geometry) as lat, st_x(location::geometry) as lon,
          avg_rating, total_ratings, best_time
        FROM pois
        WHERE (
          name ILIKE $1 OR
          category ILIKE $1 OR
          description ILIKE $1
        )
        AND category ILIKE $2
        ORDER BY
          CASE
            WHEN name ILIKE $3 THEN 0
            WHEN name ILIKE $1 THEN 1
            ELSE 2
          END,
          avg_rating DESC NULLS LAST,
          total_ratings DESC NULLS LAST
        LIMIT $4 OFFSET $5
      `
      : `
        SELECT id, name, description, category, is_verified,
          st_y(location::geometry) as lat, st_x(location::geometry) as lon,
          avg_rating, total_ratings, best_time
        FROM pois
        WHERE (
          name ILIKE $1 OR
          category ILIKE $1 OR
          description ILIKE $1
        )
        ORDER BY
          CASE
            WHEN name ILIKE $2 THEN 0
            WHEN name ILIKE $1 THEN 1
            ELSE 2
          END,
          avg_rating DESC NULLS LAST,
          total_ratings DESC NULLS LAST
        LIMIT $3 OFFSET $4
      `;

    const params = cleanCat
      ? [searchPattern, cleanCat, prefixPattern, safeLimit, safeOffset]
      : [searchPattern, prefixPattern, safeLimit, safeOffset];

    const pois = await db.$queryRawUnsafe<
      {
        id: string;
        name: string;
        description: string | null;
        category: string;
        is_verified: boolean;
        lat: number;
        lon: number;
        avg_rating: number | null;
        total_ratings: number | null;
        best_time: string | null;
      }[]
    >(sql, ...params);

    return attachCoverPhotos(pois);
  }

  // If no query string, return top rated POIs with optional category filter
  const sql = cleanCat
    ? `
      SELECT id, name, description, category, is_verified,
        st_y(location::geometry) as lat, st_x(location::geometry) as lon,
        avg_rating, total_ratings, best_time
      FROM pois
      WHERE category ILIKE $1
      ORDER BY avg_rating DESC NULLS LAST, total_ratings DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `
    : `
      SELECT id, name, description, category, is_verified,
        st_y(location::geometry) as lat, st_x(location::geometry) as lon,
        avg_rating, total_ratings, best_time
      FROM pois
      ORDER BY avg_rating DESC NULLS LAST, total_ratings DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `;

  const params = cleanCat ? [cleanCat, safeLimit, safeOffset] : [safeLimit, safeOffset];

  const pois = await db.$queryRawUnsafe<
    {
      id: string;
      name: string;
      description: string | null;
      category: string;
      is_verified: boolean;
      lat: number;
      lon: number;
      avg_rating: number | null;
      total_ratings: number | null;
      best_time: string | null;
    }[]
  >(sql, ...params);

  return attachCoverPhotos(pois);
}

// Spatial PostGIS nearby query with radius, category filter, and limit
export async function listPoisNearby(
  lat: number,
  lon: number,
  radiusKm: number,
  category?: string,
  limit = 80,
  offset = 0,
): Promise<(PoiSummary & { distance_km: number })[]> {
  const safeLimit = Math.min(Math.max(1, limit), 120);
  const safeOffset = Math.max(0, offset);
  const cleanCat = category && category !== "all" ? category.trim() : null;
  const point = `st_setsrid(st_makepoint(${lon}, ${lat}), 4326)::geography`;

  const sql = cleanCat
    ? `
      SELECT id, name, description, category, is_verified,
        st_y(location::geometry) as lat, st_x(location::geometry) as lon,
        avg_rating, total_ratings, best_time,
        st_distance(location, ${point}) / 1000 as distance_km
      FROM pois
      WHERE st_dwithin(location, ${point}, $1 * 1000)
      AND category ILIKE $2
      ORDER BY location <-> ${point}
      LIMIT $3 OFFSET $4
    `
    : `
      SELECT id, name, description, category, is_verified,
        st_y(location::geometry) as lat, st_x(location::geometry) as lon,
        avg_rating, total_ratings, best_time,
        st_distance(location, ${point}) / 1000 as distance_km
      FROM pois
      WHERE st_dwithin(location, ${point}, $1 * 1000)
      ORDER BY location <-> ${point}
      LIMIT $2 OFFSET $3
    `;

  const params = cleanCat ? [radiusKm, cleanCat, safeLimit, safeOffset] : [radiusKm, safeLimit, safeOffset];

  const pois = await db.$queryRawUnsafe<
    {
      id: string;
      name: string;
      description: string | null;
      category: string;
      is_verified: boolean;
      lat: number;
      lon: number;
      avg_rating: number | null;
      total_ratings: number | null;
      best_time: string | null;
      distance_km: number;
    }[]
  >(sql, ...params);

  return attachCoverPhotos(pois);
}

// Full POI details with metadata, photos, and routes
export async function getPoiDetails(poiId: string) {
  const [poi] = await db.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string;
      is_verified: boolean;
      lat: number;
      lon: number;
      avg_rating: number | null;
      total_ratings: number | null;
      best_time: string | null;
      address: string | null;
      tags: string[];
    }[]
  >`
    select id, name, description, category, is_verified, address, tags,
      st_y(location::geometry) as lat, st_x(location::geometry) as lon,
      avg_rating, total_ratings, best_time
    from pois where id = ${poiId}::uuid
  `;
  if (!poi) return null;

  const [metadata, photos, routes] = await Promise.all([
    db.poi_metadata.findUnique({ where: { poi_id: poiId } }),
    db.poi_photos.findMany({ where: { poi_id: poiId }, orderBy: { created_at: "asc" } }),
    db.$queryRaw<
      {
        id: string;
        route_type: string;
        distance_km: number | null;
        elevation_gain_m: number | null;
        source: string;
        source_id: string | null;
        confidence: string;
        geometry: string;
      }[]
    >`
      select id, route_type, distance_km, elevation_gain_m, source, source_id, confidence,
        st_asgeojson(geometry) as geometry
      from poi_routes where poi_id = ${poiId}::uuid
    `,
  ]);

  return {
    ...poi,
    metadata,
    photos,
    routes: routes.map((r) => ({ ...r, geometry: JSON.parse(r.geometry) })),
  };
}

export async function createPoi(
  input: { name: string; category: string; lat: number; lon: number; photoUrl?: string },
  userId: string,
): Promise<string> {
  const [poi] = await db.$queryRaw<{ id: string }[]>`
    insert into pois (name, category, location, created_by)
    values (${input.name}, ${input.category}, st_setsrid(st_makepoint(${input.lon}, ${input.lat}), 4326)::geography, ${userId}::uuid)
    returning id
  `;
  if (!poi) throw new Error("poi insert returned no row");

  if (input.photoUrl) {
    await db.$executeRaw`
      insert into memories (user_id, poi_id, photo_url, visibility, location)
      values (${userId}::uuid, ${poi.id}::uuid, ${input.photoUrl}, 'public', st_setsrid(st_makepoint(${input.lon}, ${input.lat}), 4326)::geography)
    `;
  }

  return poi.id;
}
