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

export function validateCoordinates(coords: any): [number, number][] {
  if (!Array.isArray(coords) || coords.length < 2) {
    badRequest("coordinates must be an array of at least 2 [lng, lat] coordinate pairs");
  }
  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    if (!Array.isArray(pt) || pt.length < 2 || typeof pt[0] !== "number" || typeof pt[1] !== "number") {
      badRequest(`invalid coordinate pair at index ${i}`);
    }
    const [lng, lat] = pt;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      badRequest(`coordinate out of range at index ${i}: [${lng}, ${lat}]`);
    }
  }
  return coords as [number, number][];
}

export interface SubmitTrekRouteInput {
  name: string;
  routeType?: string;
  coordinates?: [number, number][];
  distanceKm?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  minElevationM?: number;
  maxElevationM?: number;
  startPointName?: string;
  endPointName?: string;
  waypoints?: Array<{
    name: string;
    type: string;
    lat: number;
    lng: number;
    tags?: Record<string, any>;
  }>;
  elevationProfile?: Array<{
    lat: number;
    lng: number;
    elevationM: number;
  }>;
  sourceType?: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceLicense?: string;
}

export function asSubmitTrekRoute(body: any): SubmitTrekRouteInput {
  if (typeof body?.name !== "string" || !body.name.trim()) badRequest("name is required");
  let coordinates: [number, number][] | undefined = undefined;
  if (body.coordinates !== undefined) {
    coordinates = validateCoordinates(body.coordinates);
  }
  if (body.distanceKm !== undefined && (typeof body.distanceKm !== "number" || body.distanceKm < 0)) {
    badRequest("distanceKm must be a non-negative number");
  }
  if (body.elevationGainM !== undefined && typeof body.elevationGainM !== "number") {
    badRequest("elevationGainM must be a number");
  }
  if (body.elevationLossM !== undefined && typeof body.elevationLossM !== "number") {
    badRequest("elevationLossM must be a number");
  }
  if (body.minElevationM !== undefined && typeof body.minElevationM !== "number") {
    badRequest("minElevationM must be a number");
  }
  if (body.maxElevationM !== undefined && typeof body.maxElevationM !== "number") {
    badRequest("maxElevationM must be a number");
  }
  if (body.waypoints !== undefined && !Array.isArray(body.waypoints)) {
    badRequest("waypoints must be an array");
  }
  if (body.elevationProfile !== undefined && !Array.isArray(body.elevationProfile)) {
    badRequest("elevationProfile must be an array");
  }

  return {
    name: body.name.trim(),
    routeType: typeof body.routeType === "string" ? body.routeType : "out_and_back",
    coordinates,
    distanceKm: body.distanceKm,
    elevationGainM: body.elevationGainM,
    elevationLossM: body.elevationLossM,
    minElevationM: body.minElevationM,
    maxElevationM: body.maxElevationM,
    startPointName: typeof body.startPointName === "string" ? body.startPointName.trim() : undefined,
    endPointName: typeof body.endPointName === "string" ? body.endPointName.trim() : undefined,
    waypoints: body.waypoints,
    elevationProfile: body.elevationProfile,
    sourceType: typeof body.sourceType === "string" ? body.sourceType : "community_submitted",
    sourceId: typeof body.sourceId === "string" ? body.sourceId : undefined,
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : undefined,
    sourceLicense: typeof body.sourceLicense === "string" ? body.sourceLicense : "CC-BY-SA 4.0",
  };
}

export interface UpdateTrekRouteInput {
  name?: string;
  routeType?: string;
  coordinates?: [number, number][];
  distanceKm?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  minElevationM?: number;
  maxElevationM?: number;
  startPointName?: string;
  endPointName?: string;
  waypoints?: Array<{
    name: string;
    type: string;
    lat: number;
    lng: number;
    tags?: Record<string, any>;
  }>;
  elevationProfile?: Array<{
    lat: number;
    lng: number;
    elevationM: number;
  }>;
  sourceUrl?: string;
}

