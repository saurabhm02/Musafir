// Shared by enrich-treks.ts and enrich-pois.ts: finds a real OSM hiking
// route relation near a peak/viewpoint POI and stitches its member ways into
// one LineString. Never invents a route by connecting POI coordinates.
import { fetchOverpass, haversineKm, type OsmElement } from "./overpass";

export type Confidence = "high" | "medium" | "low" | "unverified";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Input: a candidate hiking relation's own name tag + the POI's name
// Output: how confidently this relation represents that POI's trek
export function matchConfidence(relationName: string | undefined, poiName: string, candidateCount: number): Confidence {
  if (!relationName) return candidateCount === 1 ? "low" : "unverified";
  const a = normalize(relationName);
  const b = normalize(poiName);
  if (a === b) return "high";
  if (a.includes(b) || b.includes(a)) return "medium";
  return candidateCount === 1 ? "low" : "unverified";
}

// Input: a peak/viewpoint POI's coordinates
// Output: the nearest matching hiking route relation (with full geometry
// stitched from its member ways) + the confidence that it's the right one,
// or null if nothing usable was found nearby.
export async function findHikingRoute(poi: { name: string; lat: number; lon: number }) {
  const query = `
    [out:json][timeout:90];
    (relation["route"="hiking"](around:20000,${poi.lat},${poi.lon}););
    out tags;
    >;
    out geom;
  `;
  const elements = await fetchOverpass(query);
  const relations = elements.filter((e) => e.type === "relation");
  if (relations.length === 0) return null;

  const waysById = new Map<number, OsmElement>();
  for (const e of elements) if (e.type === "way" && e.id != null) waysById.set(e.id, e);

  const named = relations.find((r) => matchConfidence(r.tags?.name, poi.name, relations.length) !== "unverified");
  const relation = named ?? (relations.length === 1 ? relations[0] : null);
  if (!relation) return null;

  const coordinates: [number, number][] = [];
  for (const member of relation.members ?? []) {
    if (member.type !== "way") continue;
    const way = waysById.get(member.ref);
    if (!way?.geometry) continue;
    for (const pt of way.geometry) coordinates.push([pt.lon, pt.lat]);
  }
  if (coordinates.length < 2) return null;

  let distanceKm = 0;
  for (let i = 1; i < coordinates.length; i++) {
    distanceKm += haversineKm({ lat: coordinates[i - 1]![1], lon: coordinates[i - 1]![0] }, { lat: coordinates[i]![1], lon: coordinates[i]![0] });
  }

  return {
    relation,
    coordinates,
    distanceKm,
    confidence: matchConfidence(relation.tags?.name, poi.name, relations.length),
  };
}

export function parseDuration(tag: string | undefined): number | null {
  if (!tag) return null;
  const m = tag.match(/^(\d+):(\d+)$/);
  if (!m) return Number.isFinite(Number(tag)) ? Number(tag) : null;
  return Number(m[1]) + Number(m[2]) / 60;
}

export function parseDistanceKm(tag: string | undefined): number | null {
  if (!tag) return null;
  const n = parseFloat(tag);
  return Number.isFinite(n) ? n : null;
}
