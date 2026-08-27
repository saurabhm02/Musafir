import { api } from "./api";
import type { Poi } from "./pois";

export type SavedPoiItem = Poi & {
  saved_at: string;
};

export async function fetchSavedPlaces(
  limit: number = 30,
  cursor?: string,
): Promise<{ items: SavedPoiItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return api<{ items: SavedPoiItem[]; nextCursor: string | null }>(`/saved?${query.toString()}`);
}

export async function savePoi(poiId: string): Promise<void> {
  return api("/saved", {
    method: "POST",
    body: JSON.stringify({ poiId }),
  }).then(() => undefined);
}

export async function unsavePoi(poiId: string): Promise<void> {
  return api(`/saved/${poiId}`, {
    method: "DELETE",
  }).then(() => undefined);
}
