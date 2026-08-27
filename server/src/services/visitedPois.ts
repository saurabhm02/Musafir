import { db } from "../lib/db";

export type VisitedPoiItem = {
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
  total_visits: number;
  latest_visited_at: string;
  last_source: string;
};

export type VisitHistoryItem = {
  id: string;
  poi_id: string;
  trip_id: string | null;
  trip_title: string | null;
  source: string;
  visited_at: string;
};

export async function recordPoiVisit(
  userId: string,
  input: {
    poiId: string;
    tripId?: string;
    source?: "manual" | "trip_gps";
    visitedAt?: string;
  },
): Promise<string> {
  const visitDate = input.visitedAt ? new Date(input.visitedAt) : new Date();

  const visit = await db.$transaction(async (tx) => {
    // 1. Insert history record
    const created = await tx.user_visited_pois.create({
      data: {
        user_id: userId,
        poi_id: input.poiId,
        trip_id: input.tripId || null,
        source: input.source || "manual",
        visited_at: visitDate,
      },
    });

    // 2. Sync poi_status
    await tx.poi_status.upsert({
      where: { user_id_poi_id: { user_id: userId, poi_id: input.poiId } },
      create: { user_id: userId, poi_id: input.poiId, status: "visited" },
      update: { status: "visited" },
    });

    return created;
  });

  return visit.id;
}

export async function deletePoiVisit(userId: string, visitId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const target = await tx.user_visited_pois.findFirst({
      where: { id: visitId, user_id: userId },
    });
    if (!target) return;

    await tx.user_visited_pois.delete({ where: { id: visitId } });

    // Check if any other visits remain for this POI
    const remaining = await tx.user_visited_pois.count({
      where: { user_id: userId, poi_id: target.poi_id },
    });

    if (remaining === 0) {
      const hasSaved = await tx.user_saved_pois.findUnique({
        where: { user_id_poi_id: { user_id: userId, poi_id: target.poi_id } },
      });
      const hasWantToGo = await tx.user_want_to_go.findUnique({
        where: { user_id_poi_id: { user_id: userId, poi_id: target.poi_id } },
      });

      if (hasSaved) {
        await tx.poi_status.updateMany({
          where: { user_id: userId, poi_id: target.poi_id },
          data: { status: "saved" },
        });
      } else if (hasWantToGo) {
        await tx.poi_status.updateMany({
          where: { user_id: userId, poi_id: target.poi_id },
          data: { status: "want_to_go" },
        });
      } else {
        await tx.poi_status.deleteMany({
          where: { user_id: userId, poi_id: target.poi_id },
        });
      }
    }
  });
}

export async function listVisitedPois(
  userId: string,
  limit: number = 30,
  cursor?: string,
): Promise<{ items: VisitedPoiItem[]; nextCursor: string | null }> {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const raw = cursor
    ? await db.$queryRaw<any[]>`
        SELECT
          p.id, p.name, p.description, p.category, p.is_verified,
          st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
          p.avg_rating, p.total_ratings, p.best_time,
          COUNT(uvp.id)::int as total_visits,
          MAX(uvp.visited_at) as latest_visited_at,
          (ARRAY_AGG(uvp.source ORDER BY uvp.visited_at DESC))[1] as last_source
        FROM user_visited_pois uvp
        JOIN pois p ON uvp.poi_id = p.id
        WHERE uvp.user_id = ${userId}::uuid
        GROUP BY p.id, p.name, p.description, p.category, p.is_verified, p.location, p.avg_rating, p.total_ratings, p.best_time
        HAVING MAX(uvp.visited_at) < ${new Date(cursor)}
        ORDER BY latest_visited_at DESC
        LIMIT ${safeLimit + 1}
      `
    : await db.$queryRaw<any[]>`
        SELECT
          p.id, p.name, p.description, p.category, p.is_verified,
          st_y(p.location::geometry) as lat, st_x(p.location::geometry) as lon,
          p.avg_rating, p.total_ratings, p.best_time,
          COUNT(uvp.id)::int as total_visits,
          MAX(uvp.visited_at) as latest_visited_at,
          (ARRAY_AGG(uvp.source ORDER BY uvp.visited_at DESC))[1] as last_source
        FROM user_visited_pois uvp
        JOIN pois p ON uvp.poi_id = p.id
        WHERE uvp.user_id = ${userId}::uuid
        GROUP BY p.id, p.name, p.description, p.category, p.is_verified, p.location, p.avg_rating, p.total_ratings, p.best_time
        ORDER BY latest_visited_at DESC
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

  const items: VisitedPoiItem[] = sliced.map((p) => ({
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
    total_visits: Number(p.total_visits || 1),
    latest_visited_at: p.latest_visited_at ? new Date(p.latest_visited_at).toISOString() : new Date().toISOString(),
    last_source: p.last_source || "manual",
  }));

  const lastItem = sliced[sliced.length - 1];
  const nextCursor = hasMore && lastItem ? new Date(lastItem.latest_visited_at).toISOString() : null;

  return { items, nextCursor };
}

export async function getPoiVisitHistory(userId: string, poiId: string): Promise<VisitHistoryItem[]> {
  const raw = await db.user_visited_pois.findMany({
    where: { user_id: userId, poi_id: poiId },
    include: {
      trips: { select: { title: true } },
    },
    orderBy: { visited_at: "desc" },
  });

  return raw.map((r) => ({
    id: r.id,
    poi_id: r.poi_id,
    trip_id: r.trip_id,
    trip_title: r.trips?.title || null,
    source: r.source,
    visited_at: r.visited_at.toISOString(),
  }));
}
