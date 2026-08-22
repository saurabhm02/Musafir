import { api } from "./api";

export type PoiStatus = "saved" | "want_to_go" | "visited";

export function fetchPoiStatusMap(): Promise<Record<string, PoiStatus>> {
  return api<Record<string, PoiStatus>>("/me/poi-status");
}

export function fetchPoiStatusCounts(): Promise<{ saved: number; want_to_go: number; visited: number }> {
  return api("/me/poi-status/counts");
}

export function setPoiStatus(poiId: string, status: PoiStatus | null): Promise<void> {
  return api(`/pois/${poiId}/status`, { method: "PUT", body: JSON.stringify({ status }) }).then(() => undefined);
}