export function asUpdateTrekRoute(body: any): UpdateTrekRouteInput {
  const result: UpdateTrekRouteInput = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) badRequest("name cannot be empty");
    result.name = body.name.trim();
  }
  if (body.routeType !== undefined) {
    if (typeof body.routeType !== "string") badRequest("routeType must be a string");
    result.routeType = body.routeType;
  }
  if (body.coordinates !== undefined) {
    result.coordinates = validateCoordinates(body.coordinates);
  }
  if (body.distanceKm !== undefined) {
    if (typeof body.distanceKm !== "number" || body.distanceKm < 0) badRequest("distanceKm must be non-negative");
    result.distanceKm = body.distanceKm;
  }
  if (body.elevationGainM !== undefined) {
    if (typeof body.elevationGainM !== "number") badRequest("elevationGainM must be a number");
    result.elevationGainM = body.elevationGainM;
  }
  if (body.elevationLossM !== undefined) {
    if (typeof body.elevationLossM !== "number") badRequest("elevationLossM must be a number");
    result.elevationLossM = body.elevationLossM;
  }
  if (body.minElevationM !== undefined) {
    if (typeof body.minElevationM !== "number") badRequest("minElevationM must be a number");
    result.minElevationM = body.minElevationM;
  }
  if (body.maxElevationM !== undefined) {
    if (typeof body.maxElevationM !== "number") badRequest("maxElevationM must be a number");
    result.maxElevationM = body.maxElevationM;
  }
  if (body.startPointName !== undefined) {
    result.startPointName = typeof body.startPointName === "string" ? body.startPointName.trim() : undefined;
  }
  if (body.endPointName !== undefined) {
    result.endPointName = typeof body.endPointName === "string" ? body.endPointName.trim() : undefined;
  }
  if (body.waypoints !== undefined) {
    if (!Array.isArray(body.waypoints)) badRequest("waypoints must be an array");
    result.waypoints = body.waypoints;
  }
  if (body.elevationProfile !== undefined) {
    if (!Array.isArray(body.elevationProfile)) badRequest("elevationProfile must be an array");
    result.elevationProfile = body.elevationProfile;
  }
  if (body.sourceUrl !== undefined) {
    result.sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl : undefined;
  }
  return result;
}

export function asVerifyTrekRoute(body: any) {
  const verificationStatus = body?.verificationStatus ?? "musafir_verified";
  if (!["musafir_verified", "community_verified"].includes(verificationStatus)) {
    badRequest("verificationStatus must be 'musafir_verified' or 'community_verified'");
  }
  const confidence = body?.confidence ?? "high";
  if (!["high", "medium", "low", "unverified"].includes(confidence)) {
    badRequest("confidence must be 'high', 'medium', 'low', or 'unverified'");
  }
  const isPrimary = body?.isPrimary === true;
  return { verificationStatus: verificationStatus as "musafir_verified" | "community_verified", confidence, isPrimary };
}

export function asRejectTrekRoute(body: any) {
  if (typeof body?.rejectionReason !== "string" || !body.rejectionReason.trim()) {
    badRequest("rejectionReason is required");
  }
  return { rejectionReason: body.rejectionReason.trim() };
}

export interface DiscoverJourneysRequest {
  originLat: number;
  originLon: number;
  trekId?: string;
  trekRouteId?: string;
  preference?: "balanced" | "fastest" | "cheapest" | "train_focused" | "bus_focused" | "flight_enabled";
}

export function asDiscoverJourneysInput(body: any): DiscoverJourneysRequest {
  if (typeof body?.originLat !== "number" || isNaN(body.originLat) || body.originLat < -90 || body.originLat > 90) {
    badRequest("originLat must be a valid latitude number between -90 and 90");
  }
  if (typeof body?.originLon !== "number" || isNaN(body.originLon) || body.originLon < -180 || body.originLon > 180) {
    badRequest("originLon must be a valid longitude number between -180 and 180");
  }
  if (!body?.trekId && !body?.trekRouteId) {
    badRequest("Either trekId or trekRouteId is required");
  }

  return {
    originLat: body.originLat,
    originLon: body.originLon,
    trekId: typeof body.trekId === "string" && body.trekId.trim() ? body.trekId.trim() : undefined,
    trekRouteId: typeof body.trekRouteId === "string" && body.trekRouteId.trim() ? body.trekRouteId.trim() : undefined,
    preference: typeof body.preference === "string" ? (body.preference as any) : undefined,
  };
}

