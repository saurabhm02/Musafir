import { db } from "../lib/db";


export async function getStats(userId: string) {
  const [poisAdded, memoriesPosted, routesSearched] = await Promise.all([
    db.pois.count({ where: { created_by: userId } }),
    db.memories.count({ where: { user_id: userId } }),
    db.routes.count({ where: { created_by: userId } }),
  ]);
  return { poisAdded, memoriesPosted, routesSearched };
}
