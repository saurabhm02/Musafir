import { db } from "../lib/db";

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
