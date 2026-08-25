import { db } from "../lib/db";
import type { PoiSummary } from "./pois";

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  poi_count: number;
  created_at: string;
  updated_at: string;
};

export type CollectionDetail = Collection & {
  pois: PoiSummary[];
};

type StoredCollection = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  poi_ids: string[];
  created_at: string;
  updated_at: string;
};

async function getUserCollections(userId: string): Promise<StoredCollection[]> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const prefs = (user?.preferences as any) || {};
  if (Array.isArray(prefs.collections)) {
    return prefs.collections;
  }

  return [];
}

async function saveUserCollections(userId: string, collections: StoredCollection[]): Promise<void> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const prefs = (user?.preferences as any) || {};
  await db.users.update({
    where: { id: userId },
    data: {
      preferences: {
        ...prefs,
        collections,
      },
    },
  });
}

export async function listCollections(userId: string): Promise<Collection[]> {
  const stored = await getUserCollections(userId);
  return stored.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    cover_url: c.cover_url,
    poi_count: c.poi_ids.length,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));
}

export async function getCollectionDetail(userId: string, collectionId: string): Promise<CollectionDetail | null> {
  const stored = await getUserCollections(userId);
  const col = stored.find((c) => c.id === collectionId);
  if (!col) return null;

  let pois: PoiSummary[] = [];
  if (col.poi_ids.length > 0) {
    const rawPois = await db.$queryRawUnsafe<any[]>(
      `
      SELECT id, name, description, category, is_verified,
        st_y(location::geometry) as lat, st_x(location::geometry) as lon,
        avg_rating, total_ratings, best_time
      FROM pois
      WHERE id = ANY($1::uuid[])
    `,
      col.poi_ids,
    );

    const photos = await db.poi_photos.findMany({
      where: { poi_id: { in: col.poi_ids } },
      select: { poi_id: true, url: true },
      orderBy: { created_at: "asc" },
    });

    const coverMap = new Map<string, string>();
    for (const p of photos) {
      if (p.poi_id && !coverMap.has(p.poi_id)) coverMap.set(p.poi_id, p.url);
    }

    pois = rawPois.map((p) => ({
      ...p,
      photo_url: coverMap.get(p.id) ?? null,
    }));
  }

  return {
    id: col.id,
    name: col.name,
    description: col.description,
    cover_url: col.cover_url || (pois[0]?.photo_url ?? null),
    poi_count: col.poi_ids.length,
    created_at: col.created_at,
    updated_at: col.updated_at,
    pois,
  };
}

export async function createCollection(
  userId: string,
  input: { name: string; description?: string; cover_url?: string },
): Promise<Collection> {
  const stored = await getUserCollections(userId);
  const newCol: StoredCollection = {
    id: `col-${Date.now()}`,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    cover_url: input.cover_url || null,
    poi_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  stored.unshift(newCol);
  await saveUserCollections(userId, stored);

  return {
    id: newCol.id,
    name: newCol.name,
    description: newCol.description,
    cover_url: newCol.cover_url,
    poi_count: 0,
    created_at: newCol.created_at,
    updated_at: newCol.updated_at,
  };
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  input: { name?: string; description?: string; cover_url?: string },
): Promise<Collection | null> {
  const stored = await getUserCollections(userId);
  const idx = stored.findIndex((c) => c.id === collectionId);
  if (idx === -1) return null;

  const target = stored[idx];
  if (!target) return null;

  if (input.name) target.name = input.name.trim();
  if (input.description !== undefined) target.description = input.description?.trim() || null;
  if (input.cover_url) target.cover_url = input.cover_url;
  target.updated_at = new Date().toISOString();

  await saveUserCollections(userId, stored);

  return {
    id: target.id,
    name: target.name,
    description: target.description,
    cover_url: target.cover_url,
    poi_count: target.poi_ids.length,
    created_at: target.created_at,
    updated_at: target.updated_at,
  };
}

export async function deleteCollection(userId: string, collectionId: string): Promise<boolean> {
  const stored = await getUserCollections(userId);
  const next = stored.filter((c) => c.id !== collectionId);
  if (next.length === stored.length) return false;

  await saveUserCollections(userId, next);
  return true;
}

export async function togglePoiInCollection(
  userId: string,
  collectionId: string,
  poiId: string,
): Promise<{ in_collection: boolean; poi_count: number }> {
  const stored = await getUserCollections(userId);
  const col = stored.find((c) => c.id === collectionId);
  if (!col) throw new Error("Collection not found");

  const exists = col.poi_ids.includes(poiId);
  if (exists) {
    col.poi_ids = col.poi_ids.filter((id) => id !== poiId);
  } else {
    col.poi_ids.push(poiId);
  }
  col.updated_at = new Date().toISOString();

  await saveUserCollections(userId, stored);
  return { in_collection: !exists, poi_count: col.poi_ids.length };
}
