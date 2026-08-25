import { api } from "./api";
import type { Poi } from "./pois";

export type PoiStatus = "saved" | "want_to_go" | "visited";

export type StatusPoiItem = Poi & {
  status: PoiStatus;
  created_at: string;
};

export function fetchPoiStatusMap(): Promise<Record<string, PoiStatus>> {
  return api<Record<string, PoiStatus>>("/me/poi-status");
}

export function fetchPoiStatusCounts(): Promise<{ saved: number; want_to_go: number; visited: number }> {
  return api<{ saved: number; want_to_go: number; visited: number }>("/me/poi-status/counts");
}

export function fetchPoiStatusPlaces(status?: PoiStatus): Promise<StatusPoiItem[]> {
  const query = status ? `?status=${status}` : "";
  return api<StatusPoiItem[]>(`/me/poi-status/places${query}`);
}

export function setPoiStatus(poiId: string, status: PoiStatus | null): Promise<void> {
  return api(`/pois/${poiId}/status`, { method: "PUT", body: JSON.stringify({ status }) }).then(() => undefined);
}
