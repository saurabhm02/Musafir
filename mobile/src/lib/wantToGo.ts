import { api } from "./api";
import type { Poi } from "./pois";

export type WantToGoPoiItem = Poi & {
  notes: string | null;
  created_at: string;
};

export async function fetchWantToGo(
  limit: number = 30,
  cursor?: string,
): Promise<{ items: WantToGoPoiItem[]; nextCursor: string | null }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return api<{ items: WantToGoPoiItem[]; nextCursor: string | null }>(`/want-to-go?${query.toString()}`);
}

export async function addWantToGo(poiId: string, notes?: string): Promise<void> {
  return api("/want-to-go", {
    method: "POST",
    body: JSON.stringify({ poiId, notes }),
  }).then(() => undefined);
}

export async function removeWantToGo(poiId: string): Promise<void> {
  return api(`/want-to-go/${poiId}`, {
    method: "DELETE",
  }).then(() => undefined);
}

export async function moveWantToGoToTrip(
  poiId: string,
  tripId: string,
  dayNumber: number,
  removeAfterMove: boolean = true,
): Promise<{ stopId: string }> {
  return api(`/want-to-go/${poiId}/move-to-trip`, {
    method: "POST",
    body: JSON.stringify({ tripId, dayNumber, removeAfterMove }),
  });
}
