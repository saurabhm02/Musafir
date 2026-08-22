export function badRequest(message: string): never {
  throw Object.assign(new Error(message), { status: 400 });
}

export function asCreatePoi(body: any) {
  if (typeof body?.name !== "string" || !body.name.trim()) badRequest("name is required");
  if (typeof body?.category !== "string" || !body.category.trim()) badRequest("category is required");
  if (typeof body?.lat !== "number" || typeof body?.lon !== "number") badRequest("lat/lon must be numbers");
  if (body.photoUrl !== undefined && typeof body.photoUrl !== "string") badRequest("photoUrl must be a string");
  return body as { name: string; category: string; lat: number; lon: number; photoUrl?: string };
}

export function asAddMemory(body: any) {
  if (typeof body?.poiId !== "string") badRequest("poiId is required");
  if (typeof body?.photoUrl !== "string") badRequest("photoUrl is required");
  if (body?.visibility !== "public" && body?.visibility !== "private") badRequest("visibility must be public or private");
  return body as { poiId: string; photoUrl: string; visibility: "public" | "private" };
}

export function asSearchRoute(body: any) {
  if (!Array.isArray(body?.coordinates) || body.coordinates.length < 2) badRequest("coordinates must be an array of [lng,lat] pairs");
  if (typeof body?.origin !== "string" || typeof body?.destination !== "string") badRequest("origin/destination are required");
  if (typeof body?.distanceKm !== "number" || typeof body?.durationMin !== "number") badRequest("distanceKm/durationMin must be numbers");
  return body as { coordinates: [number, number][]; origin: string; destination: string; distanceKm: number; durationMin: number };
}

export function asCreateTrip(body: any) {
  if (typeof body?.title !== "string" || !body.title.trim()) badRequest("title is required");
  if (body.destination !== undefined && typeof body.destination !== "string") badRequest("destination must be a string");
  if (body.dayCount !== undefined && (typeof body.dayCount !== "number" || body.dayCount < 1)) badRequest("dayCount must be a positive number");
  return body as { title: string; destination?: string; dayCount?: number };
}

export function asUpdateTrip(body: any) {
  if (body.title !== undefined && typeof body.title !== "string") badRequest("title must be a string");
  if (body.status !== undefined && !["draft", "in_progress", "completed"].includes(body.status)) badRequest("status must be draft, in_progress, or completed");
  return body as { title?: string; status?: "draft" | "in_progress" | "completed" };
}

export function asAddTripStop(body: any) {
  if (typeof body?.poiId !== "string") badRequest("poiId is required");
  if (typeof body?.dayNumber !== "number" || body.dayNumber < 1) badRequest("dayNumber must be a positive number");
  if (body.timeLabel !== undefined && typeof body.timeLabel !== "string") badRequest("timeLabel must be a string");
  if (body.note !== undefined && typeof body.note !== "string") badRequest("note must be a string");
  return body as { poiId: string; dayNumber: number; timeLabel?: string; note?: string };
}

export function asUpdateTripStop(body: any) {
  if (body.dayNumber !== undefined && typeof body.dayNumber !== "number") badRequest("dayNumber must be a number");
  if (body.timeLabel !== undefined && typeof body.timeLabel !== "string") badRequest("timeLabel must be a string");
  if (body.note !== undefined && typeof body.note !== "string") badRequest("note must be a string");
  if (body.sortOrder !== undefined && typeof body.sortOrder !== "number") badRequest("sortOrder must be a number");
  return body as { dayNumber?: number; timeLabel?: string; note?: string; sortOrder?: number };
}

export function asSetPoiStatus(body: any) {
  if (body.status !== null && !["saved", "want_to_go", "visited"].includes(body.status)) {
    badRequest("status must be saved, want_to_go, visited, or null");
  }
  return body as { status: "saved" | "want_to_go" | "visited" | null };
}
