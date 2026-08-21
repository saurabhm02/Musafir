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
