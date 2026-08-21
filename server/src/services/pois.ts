import { db } from "../lib/db";


export async function listPois() {
  const pois = await db.$queryRaw<{ id: string; name: string; description: string | null; category: string; is_verified: boolean; lat: number; lon: number }[]>`
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

  return pois.map((p) => ({ ...p, photo_url: coverByPoi.get(p.id) ?? null }));
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
