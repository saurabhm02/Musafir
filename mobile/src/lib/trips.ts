import { api } from "./api";

export type TripSummary = {
  id: string;
  title: string;
  destination: string | null;
  dayCount: number;
  status: "draft" | "in_progress" | "completed";
  placeCount: number;
  coverPhotoUrl: string | null;
};

export type TripStop = {
  id: string;
  day_number: number;
  time_label: string | null;
  note: string | null;
  sort_order: number;
  poi_id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  photo_url: string | null;
};

export type TripDetail = {
  id: string;
  title: string;
  destination: string | null;
  dayCount: number;
  status: "draft" | "in_progress" | "completed";
  days: Record<string, TripStop[]>;
};

export function fetchTrips(): Promise<TripSummary[]> {
  return api<TripSummary[]>("/trips");
}

export function fetchTrip(tripId: string): Promise<TripDetail> {
  return api<TripDetail>(`/trips/${tripId}`);
}

export async function createTrip(input: { title: string; destination?: string; dayCount?: number }): Promise<string> {
  const { id } = await api<{ id: string }>("/trips", { method: "POST", body: JSON.stringify(input) });
  return id;
}

export function addTripStop(
  tripId: string,
  input: { poiId: string; dayNumber: number; timeLabel?: string; note?: string },
): Promise<{ id: string }> {
  return api(`/trips/${tripId}/stops`, { method: "POST", body: JSON.stringify(input) });
}

export function updateTripStop(
  tripId: string,
  stopId: string,
  input: { dayNumber?: number; timeLabel?: string; note?: string; sortOrder?: number },
): Promise<void> {
  return api(`/trips/${tripId}/stops/${stopId}`, { method: "PATCH", body: JSON.stringify(input) }).then(() => undefined);
}

// Input: a trip + one of its days
// Output: that day's stops in their new, optimized order
// Server reorders greedily by nearest-neighbor distance and persists it.
export async function optimizeTripDay(tripId: string, dayNumber: number): Promise<string[]> {
  const { orderedStopIds } = await api<{ orderedStopIds: string[] }>(`/trips/${tripId}/days/${dayNumber}/optimize`, { method: "POST" });
  return orderedStopIds;
}
