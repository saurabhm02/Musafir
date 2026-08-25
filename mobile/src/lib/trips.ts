import { api } from "./api";

export type TripSummary = {
  id: string;
  title: string;
  destination: string | null;
  dayCount: number;
  status: "planned" | "active" | "paused" | "completed" | "cancelled";
  startedAt: string | null;
  completedAt: string | null;
  actualDistanceKm: number | null;
  actualDurationMin: number | null;
  placeCount: number;
  coverPhotoUrl: string | null;
};

export type TripStop = {
  id: string;
  day_number: number;
  time_label: string | null;
  note: string | null;
  sort_order: number;
  status: "pending" | "reached" | "skipped";
  arrived_at: string | null;
  departed_at: string | null;
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
  status: "planned" | "active" | "paused" | "completed" | "cancelled";
  startedAt: string | null;
  completedAt: string | null;
  actualDistanceKm: number | null;
  actualDurationMin: number | null;
  movingDurationMin: number | null;
  elevationGainM: number | null;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
  recordedRoute: any | null;
  telemetryS3Key: string | null;
  memories: Array<{
    id: string;
    photo_url: string;
    thumbnail_url: string | null;
    caption: string | null;
    created_at: string;
  }>;
  days: Record<string, TripStop[]>;
};

export type TelemetryPoint = {
  lat: number;
  lon: number;
  alt?: number | null;
  speed?: number | null;
  acc?: number | null;
  t: number;
};

export type TelemetryBatchInput = {
  batchSequence?: number;
  points: TelemetryPoint[];
  currentStats?: {
    distanceKm?: number;
    movingMinutes?: number;
    elevationGainM?: number;
    maxSpeedKmh?: number;
    avgSpeedKmh?: number;
  };
};

export type CompleteTripInput = {
  actualDistanceKm?: number;
  actualDurationMin?: number;
  movingDurationMin?: number;
  elevationGainM?: number;
  maxSpeedKmh?: number;
  avgSpeedKmh?: number;
  points?: [number, number][]; // [lon, lat] coordinates
  rawTelemetry?: TelemetryPoint[];
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

export function startTrip(tripId: string): Promise<{ id: string; status: string; startedAt: string }> {
  return api(`/trips/${tripId}/start`, { method: "POST" });
}

export function pauseTrip(tripId: string): Promise<{ id: string; status: string }> {
  return api(`/trips/${tripId}/pause`, { method: "POST" });
}

export function resumeTrip(tripId: string): Promise<{ id: string; status: string }> {
  return api(`/trips/${tripId}/resume`, { method: "POST" });
}

export function sendTripTelemetry(tripId: string, batch: TelemetryBatchInput): Promise<{ ok: boolean; visitedStops: string[] }> {
  return api(`/trips/${tripId}/track`, { method: "POST", body: JSON.stringify(batch) });
}

export function completeTrip(tripId: string, input: CompleteTripInput): Promise<{ id: string; status: string; actualDistanceKm: number; actualDurationMin: number }> {
  return api(`/trips/${tripId}/complete`, { method: "POST", body: JSON.stringify(input) });
}

export function updateTripStopStatus(tripId: string, stopId: string, status: "pending" | "reached" | "skipped"): Promise<{ ok: boolean }> {
  return api(`/trips/${tripId}/stops/${stopId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
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

export function deleteTrip(tripId: string): Promise<void> {
  return api(`/trips/${tripId}`, { method: "DELETE" }).then(() => undefined);
}

export async function optimizeTripDay(tripId: string, dayNumber: number): Promise<string[]> {
  const { orderedStopIds } = await api<{ orderedStopIds: string[] }>(`/trips/${tripId}/days/${dayNumber}/optimize`, {
    method: "POST",
  });
  return orderedStopIds;
}
