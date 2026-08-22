import { db } from "../lib/db";


// ponytail: fetches all POIs and filters `q` in JS. Fine at seed-data scale;
// move to a SQL ilike/full-text WHERE clause once the table is too big to
// ship to the server whole.
export async function listPois(q?: string) {
  const pois = await db.$queryRaw<
    { id: string; name: string; description: string | null; category: string; is_verified: boolean; lat: number; lon: number; avg_rating: number | null; total_ratings: number | null; best_time: string | null }[]
  >`
    select * from pois_with_coords()
  `;
  if (pois.length === 0) return pois;

  const covers = await db.memories.findMany({
    where: { poi_id: { in: pois.map((p) => p.id) }, visibility: "public" },
    select: { poi_id: true, photo_url: true },
    orderBy: { created_at: "asc" },
  });
  const coverByPoi = new Map<string, string>();
  for (const c of covers) if (c.poi_id && !coverByPoi.has(c.poi_id)) coverByPoi.set(c.poi_id, c.photo_url);

  const withCovers = pois.map((p) => ({ ...p, photo_url: coverByPoi.get(p.id) ?? null }));
  if (!q?.trim()) return withCovers;

  const needle = q.trim().toLowerCase();
  return withCovers.filter(
    (p) => p.name.toLowerCase().includes(needle) || p.description?.toLowerCase().includes(needle) || p.category.toLowerCase().includes(needle),
  );
}


// Input: a device coordinate + search radius (+ optional category filter)
// Output: POIs within that radius, nearest-first -- backs Explore's "Nearby" toggle
// Uses the pois_location_gix GiST index for both the ST_DWithin filter and
// the <-> distance ordering, so this stays fast as the table grows past
// what's reasonable to ship to the client whole (unlike listPois above).
export async function listPoisNearby(lat: number, lon: number, radiusKm: number, category?: string) {
  const point = `st_setsrid(st_makepoint(${lon}, ${lat}), 4326)::geography`;
  const pois = await db.$queryRawUnsafe<
    { id: string; name: string; description: string | null; category: string; is_verified: boolean; lat: number; lon: number; avg_rating: number | null; total_ratings: number | null; best_time: string | null; distance_km: number }[]
  >(`
    select id, name, description, category, is_verified,
      st_y(location::geometry) as lat, st_x(location::geometry) as lon,
      avg_rating, total_ratings, best_time,
      st_distance(location, ${point}) / 1000 as distance_km
    from pois
    where st_dwithin(location, ${point}, $1 * 1000)
    ${category ? "and category = $2" : ""}
    order by location <-> ${point}
  `, radiusKm, ...(category ? [category] : []));

  if (pois.length === 0) return pois;

  const covers = await db.memories.findMany({
    where: { poi_id: { in: pois.map((p) => p.id) }, visibility: "public" },
    select: { poi_id: true, photo_url: true },
    orderBy: { created_at: "asc" },
  });
  const coverByPoi = new Map<string, string>();
  for (const c of covers) if (c.poi_id && !coverByPoi.has(c.poi_id)) coverByPoi.set(c.poi_id, c.photo_url);

  return pois.map((p) => ({ ...p, photo_url: coverByPoi.get(p.id) ?? null }));
}

// Input: a POI id
// Output: the POI + its structured metadata + photos + trail geometry
// (each route's geometry as GeoJSON), or null if the POI doesn't exist.
// New endpoint (GET /pois/:id) -- doesn't touch listPois/listPoisNearby's
// existing response shape, so nothing that already depends on those breaks.
export async function getPoiDetails(poiId: string) {
  const [poi] = await db.$queryRaw<
    { id: string; name: string; description: string | null; category: string; is_verified: boolean; lat: number; lon: number; avg_rating: number | null; total_ratings: number | null; best_time: string | null; address: string | null; tags: string[] }[]
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
      { id: string; route_type: string; distance_km: number | null; elevation_gain_m: number | null; source: string; source_id: string | null; confidence: string; geometry: string }[]
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
