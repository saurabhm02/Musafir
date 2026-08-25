import { api } from "./api";

export type TravelMode = "driving" | "walking";

export type NavigationStep = {
  instruction: string;
  streetName: string;
  distanceM: number;
  durationSec: number;
  maneuver: {
    type: string;
    modifier: string | null;
    location: [number, number]; // [lng, lat]
    bearingBefore: number;
    bearingAfter: number;
  };
};

export type Route = {
  coordinates: [number, number][]; // [lng, lat]
  distanceKm: number;
  durationMin: number;
  mode?: TravelMode;
  steps?: NavigationStep[];
  provider?: string;
};

// Generates readable maneuver instruction from raw maneuver data
function formatManeuverInstruction(
  type: string,
  modifier: string | null,
  streetName: string,
  mode: TravelMode,
): string {
  const road = streetName && streetName.trim() !== "" ? streetName : "the route";
  const verb = mode === "walking" ? "Walk" : "Drive";

  switch (type) {
    case "depart":
      return `Head ${modifier ? modifier + " " : ""}on ${road}`;
    case "turn":
      return `Turn ${modifier || "ahead"} onto ${road}`;
    case "continue":
      return `Continue on ${road}`;
    case "new name":
      return `Continue onto ${road}`;
    case "fork":
      return `Keep ${modifier || "straight"} at the fork onto ${road}`;
    case "merge":
      return `Merge ${modifier || ""} onto ${road}`;
    case "on ramp":
      return `Take the ramp onto ${road}`;
    case "off ramp":
      return `Take the exit toward ${road}`;
    case "roundabout":
    case "rotary":
      return `At the roundabout, proceed onto ${road}`;
    case "end of road":
      return `Turn ${modifier || "left"} at the end of the road onto ${road}`;
    case "arrive":
      return `You have reached your destination`;
    default:
      return `${verb} on ${road}`;
  }
}

// Determines appropriate travel mode based on category name or tags
export function resolveTravelMode(category: string): TravelMode {
  const c = category.toLowerCase();
  if (
    c.includes("trek") ||
    c.includes("hike") ||
    c.includes("walking") ||
    c.includes("trail") ||
    c.includes("waterfall") ||
    c.includes("viewpoint")
  ) {
    return "walking";
  }
  return "driving";
}

// Fetches a full real navigation route between origin and destination.
// Calls the backend /navigation/route service with fallback to direct OSRM.
export async function fetchNavigationRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  mode: TravelMode = "driving",
): Promise<Route> {
  // First try backend navigation service
  try {
    const serverResult = await api<Route>("/navigation/route", {
      method: "POST",
      body: JSON.stringify({ origin, destination, mode }),
    });
    if (serverResult && serverResult.coordinates && serverResult.coordinates.length > 0) {
      return serverResult;
    }
  } catch {
    // Fall back to direct OSRM request
  }

  const profile = mode === "walking" ? "foot" : "driving";
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true&annotations=true`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Musafir-Mobile/1.0" },
  });

  if (!res.ok) throw new Error(`Routing request failed: ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];

  if (!route) throw new Error("No route found between coordinates");

  const steps: NavigationStep[] = [];
  const rawSteps = route.legs?.[0]?.steps ?? [];

  for (const s of rawSteps) {
    const m = s.maneuver ?? {};
    const street = s.name || "";
    const instruction = formatManeuverInstruction(m.type, m.modifier ?? null, street, mode);

    steps.push({
      instruction,
      streetName: street,
      distanceM: Math.round(s.distance ?? 0),
      durationSec: Math.round(s.duration ?? 0),
      maneuver: {
        type: m.type || "turn",
        modifier: m.modifier ?? null,
        location: m.location || [0, 0],
        bearingBefore: m.bearing_before ?? 0,
        bearingAfter: m.bearing_after ?? 0,
      },
    });
  }

  return {
    coordinates: route.geometry.coordinates,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    mode,
    steps,
    provider: "osrm-direct",
  };
}

// Backward-compatible fetchRoute
export async function fetchRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  mode: TravelMode = "driving",
): Promise<Route> {
  return fetchNavigationRoute(origin, destination, mode);
}

// Multi-stop waypoint route
export async function fetchWaypointRoute(points: { lat: number; lon: number }[]): Promise<Route> {
  if (points.length < 2) throw new Error("need at least 2 points for a route");
  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`routing failed: ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("no route found between these stops");
  return {
    coordinates: route.geometry.coordinates,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

export async function saveRouteAndCheckOverlap(route: Route, originText: string, destText: string): Promise<number> {
  const { matchedSegments } = await api<{ matchedSegments: number }>("/routes/search", {
    method: "POST",
    body: JSON.stringify({
      coordinates: route.coordinates,
      origin: originText,
      destination: destText,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
    }),
  });
  return matchedSegments;
}

export type RecommendedPoi = {
  id: string;
  name: string;
  category: string;
  tag: "budget_food" | "premium_experience" | "sunset_viewpoint" | "trek_trail" | "rest_stop" | "worth_the_detour" | "scenic";
  tagLabel: string;
  rating: number;
  totalRatings: number;
  photoUrl: string | null;
  lat: number;
  lon: number;
  kmAlongRoute: number;
  fractionAlongRoute: number;
  detourDistanceKm: number;
  detourDurationMin: number;
  estimatedVisitDurationMin: number;
  memoryCount: number;
  recentMemory: { id: string; thumbnailUrl: string | null; caption: string | null } | null;
  score: number;
};

export type CorridorSearchResponse = {
  route: {
    origin: string;
    destination: string;
    distanceKm: number;
    durationMin: number;
    coordinates: [number, number][];
    matchedSegmentCount: number;
    totalSegmentCount: number;
    overlapPercentage: number;
  };
  recommendations: RecommendedPoi[];
  groupedBuckets: {
    worthTheDetour: RecommendedPoi[];
    budgetFood: RecommendedPoi[];
    sunsetViewpoint: RecommendedPoi[];
    trekTrail: RecommendedPoi[];
    restStop: RecommendedPoi[];
    scenic: RecommendedPoi[];
  };
};

export async function fetchRouteCorridorRecommendations(params: {
  origin: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  mode?: TravelMode;
  maxDetourMinutes?: number;
  coordinates?: [number, number][];
  distanceKm?: number;
  durationMin?: number;
}): Promise<CorridorSearchResponse> {
  return await api<CorridorSearchResponse>("/routes/corridor-search", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

