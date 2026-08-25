import { db } from "../lib/db";

export type StatusPoiItem = {
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
  status: string;
  created_at: string;
};

// Input: nothing (uses the logged-in user)
// Output: a map of poiId -> status, for showing save/visited badges anywhere a POI list renders
export async function getPoiStatusMap(userId: string): Promise<Record<string, string>> {
  const rows = await db.poi_status.findMany({ where: { user_id: userId }, select: { poi_id: true, status: true } });
  return Object.fromEntries(rows.map((r) => [r.poi_id, r.status]));
}

// Input: nothing (uses the logged-in user)
// Output: how many places are saved / want-to-go / visited -- Home's stat tiles
export async function getPoiStatusCounts(userId: string): Promise<{ saved: number; want_to_go: number; visited: number }> {
  const rows = await db.poi_status.groupBy({ by: ["status"], where: { user_id: userId }, _count: { _all: true } });
  const counts = { saved: 0, want_to_go: 0, visited: 0 };
  for (const r of rows) if (r.status in counts) counts[r.status as keyof typeof counts] = r._count._all;
  return counts;
}

// Input: logged-in user + optional status filter ('saved' | 'want_to_go' | 'visited')
// Output: array of full POI objects with photo_url, coordinates, and created_at date
export async function getPoiStatusPlaces(
  userId: string,
  status?: string,
): Promise<StatusPoiItem[]> {
  const sql = status
    ? `
      SELECT p.id, p.name, p.description, p.category, p.is_verified,
        st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
        p.avg_rating, p.total_ratings, p.best_time,
        ps.status, ps.created_at
      FROM poi_status ps
      JOIN pois p ON ps.poi_id = p.id
      WHERE ps.user_id = $1::uuid AND ps.status = $2
      ORDER BY ps.created_at DESC
    `
    : `
      SELECT p.id, p.name, p.description, p.category, p.is_verified,
        st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
        p.avg_rating, p.total_ratings, p.best_time,
        ps.status, ps.created_at
      FROM poi_status ps
      JOIN pois p ON ps.poi_id = p.id
      WHERE ps.user_id = $1::uuid
      ORDER BY ps.created_at DESC
    `;

  const params = status ? [userId, status] : [userId];
  const pois = await db.$queryRawUnsafe<any[]>(sql, ...params);

  if (pois.length === 0) return [];

  const poiIds = pois.map((p) => p.id);
  const photos = await db.poi_photos.findMany({
    where: { poi_id: { in: poiIds } },
    select: { poi_id: true, url: true },
    orderBy: { created_at: "asc" },
  });

  const coverByPoi = new Map<string, string>();
  for (const p of photos) {
    if (p.poi_id && !coverByPoi.has(p.poi_id)) coverByPoi.set(p.poi_id, p.url);
  }

  const missingPoiIds = poiIds.filter((id) => !coverByPoi.has(id));
  if (missingPoiIds.length > 0) {
    const covers = await db.memories.findMany({
      where: { poi_id: { in: missingPoiIds }, visibility: "public" },
      select: { poi_id: true, photo_url: true },
      orderBy: { created_at: "asc" },
    });
    for (const c of covers) {
      if (c.poi_id && !coverByPoi.has(c.poi_id)) coverByPoi.set(c.poi_id, c.photo_url);
    }
  }

  return pois.map((p) => ({
    ...p,
    photo_url: coverByPoi.get(p.id) ?? null,
    created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
  }));
}

// Input: a POI id + the status to set (or null to clear it)
// Output: nothing -- upserts or deletes the user's one status row for this place
export async function setPoiStatus(poiId: string, status: "saved" | "want_to_go" | "visited" | null, userId: string): Promise<void> {
  if (status === null) {
    await db.poi_status.deleteMany({ where: { user_id: userId, poi_id: poiId } });
    return;
  }
  await db.poi_status.upsert({
    where: { user_id_poi_id: { user_id: userId, poi_id: poiId } },
    create: { user_id: userId, poi_id: poiId, status },
    update: { status },
  });
}
