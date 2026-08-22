// Enriches existing `trek` POIs with real trail geometry (poi_routes),
// structured metadata (poi_metadata), and photos (poi_photos) -- all from
// free, attributable sources (OpenStreetMap/Overpass + Nominatim + Wikimedia
// Commons file references tagged on the OSM data). Never invents a value:
// anything not found in a source is left NULL.
//
// Not wired into the running server -- run manually, safe to re-run (every
// insert is an upsert keyed by poi_id + source + source_id).
//
//   bun run scripts/enrich-treks.ts --dry-run
//   bun run scripts/enrich-treks.ts --dry-run --name="Kedarkantha"
//   bun run scripts/enrich-treks.ts --limit=10
//   bun run scripts/enrich-treks.ts
import { db } from "../src/lib/db";
import { fetchOverpass, type OsmElement } from "./lib/overpass";
import { findHikingRoute, parseDuration, parseDistanceKm, type Confidence } from "./lib/trekRoute";

type Poi = { id: string; name: string; lat: number; lon: number };

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 50);
  const nameFilter = args.find((a) => a.startsWith("--name="))?.split("=")[1]?.toLowerCase() ?? null;
  return { dryRun, limit, nameFilter };
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Input: a peak POI's coordinates
// Output: the original OSM `natural=peak` node's own tags (ele, wikimedia
// links, etc), re-fetched since the import script didn't persist raw tags.
async function findPeakNode(poi: Poi): Promise<OsmElement | null> {
  const query = `[out:json][timeout:60];node["natural"="peak"](around:250,${poi.lat},${poi.lon});out tags;`;
  const elements = await fetchOverpass(query);
  if (elements.length === 0) return null;
  const named = elements.find((e) => e.tags?.name && normalize(e.tags.name) === normalize(poi.name));
  return named ?? elements[0]!;
}

// Input: a lat/lon
// Output: { state, district } from OSM Nominatim reverse geocoding, or nulls
// -- ponytail: 1 req/sec free public endpoint, fine for this script's scale.
async function reverseGeocodeStateDistrict(lat: number, lon: number): Promise<{ state: string | null; district: string | null }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=8&addressdetails=1`;
  const res = await fetch(url, { headers: { "User-Agent": "Musafir/0.1 (travel app MVP; POI enrichment script)" } });
  if (!res.ok) return { state: null, district: null };
  const data = (await res.json()) as { address?: Record<string, string> };
  return {
    state: data.address?.state ?? null,
    district: data.address?.state_district ?? data.address?.county ?? null,
  };
}

// Input: an OSM `wikimedia_commons`/`image` tag value
// Output: a directly viewable Commons file URL + attribution, or null if the
// tag isn't a recognizable file reference (never fabricate a photo).
function photoFromTag(tag: string | undefined): { url: string; sourceId: string } | null {
  if (!tag) return null;
  if (tag.startsWith("http://") || tag.startsWith("https://")) return { url: tag, sourceId: tag };
  const file = tag.startsWith("File:") ? tag.slice(5) : tag.startsWith("Category:") ? null : tag;
  if (!file) return null;
  return { url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`, sourceId: file };
}

