import { db } from "../lib/db";

export async function listMemories(poiId: string, userId: string | null) {
  return db.memories.findMany({
    where: userId
      ? { poi_id: poiId, OR: [{ visibility: "public" }, { user_id: userId }] }
      : { poi_id: poiId, visibility: "public" },
    select: { id: true, photo_url: true, visibility: true, user_id: true },
    orderBy: { created_at: "desc" },
  });
}


export async function addMemory(
  input: { poiId: string; photoUrl: string; visibility: "public" | "private" },
  userId: string,
): Promise<void> {
  const [poi] = await db.$queryRaw<{ lat: number; lon: number }[]>`
    select st_y(location::geometry) as lat, st_x(location::geometry) as lon from pois where id = ${input.poiId}::uuid
  `;
  if (!poi) throw new Error("poi not found");

  await db.$executeRaw`
    insert into memories (user_id, poi_id, photo_url, visibility, location)
    values (${userId}::uuid, ${input.poiId}::uuid, ${input.photoUrl}, ${input.visibility}, st_setsrid(st_makepoint(${poi.lon}, ${poi.lat}), 4326)::geography)
  `;
}
