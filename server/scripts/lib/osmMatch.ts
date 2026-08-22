// Generalizes enrich-treks.ts's peak-node lookup to every POI category --
// finds the OSM node/way that a given POI most likely corresponds to (by
// tag + proximity + name match), so callers can read wikimedia_commons/
// image/opening_hours/website/fee tags straight off it. Never fabricates --
// returns null when nothing confidently matches.
import { fetchOverpass, type OsmElement } from "./overpass";

export type PoiCategory = "trek" | "viewpoint" | "temple" | "waterfall" | "beach" | "heritage";

const TAG_QUERY: Record<PoiCategory, string> = {
  trek: `node["natural"="peak"](around:300,{lat},{lon});`,
  viewpoint: `nwr["tourism"="viewpoint"](around:300,{lat},{lon});`,
  temple: `nwr["amenity"="place_of_worship"](around:300,{lat},{lon});`,
  waterfall: `nwr["waterway"="waterfall"](around:300,{lat},{lon});`,
  beach: `nwr["natural"="beach"](around:300,{lat},{lon});`,
  heritage: `nwr["tourism"="attraction"](around:300,{lat},{lon});`,
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Input: a POI's name/category/coords
// Output: the matching OSM element's tags, or null if none/ambiguous.
export async function findOsmMatch(poi: { name: string; lat: number; lon: number }, category: PoiCategory): Promise<OsmElement | null> {
  const template = TAG_QUERY[category];
  const query = `[out:json][timeout:60];(${template.replace("{lat}", String(poi.lat)).replace("{lon}", String(poi.lon))});out tags center;`;
  const elements = await fetchOverpass(query);
  if (elements.length === 0) return null;

  const target = normalize(poi.name);
  const named = elements.find((e) => e.tags?.name && normalize(e.tags.name) === target);
  if (named) return named;
  const partial = elements.find((e) => e.tags?.name && (normalize(e.tags.name).includes(target) || target.includes(normalize(e.tags.name))));
  if (partial) return partial;
  return elements.length === 1 ? elements[0]! : null;
}

// Input: an OSM `wikimedia_commons`/`image` tag value
// Output: a directly viewable Commons file URL + attribution, or null if the
// tag isn't a recognizable file reference (never fabricate a photo).
export function photoFromTag(tag: string | undefined): { url: string; sourceId: string } | null {
  if (!tag) return null;
  if (tag.startsWith("http://") || tag.startsWith("https://")) return { url: tag, sourceId: tag };
  const file = tag.startsWith("File:") ? tag.slice(5) : tag.startsWith("Category:") ? null : tag;
  if (!file) return null;
  return { url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`, sourceId: file };
}
