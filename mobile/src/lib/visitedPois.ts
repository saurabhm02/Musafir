import { api } from "./api";
import type { Poi } from "./pois";

export type VisitedPoiItem = Poi & {
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

export async function fetchVisitedPlaces(
  limit: number = 30,
  cursor?: string,
): Promise<{ items: VisitedPoiItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return api<{ items: VisitedPoiItem[]; nextCursor: string | null }>(`/visited?${query.toString()}`);
}

export async function markPoiVisited(
  poiId: string,
  tripId?: string,
  source: "manual" | "trip_gps" = "manual",
  visitedAt?: string,
): Promise<string> {
  const res = await api<{ success: boolean; visitId: string }>("/visited", {
    method: "POST",
    body: JSON.stringify({ poiId, tripId, source, visitedAt }),
  });
  return res.visitId;
}

export async function deletePoiVisit(visitId: string): Promise<void> {
  return api(`/visited/${visitId}`, {
    method: "DELETE",
  }).then(() => undefined);
}

export async function fetchPoiVisitHistory(poiId: string): Promise<VisitHistoryItem[]> {
  return api<VisitHistoryItem[]>(`/visited/poi/${poiId}/history`);
}
