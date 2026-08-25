import { db } from "../lib/db";

export type CorridorSearchInput = {
  origin: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  mode?: "driving" | "walking";
  categories?: string[];
  maxDetourMinutes?: number;
  maxCorridorKm?: number;
  coordinates?: [number, number][];
  distanceKm?: number;
  durationMin?: number;
};

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

// Helper: Haversine distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Helper: Fetch driving navigation route from OSRM if client didn't supply one
async function fetchRouteFromProvider(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  mode: "driving" | "walking" = "driving",
): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMin: number }> {
  const profile = mode === "walking" ? "foot" : "driving";
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url, { headers: { "User-Agent": "Musafir-Corridor-Engine/1.0" } });
  if (!res.ok) throw new Error(`Routing provider returned status ${res.status}`);
  const data = (await res.json()) as {
    routes?: Array<{
      geometry: { coordinates: [number, number][] };
      distance: number;
      duration: number;
    }>;
  };
  const r = data.routes?.[0];
  if (!r) throw new Error("No route found between coordinates");

  return {
    coordinates: r.geometry.coordinates,
    distanceKm: Math.round((r.distance / 1000) * 10) / 10,
    durationMin: Math.round(r.duration / 60),
  };
}

// Helper: Batch compute true road detours using OSRM Table Matrix API for top candidates
async function calculateBatchRoadDetours(
  candidates: Array<{ id: string; lat: number; lon: number; perpDistKm: number }>,
  routeCoords: [number, number][],
): Promise<Map<string, { detourDistanceKm: number; detourDurationMin: number }>> {
  const result = new Map<string, { detourDistanceKm: number; detourDurationMin: number }>();
  if (candidates.length === 0) return result;

  // For each candidate, find closest polyline waypoint
  const pairs: Array<{ poi: { id: string; lat: number; lon: number; perpDistKm: number }; routePoint: [number, number] }> = [];
  for (const c of candidates) {
    let closestCoord: [number, number] = routeCoords[0]!;
    let minDist = Infinity;
    // Sample every 5th route coordinate for fast snapped point detection
    const step = Math.max(1, Math.floor(routeCoords.length / 100));
    for (let i = 0; i < routeCoords.length; i += step) {
      const pt = routeCoords[i]!;
      const d = haversineMeters(c.lat, c.lon, pt[1], pt[0]);
      if (d < minDist) {
        minDist = d;
        closestCoord = pt;
      }
    }
    pairs.push({ poi: c, routePoint: closestCoord });
  }

  // Attempt batch OSRM Table call for the pairs
  try {
    // Format: coords = routePt1;poiPt1;routePt2;poiPt2...
    const coordStrings: string[] = [];
    for (const p of pairs) {
      coordStrings.push(`${p.routePoint[0]},${p.routePoint[1]}`);
      coordStrings.push(`${p.poi.lon},${p.poi.lat}`);
    }
    const tableUrl = `https://router.project-osrm.org/table/v1/driving/${coordStrings.join(";")}?annotations=duration,distance`;
    const res = await fetch(tableUrl, { headers: { "User-Agent": "Musafir-Detour-Matrix/1.0" } });

    if (res.ok) {
      const data = (await res.json()) as {
        durations?: number[][];
        distances?: number[][];
      };
      if (data.durations && data.distances) {
        for (let i = 0; i < pairs.length; i++) {
          const routeIdx = i * 2;
          const poiIdx = i * 2 + 1;
          const distToPoi = data.distances[routeIdx]?.[poiIdx] ?? 0;
          const distFromPoi = data.distances[poiIdx]?.[routeIdx] ?? distToPoi;
          const durToPoi = data.durations[routeIdx]?.[poiIdx] ?? 0;
          const durFromPoi = data.durations[poiIdx]?.[routeIdx] ?? durToPoi;

          const totalDetourM = distToPoi + distFromPoi;
          const totalDetourSec = durToPoi + durFromPoi;

          if (totalDetourM > 0) {
            result.set(pairs[i]!.poi.id, {
              detourDistanceKm: Math.max(0.1, Math.round((totalDetourM / 1000) * 10) / 10),
              detourDurationMin: Math.max(1, Math.round(totalDetourSec / 60)),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("OSRM Table matrix calculation fallback to heuristic:", err);
  }

  // Fill in any missing or failed candidates using the road tortuosity heuristic (2 * d_perp * 1.35)
  for (const c of candidates) {
    if (!result.has(c.id)) {
      const estRoadDistKm = Math.round(c.perpDistKm * 2 * 1.35 * 10) / 10;
      const estTimeMin = Math.max(1, Math.round((estRoadDistKm / 45) * 60)); // ~45 km/h avg detour road speed
      result.set(c.id, {
        detourDistanceKm: estRoadDistKm,
        detourDurationMin: estTimeMin,
      });
    }
  }

  return result;
}

// Main Smart Route Overlap & Corridor Detour Discovery
export async function searchRouteCorridor(
  input: CorridorSearchInput,
  userId?: string,
): Promise<CorridorSearchResponse> {
  const originName = input.origin.name || "Origin";
  const destName = input.destination.name || "Destination";
  const maxDetourMin = input.maxDetourMinutes ?? 30;

  // 1. Resolve Navigation Route
  let coordinates = input.coordinates;
  let distanceKm = input.distanceKm;
  let durationMin = input.durationMin;

  if (!coordinates || coordinates.length < 2 || !distanceKm || !durationMin) {
    const calculated = await fetchRouteFromProvider(input.origin, input.destination, input.mode ?? "driving");
    coordinates = calculated.coordinates;
    distanceKm = calculated.distanceKm;
    durationMin = calculated.durationMin;
  }

  const geojson = JSON.stringify({ type: "LineString", coordinates });

  // 2. Perform Smart Route Overlap Check (Async/Non-blocking match)
  let matchedSegmentCount = 0;
  try {
    const [overlapRow] = await db.$queryRaw<{ matched_segment_count: number }[]>`
      select * from search_route(
        ${geojson},
        ${originName},
        ${destName},
        ${distanceKm},
        ${durationMin},
        ${userId ? userId : null}::uuid
      )
    `;
    matchedSegmentCount = overlapRow?.matched_segment_count ?? 0;
  } catch (err) {
    console.warn("Smart route overlap check non-fatal error:", err);
  }

  const totalSegmentCount = Math.max(1, Math.ceil((distanceKm * 1000) / 500));
  const overlapPercentage = Math.min(100, Math.round((matchedSegmentCount / totalSegmentCount) * 1000) / 10);

  // 3. PostGIS Spatial Corridor Discovery (< 15km buffer along entire route)
  const maxCorridorMeters = (input.maxCorridorKm ?? (distanceKm > 100 ? 15 : 8)) * 1000;

  const candidatePois = await db.$queryRaw<
    {
      id: string;
      name: string;
      category: string;
      is_verified: boolean;
      lat: number;
      lon: number;
      avg_rating: number | null;
      total_ratings: number | null;
      tags: string[];
      perp_dist_km: number;
      fraction_along_route: number;
      visit_duration_min: number | null;
    }[]
  >`
    WITH route_data AS (
      SELECT st_setsrid(st_geomfromgeojson(${geojson}), 4326)::geometry as geom,
             st_setsrid(st_geomfromgeojson(${geojson}), 4326)::geography as geog
    )
    SELECT
      p.id,
      p.name,
      p.category,
      p.is_verified,
      st_y(p.location::geometry) as lat,
      st_x(p.location::geometry) as lon,
      p.avg_rating,
      p.total_ratings,
      p.tags,
      (st_distance(p.location, r.geog) / 1000.0) as perp_dist_km,
      st_linelocatepoint(r.geom, p.location::geometry) as fraction_along_route,
      pm.estimated_visit_duration_minutes as visit_duration_min
    FROM pois p
    CROSS JOIN route_data r
    LEFT JOIN poi_metadata pm ON pm.poi_id = p.id
    WHERE st_dwithin(p.location, r.geog, ${maxCorridorMeters})
    ORDER BY st_distance(p.location, r.geog) ASC
    LIMIT 60
  `;

  if (candidatePois.length === 0) {
    return {
      route: {
        origin: originName,
        destination: destName,
        distanceKm,
        durationMin,
        coordinates,
        matchedSegmentCount,
        totalSegmentCount,
        overlapPercentage,
      },
      recommendations: [],
      groupedBuckets: {
        worthTheDetour: [],
        budgetFood: [],
        sunsetViewpoint: [],
        trekTrail: [],
        restStop: [],
        scenic: [],
      },
    };
  }

  // 4. Batch fetch POI photos and Traveler Memories for Candidates
  const candidateIds = candidatePois.map((c) => c.id);

  const [photos, memories] = await Promise.all([
    db.poi_photos.findMany({
      where: { poi_id: { in: candidateIds } },
      select: { poi_id: true, url: true },
      orderBy: { created_at: "asc" },
    }),
    db.memories.findMany({
      where: { poi_id: { in: candidateIds }, visibility: "public", deleted_at: null },
      select: {
        id: true,
        poi_id: true,
        photo_url: true,
        thumbnail_url: true,
        caption: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const photoMap = new Map<string, string>();
  for (const ph of photos) {
    if (ph.poi_id && !photoMap.has(ph.poi_id)) photoMap.set(ph.poi_id, ph.url);
  }
  const memoryMap = new Map<string, { count: number; recent: { id: string; thumbnailUrl: string | null; caption: string | null } | null }>();
  for (const m of memories) {
    if (!m.poi_id) continue;
    const current = memoryMap.get(m.poi_id) || { count: 0, recent: null };
    current.count += 1;
    if (!current.recent && (m.thumbnail_url || m.photo_url)) {
      current.recent = {
        id: m.id,
        thumbnailUrl: m.thumbnail_url || m.photo_url,
        caption: m.caption,
      };
    }
    if (!photoMap.has(m.poi_id) && m.photo_url) {
      photoMap.set(m.poi_id, m.photo_url);
    }
    memoryMap.set(m.poi_id, current);
  }

  // 5. Tier 2 & Tier 3: Batch True Detour Calculation for Top 20 Candidates
  const topCandidatesForDetour = candidatePois
    .slice()
    .sort((a, b) => a.perp_dist_km - b.perp_dist_km)
    .slice(0, 20)
    .map((c) => ({ id: c.id, lat: c.lat, lon: c.lon, perpDistKm: Number(c.perp_dist_km) }));

  const detourMap = await calculateBatchRoadDetours(topCandidatesForDetour, coordinates);

  // 6. Recommendation Ranking & Tag Assignment
  const recommendations: RecommendedPoi[] = [];

  for (const c of candidatePois) {
    const detour = detourMap.get(c.id) || {
      detourDistanceKm: Math.round(Number(c.perp_dist_km) * 2 * 1.35 * 10) / 10,
      detourDurationMin: Math.max(1, Math.round(((Number(c.perp_dist_km) * 2 * 1.35) / 45) * 60)),
    };

    if (detour.detourDurationMin > maxDetourMin) continue;

    const rating = c.avg_rating ? Number(c.avg_rating) : 4.0;
    const totalRatings = c.total_ratings ?? 0;
    const memData = memoryMap.get(c.id) || { count: 0, recent: null };
    const memoryCount = memData.count;

    // Multi-factor Utility Scoring Function
    const detourScore = Math.exp(-detour.detourDurationMin / 15) * 100;
    const qualityScore = (rating / 5.0) * 70 + (c.is_verified ? 30 : 0);
    const socialScore = Math.min(100, Math.log(1 + memoryCount * 3 + totalRatings) * 25);
    const totalScore = Math.round((0.35 * detourScore + 0.25 * qualityScore + 0.20 * socialScore + 20) * 10) / 10;

    // Curated Tag Assignment
    const catLower = c.category.toLowerCase();
    let tag: RecommendedPoi["tag"] = "scenic";
    let tagLabel = "Scenic Spot";

    if (
      catLower.includes("restaurant") ||
      catLower.includes("food") ||
      catLower.includes("dhaba") ||
      catLower.includes("cafe")
    ) {
      tag = "budget_food";
      tagLabel = "Budget Food";
    } else if (
      catLower.includes("stay") ||
      catLower.includes("resort") ||
      catLower.includes("palace") ||
      catLower.includes("heritage")
    ) {
      tag = "premium_experience";
      tagLabel = "Premium Stay";
    } else if (
      catLower.includes("sunset") ||
      catLower.includes("viewpoint") ||
      catLower.includes("lake") ||
      catLower.includes("hill")
    ) {
      tag = "sunset_viewpoint";
      tagLabel = "Sunset & Viewpoint";
    } else if (
      catLower.includes("trek") ||
      catLower.includes("trail") ||
      catLower.includes("waterfall") ||
      catLower.includes("hike")
    ) {
      tag = "trek_trail";
      tagLabel = "Trek & Trail";
    } else if (detour.detourDurationMin <= 5) {
      tag = "rest_stop";
      tagLabel = "Quick Rest Stop";
    } else if (rating >= 4.4 && (memoryCount >= 3 || totalRatings >= 50)) {
      tag = "worth_the_detour";
      tagLabel = "Worth the Detour";
    }

    const kmAlongRoute = Math.round(Number(c.fraction_along_route) * distanceKm * 10) / 10;

    recommendations.push({
      id: c.id,
      name: c.name,
      category: c.category,
      tag,
      tagLabel,
      rating,
      totalRatings,
      photoUrl: photoMap.get(c.id) ?? null,
      lat: c.lat,
      lon: c.lon,
      kmAlongRoute,
      fractionAlongRoute: Math.round(Number(c.fraction_along_route) * 1000) / 1000,
      detourDistanceKm: detour.detourDistanceKm,
      detourDurationMin: detour.detourDurationMin,
      estimatedVisitDurationMin: c.visit_duration_min ?? (tag === "rest_stop" ? 20 : tag === "budget_food" ? 45 : 60),
      memoryCount,
      recentMemory: memData.recent,
      score: totalScore,
    });
  }

  // Sort chronologically along the route
  recommendations.sort((a, b) => a.fractionAlongRoute - b.fractionAlongRoute);

  // Group into curated buckets
  const groupedBuckets: CorridorSearchResponse["groupedBuckets"] = {
    worthTheDetour: recommendations.filter((r) => r.tag === "worth_the_detour" || r.score >= 85),
    budgetFood: recommendations.filter((r) => r.tag === "budget_food"),
    sunsetViewpoint: recommendations.filter((r) => r.tag === "sunset_viewpoint"),
    trekTrail: recommendations.filter((r) => r.tag === "trek_trail"),
    restStop: recommendations.filter((r) => r.tag === "rest_stop"),
    scenic: recommendations.filter((r) => r.tag === "scenic"),
  };

  return {
    route: {
      origin: originName,
      destination: destName,
      distanceKm,
      durationMin,
      coordinates,
      matchedSegmentCount,
      totalSegmentCount,
      overlapPercentage,
    },
    recommendations,
    groupedBuckets,
  };
}
