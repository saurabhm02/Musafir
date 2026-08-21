import { db } from "../lib/db";



export async function searchRoute(
  input: { coordinates: [number, number][]; origin: string; destination: string; distanceKm: number; durationMin: number },
  userId: string,
): Promise<number> {
  const geojson = JSON.stringify({ type: "LineString", coordinates: input.coordinates });
  const [result] = await db.$queryRaw<{ matched_segment_count: number }[]>`
    select * from search_route(${geojson}, ${input.origin}, ${input.destination}, ${input.distanceKm}, ${input.durationMin}, ${userId}::uuid)
  `;
  if (!result) throw new Error("search_route returned no row");
  return result.matched_segment_count;
}
