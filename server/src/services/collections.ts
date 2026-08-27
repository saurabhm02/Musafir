import { db } from "../lib/db";
import type { PoiSummary } from "./pois";

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  poi_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type CollectionDetail = Collection & {
  pois: PoiSummary[];
};

export async function listCollections(userId: string): Promise<Collection[]> {
  const rows = await db.collections.findMany({
    where: { user_id: userId },
    include: {
      _count: { select: { collection_pois: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    cover_url: c.cover_url,
    poi_count: c._count.collection_pois,
    is_public: c.is_public,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }));
}

export async function getCollectionDetail(
  userId: string,
  collectionId: string,
  limit: number = 50,
): Promise<CollectionDetail | null> {
  const col = await db.collections.findFirst({
    where: { id: collectionId, user_id: userId },
    include: {
      collection_pois: {
        orderBy: { sort_order: "asc" },
        take: limit,
        select: { poi_id: true },
      },
      _count: { select: { collection_pois: true } },
    },
  });

  if (!col) return null;

  const poiIds = col.collection_pois.map((cp) => cp.poi_id);
  let pois: PoiSummary[] = [];

  if (poiIds.length > 0) {
    const rawPois = await db.$queryRaw<any[]>`
      SELECT id, name, description, category, is_verified,
        st_y(location::geometry) as lat, st_x(location::geometry) as lon,
        avg_rating, total_ratings, best_time
      FROM pois
      WHERE id = ANY(${poiIds}::uuid[])
    `;

    const photos = await db.poi_photos.findMany({
      where: { poi_id: { in: poiIds } },
      select: { poi_id: true, url: true },
      orderBy: { created_at: "asc" },
    });

    const coverMap = new Map<string, string>();
    for (const p of photos) {
      if (p.poi_id && !coverMap.has(p.poi_id)) coverMap.set(p.poi_id, p.url);
    }

    const poiMap = new Map<string, any>(rawPois.map((p) => [p.id, p]));
    // Preserve ordered sequence
    pois = poiIds
      .map((id) => poiMap.get(id))
      .filter(Boolean)
      .map((p) => ({
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
        photo_url: coverMap.get(p.id) ?? null,
      }));
  }

  return {
    id: col.id,
    name: col.name,
    description: col.description,
    cover_url: col.cover_url || (pois[0]?.photo_url ?? null),
    poi_count: col._count.collection_pois,
    is_public: col.is_public,
    created_at: col.created_at.toISOString(),
    updated_at: col.updated_at.toISOString(),
    pois,
  };
}

export async function createCollection(
  userId: string,
  input: { name: string; description?: string; cover_url?: string; is_public?: boolean },
): Promise<Collection> {
  const created = await db.collections.create({
    data: {
      user_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      cover_url: input.cover_url?.trim() || null,
      is_public: !!input.is_public,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    cover_url: created.cover_url,
    poi_count: 0,
    is_public: created.is_public,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
  };
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  input: { name?: string; description?: string; cover_url?: string; is_public?: boolean },
): Promise<Collection | null> {
  const existing = await db.collections.findFirst({
    where: { id: collectionId, user_id: userId },
  });
  if (!existing) return null;

  const data: Record<string, any> = { updated_at: new Date() };
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.cover_url !== undefined) data.cover_url = input.cover_url?.trim() || null;
  if (input.is_public !== undefined) data.is_public = input.is_public;

  const updated = await db.collections.update({
    where: { id: collectionId },
    data,
    include: { _count: { select: { collection_pois: true } } },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    cover_url: updated.cover_url,
    poi_count: updated._count.collection_pois,
    is_public: updated.is_public,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
  };
}

export async function deleteCollection(userId: string, collectionId: string): Promise<boolean> {
  const existing = await db.collections.findFirst({
    where: { id: collectionId, user_id: userId },
  });
  if (!existing) return false;

  await db.collections.delete({ where: { id: collectionId } });
  return true;
}

export async function addPoiToCollection(
  userId: string,
  collectionId: string,
  poiId: string,
): Promise<{ added: boolean }> {
  const col = await db.collections.findFirst({
    where: { id: collectionId, user_id: userId },
  });
  if (!col) return { added: false };

  const maxOrder = await db.collection_pois.aggregate({
    where: { collection_id: collectionId },
    _max: { sort_order: true },
  });

  await db.collection_pois.upsert({
    where: { collection_id_poi_id: { collection_id: collectionId, poi_id: poiId } },
    create: {
      collection_id: collectionId,
      poi_id: poiId,
      sort_order: (maxOrder._max.sort_order ?? -1) + 1,
    },
    update: {},
  });

  await db.collections.update({
    where: { id: collectionId },
    data: { updated_at: new Date() },
  });

  return { added: true };
}

export async function removePoiFromCollection(
  userId: string,
  collectionId: string,
  poiId: string,
): Promise<{ removed: boolean }> {
  const col = await db.collections.findFirst({
    where: { id: collectionId, user_id: userId },
  });
  if (!col) return { removed: false };

  await db.collection_pois.deleteMany({
    where: { collection_id: collectionId, poi_id: poiId },
  });

  await db.collections.update({
    where: { id: collectionId },
    data: { updated_at: new Date() },
  });

  return { removed: true };
}

export async function reorderCollectionPois(
  userId: string,
  collectionId: string,
  poiIds: string[],
): Promise<boolean> {
  const col = await db.collections.findFirst({
    where: { id: collectionId, user_id: userId },
  });
  if (!col) return false;

  await db.$transaction(
    poiIds.map((poiId, idx) =>
      db.collection_pois.updateMany({
        where: { collection_id: collectionId, poi_id: poiId },
        data: { sort_order: idx },
      }),
    ),
  );

  await db.collections.update({
    where: { id: collectionId },
    data: { updated_at: new Date() },
  });

  return true;
}