async function enrichOne(poi: Poi, dryRun: boolean) {
  console.log(`\n${poi.name} (${poi.lat}, ${poi.lon})`);

  const [route, peakNode] = await Promise.all([findHikingRoute(poi), findPeakNode(poi)]);
  await new Promise((r) => setTimeout(r, 1100)); // stay under Nominatim's 1req/s
  const { state, district } = await reverseGeocodeStateDistrict(poi.lat, poi.lon);

  if (route) {
    console.log(`  route: "${route.relation.tags?.name ?? "(unnamed)"}" -- ${route.distanceKm.toFixed(1)}km, confidence=${route.confidence}`);
  } else {
    console.log("  route: none found nearby");
  }

  const difficulty = route?.relation.tags?.sac_scale ?? null;
  const distanceKm = parseDistanceKm(route?.relation.tags?.distance) ?? (route ? route.distanceKm : null);
  const durationHours = parseDuration(route?.relation.tags?.duration);
  const elevationGainM = route?.relation.tags?.ascent ? Number(route.relation.tags.ascent) : null;
  const maxElevationM = peakNode?.tags?.ele ? Number(peakNode.tags.ele) : null;
  const startingPoint = route?.relation.tags?.from ?? null;
  const endingPoint = route?.relation.tags?.to ?? null;
  const metadataConfidence: Confidence = route?.confidence ?? "unverified";

  const photoTag = photoFromTag(route?.relation.tags?.wikimedia_commons) ?? photoFromTag(route?.relation.tags?.image) ?? photoFromTag(peakNode?.tags?.wikimedia_commons) ?? photoFromTag(peakNode?.tags?.image);

  console.log(
    `  metadata: difficulty=${difficulty ?? "-"} distance=${distanceKm?.toFixed(1) ?? "-"}km duration=${durationHours ?? "-"}h ele_gain=${elevationGainM ?? "-"}m max_ele=${maxElevationM ?? "-"}m state=${state ?? "-"} district=${district ?? "-"}`,
  );
  console.log(`  photo: ${photoTag ? photoTag.url : "none found"}`);

  if (dryRun) return;

  await db.poi_metadata.upsert({
    where: { poi_id: poi.id },
    create: {
      poi_id: poi.id,
      difficulty,
      distance_km: distanceKm,
      duration_hours: durationHours,
      elevation_gain_m: elevationGainM,
      max_elevation_m: maxElevationM,
      best_time: null,
      starting_point: startingPoint,
      ending_point: endingPoint,
      state,
      district,
      source: "overpass,nominatim_reverse_geocode",
      confidence: metadataConfidence,
    },
    update: {
      difficulty,
      distance_km: distanceKm,
      duration_hours: durationHours,
      elevation_gain_m: elevationGainM,
      max_elevation_m: maxElevationM,
      starting_point: startingPoint,
      ending_point: endingPoint,
      state,
      district,
      source: "overpass,nominatim_reverse_geocode",
      confidence: metadataConfidence,
      updated_at: new Date(),
    },
  });

  if (route) {
    const wkt = `LINESTRING(${route.coordinates.map(([lon, lat]) => `${lon} ${lat}`).join(",")})`;
    await db.$executeRaw`
      insert into poi_routes (poi_id, route_type, geometry, distance_km, elevation_gain_m, source, source_id, confidence)
      values (${poi.id}::uuid, 'hiking', st_setsrid(st_geomfromtext(${wkt}), 4326)::geography, ${route.distanceKm}, ${elevationGainM}, 'overpass', ${String(route.relation.id)}, ${route.confidence})
      on conflict (poi_id, source, source_id) do update set
        geometry = excluded.geometry, distance_km = excluded.distance_km, elevation_gain_m = excluded.elevation_gain_m, confidence = excluded.confidence
    `;
  }

  if (photoTag) {
    await db.poi_photos.upsert({
      where: { poi_id_source_source_id: { poi_id: poi.id, source: "wikimedia_commons", source_id: photoTag.sourceId } },
      create: { poi_id: poi.id, source: "wikimedia_commons", source_id: photoTag.sourceId, url: photoTag.url, attribution: "Wikimedia Commons" },
      update: { url: photoTag.url },
    });
  }
}

async function main() {
  const { dryRun, limit, nameFilter } = parseArgs();
  const all = await db.$queryRaw<Poi[]>`
    select id, name, st_y(location::geometry) as lat, st_x(location::geometry) as lon
    from pois where category = 'trek'
  `;
  const targets = (nameFilter ? all.filter((t) => t.name.toLowerCase().includes(nameFilter)) : all).slice(0, limit);

  console.log(`Enriching ${targets.length} trek POI(s) -- ${dryRun ? "DRY RUN" : "LIVE"}`);

  for (const poi of targets) {
    try {
      await enrichOne(poi, dryRun);
    } catch (e) {
      console.error(`  failed: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, 3000)); // be polite to Overpass between treks
  }

  console.log(`\nDone -- processed ${targets.length} trek(s)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
