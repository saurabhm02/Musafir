import { db } from "../lib/db";

export type SavedPoiItem = {
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
  saved_at: string;
};

export async function savePoi(userId: string, poiId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    // 1. Relational Saved Record
    await tx.user_saved_pois.upsert({
      where: { user_id_poi_id: { user_id: userId, poi_id: poiId } },
      create: { user_id: userId, poi_id: poiId },
      update: {},
    });

    // 2. Backward-compatible sync to poi_status
    await tx.poi_status.upsert({
      where: { user_id_poi_id: { user_id: userId, poi_id: poiId } },
      create: { user_id: userId, poi_id: poiId, status: "saved" },
      update: { status: "saved" },
    });
  });
}

export async function unsavePoi(userId: string, poiId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.user_saved_pois.deleteMany({
      where: { user_id: userId, poi_id: poiId },
    });

    // If no other status, clear poi_status
    const hasWantToGo = await tx.user_want_to_go.findUnique({
      where: { user_id_poi_id: { user_id: userId, poi_id: poiId } },
    });
    const hasVisited = await tx.user_visited_pois.findFirst({
      where: { user_id: userId, poi_id: poiId },
    });

    if (hasVisited) {
      await tx.poi_status.updateMany({
        where: { user_id: userId, poi_id: poiId },
        data: { status: "visited" },
      });
    } else if (hasWantToGo) {
      await tx.poi_status.updateMany({
        where: { user_id: userId, poi_id: poiId },
        data: { status: "want_to_go" },
      });
    } else {
      await tx.poi_status.deleteMany({
        where: { user_id: userId, poi_id: poiId },
      });
    }
  });
}

export async function listSavedPois(
  userId: string,
  limit: number = 30,
  cursor?: string,
): Promise<{ items: SavedPoiItem[]; nextCursor: string | null }> {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const raw = cursor
    ? await db.$queryRaw<any[]>`
        SELECT
          p.id, p.name, p.description, p.category, p.is_verified,
          st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
          p.avg_rating, p.total_ratings, p.best_time,
          usp.created_at as saved_at
        FROM user_saved_pois usp
        JOIN pois p ON usp.poi_id = p.id
        WHERE usp.user_id = ${userId}::uuid
          AND usp.created_at < ${new Date(cursor)}
        ORDER BY usp.created_at DESC
        LIMIT ${safeLimit + 1}
      `
    : await db.$queryRaw<any[]>`
        SELECT
          p.id, p.name, p.description, p.category, p.is_verified,
          st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
          p.avg_rating, p.total_ratings, p.best_time,
          usp.created_at as saved_at
        FROM user_saved_pois usp
        JOIN pois p ON usp.poi_id = p.id
        WHERE usp.user_id = ${userId}::uuid
        ORDER BY usp.created_at DESC
        LIMIT ${safeLimit + 1}
      `;

  const hasMore = raw.length > safeLimit;
  const sliced = hasMore ? raw.slice(0, safeLimit) : raw;

  if (sliced.length === 0) {
    return { items: [], nextCursor: null };
  }

  const poiIds = sliced.map((p) => p.id);
  const photos = await db.poi_photos.findMany({
    where: { poi_id: { in: poiIds } },
    select: { poi_id: true, url: true },
    orderBy: { created_at: "asc" },
  });

  const photoMap = new Map<string, string>();
  for (const p of photos) {
    if (p.poi_id && !photoMap.has(p.poi_id)) photoMap.set(p.poi_id, p.url);
  }

  const items: SavedPoiItem[] = sliced.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    is_verified: !!p.is_verified,
    lat: Number(p.lat),
    lon: Number(p.lon),
    avg_rating: p.avg_rating ? Number(p.avg_rating) : null,
    total_ratings: p.total_ratings ? Number(p.total_ratings) : null,
    best_time: p.best_time,
    photo_url: photoMap.get(p.id) ?? null,
    saved_at: p.saved_at ? new Date(p.saved_at).toISOString() : new Date().toISOString(),
  }));

  const lastItem = sliced[sliced.length - 1];
  const nextCursor = hasMore && lastItem ? new Date(lastItem.saved_at).toISOString() : null;

  return { items, nextCursor };
}
