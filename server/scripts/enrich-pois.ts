// Enriches existing POIs (any category) with real, verified, source-tracked
// data -- never fabricated. Combines:
//   - Geoapify reverse geocoding -> country/state/district/city/address
//   - Geoapify categorized places search -> website/opening_hours/entry_fee
//     (best-effort, only kept when the candidate's name matches the POI's)
//   - OpenStreetMap/Overpass -> wikimedia_commons/image photo tag, plus (for
//     trek/viewpoint) trail geometry + trek-specific metadata
// Anything not found in a source is left NULL, never guessed. Idempotent --
// every write is an upsert keyed by poi_id (+source/source_id for photos
// and routes), safe to re-run.
//
//   bun run scripts/enrich-pois.ts --pilot            # the 20-POI test set
//   bun run scripts/enrich-pois.ts --pilot --dry-run
//   bun run scripts/enrich-pois.ts --category=temple --limit=50
//   bun run scripts/enrich-pois.ts --limit=1803        # full run (slow, hours)
import { db } from "../src/lib/db";
import { reverseGeocode, findPlaceExtras } from "./lib/geoapify";
import { findOsmMatch, photoFromTag, type PoiCategory } from "./lib/osmMatch";
import { findHikingRoute, parseDuration, parseDistanceKm } from "./lib/trekRoute";

type Poi = { id: string; name: string; category: string; address: string | null; lat: number; lon: number };

const GEOAPIFY_CATEGORY: Record<PoiCategory, string> = {
  trek: "natural.mountain.peak",
  viewpoint: "tourism.attraction.viewpoint",
  temple: "religion.place_of_worship",
  waterfall: "natural",
  beach: "beach",
  heritage: "tourism.sights",
};

const TREK_LIKE = new Set(["trek", "viewpoint"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const pilot = args.includes("--pilot");
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 20);
  const category = args.find((a) => a.startsWith("--category="))?.split("=")[1] ?? null;
  return { dryRun, pilot, limit, category };
}

async function pilotSet(): Promise<Poi[]> {
  const pick = async (category: string, n: number) =>
    db.$queryRaw<Poi[]>`
      select id, name, category, address, st_y(location::geometry) as lat, st_x(location::geometry) as lon
      from pois where category = ${category}::text order by name limit ${n}
    `;
  const [trek, temple, viewpoint, waterfall, beach] = await Promise.all([
    pick("trek", 5),
    pick("temple", 5),
    pick("viewpoint", 5),
    pick("waterfall", 3),
    pick("beach", 2),
  ]);
  return [...trek, ...temple, ...viewpoint, ...waterfall, ...beach];
}

type Result = { poi: Poi; ok: boolean; error?: string; hasAddress: boolean; hasPhoto: boolean; hasRoute: boolean; hasTrekMeta: boolean };

async function enrichOne(poi: Poi, dryRun: boolean): Promise<Result> {
  console.log(`\n${poi.name} [${poi.category}] (${poi.lat}, ${poi.lon})`);
  const category = poi.category as PoiCategory;

  const [geo, extras, osmMatch] = await Promise.all([
    reverseGeocode(poi.lat, poi.lon),
    GEOAPIFY_CATEGORY[category] ? findPlaceExtras(poi.name, poi.lat, poi.lon, GEOAPIFY_CATEGORY[category]) : Promise.resolve(null),
    findOsmMatch(poi, category),
  ]);

  console.log(`  geoapify: city=${geo.city ?? "-"} district=${geo.district ?? "-"} state=${geo.state ?? "-"} country=${geo.country ?? "-"}`);
  if (extras) console.log(`  geoapify extras: website=${extras.website ?? "-"} hours=${extras.openingHours ?? "-"} fee=${extras.entryFee ?? "-"} confidence=${extras.confidence}`);
  console.log(`  osm match: ${osmMatch ? (osmMatch.tags?.name ?? "(unnamed, single candidate)") : "none"}`);

  const photoTag = photoFromTag(osmMatch?.tags?.wikimedia_commons) ?? photoFromTag(osmMatch?.tags?.image);

  let route: Awaited<ReturnType<typeof findHikingRoute>> = null;
  let trekMeta: { difficulty: string | null; distanceKm: number | null; durationHours: number | null; elevationGainM: number | null; maxElevationM: number | null; startingPoint: string | null; endingPoint: string | null; confidence: string } | null = null;

  if (TREK_LIKE.has(category)) {
    route = await findHikingRoute(poi);
    const maxElevationM = osmMatch?.tags?.ele ? Number(osmMatch.tags.ele) : null;
    trekMeta = {
      difficulty: route?.relation.tags?.sac_scale ?? null,
      distanceKm: parseDistanceKm(route?.relation.tags?.distance) ?? (route ? route.distanceKm : null),
      durationHours: parseDuration(route?.relation.tags?.duration),
      elevationGainM: route?.relation.tags?.ascent ? Number(route.relation.tags.ascent) : null,
      maxElevationM,
      startingPoint: route?.relation.tags?.from ?? null,
      endingPoint: route?.relation.tags?.to ?? null,
      confidence: route?.confidence ?? "unverified",
    };
    console.log(`  trek meta: distance=${trekMeta.distanceKm?.toFixed(1) ?? "-"}km ele_gain=${trekMeta.elevationGainM ?? "-"}m max_ele=${trekMeta.maxElevationM ?? "-"}m route=${route ? "found" : "none"}`);
  }

  console.log(`  photo: ${photoTag ? photoTag.url : "none found"}`);

  const result: Result = {
    poi,
    ok: true,
    hasAddress: !!(geo.formatted || geo.city || geo.state),
    hasPhoto: !!photoTag,
    hasRoute: !!route,
    hasTrekMeta: !!trekMeta && (trekMeta.distanceKm != null || trekMeta.elevationGainM != null || trekMeta.maxElevationM != null),
  };

  if (dryRun) return result;

  if (!poi.address && geo.formatted) {
    await db.pois.update({ where: { id: poi.id }, data: { address: geo.formatted } });
  }

  await db.poi_metadata.upsert({
    where: { poi_id: poi.id },
    create: {
      poi_id: poi.id,
      difficulty: trekMeta?.difficulty ?? null,
      distance_km: trekMeta?.distanceKm ?? null,
      duration_hours: trekMeta?.durationHours ?? null,
      elevation_gain_m: trekMeta?.elevationGainM ?? null,
      max_elevation_m: trekMeta?.maxElevationM ?? null,
      starting_point: trekMeta?.startingPoint ?? null,
      ending_point: trekMeta?.endingPoint ?? null,
      state: geo.state,
      district: geo.district,
      source: "geoapify_reverse_geocode" + (trekMeta ? ",overpass" : ""),
      confidence: trekMeta?.confidence ?? (geo.state ? "high" : "unverified"),
    },
    update: {
      difficulty: trekMeta?.difficulty ?? null,
      distance_km: trekMeta?.distanceKm ?? null,
      duration_hours: trekMeta?.durationHours ?? null,
      elevation_gain_m: trekMeta?.elevationGainM ?? null,
      max_elevation_m: trekMeta?.maxElevationM ?? null,
      starting_point: trekMeta?.startingPoint ?? null,
      ending_point: trekMeta?.endingPoint ?? null,
      state: geo.state,
      district: geo.district,
      source: "geoapify_reverse_geocode" + (trekMeta ? ",overpass" : ""),
      confidence: trekMeta?.confidence ?? (geo.state ? "high" : "unverified"),
      updated_at: new Date(),
    },
  });

  await db.poi_details.upsert({
    where: { poi_id: poi.id },
    create: {
      poi_id: poi.id,
      city: geo.city,
      country: geo.country,
      website: extras?.website ?? null,
      opening_hours: extras?.openingHours ?? null,
      entry_fee: extras?.entryFee ?? null,
      source: "geoapify",
      confidence: extras && extras.confidence !== "unverified" ? extras.confidence : geo.country ? "high" : "unverified",
    },
    update: {
      city: geo.city,
      country: geo.country,
      website: extras?.website ?? null,
      opening_hours: extras?.openingHours ?? null,
      entry_fee: extras?.entryFee ?? null,
      source: "geoapify",
      confidence: extras && extras.confidence !== "unverified" ? extras.confidence : geo.country ? "high" : "unverified",
      updated_at: new Date(),
    },
  });

  if (route) {
    const wkt = `LINESTRING(${route.coordinates.map(([lon, lat]) => `${lon} ${lat}`).join(",")})`;
    await db.$executeRaw`
      insert into poi_routes (poi_id, route_type, geometry, distance_km, elevation_gain_m, source, source_id, confidence)
      values (${poi.id}::uuid, 'hiking', st_setsrid(st_geomfromtext(${wkt}), 4326)::geography, ${route.distanceKm}, ${trekMeta?.elevationGainM ?? null}, 'overpass', ${String(route.relation.id)}, ${route.confidence})
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

  return result;
}

async function main() {
  const { dryRun, pilot, limit, category } = parseArgs();

  let targets: Poi[];
  if (pilot) {
    targets = await pilotSet();
  } else if (category) {
    targets = await db.$queryRaw<Poi[]>`
      select id, name, category, address, st_y(location::geometry) as lat, st_x(location::geometry) as lon
      from pois where category = ${category}::text limit ${limit}
    `;
  } else {
    targets = await db.$queryRaw<Poi[]>`
      select id, name, category, address, st_y(location::geometry) as lat, st_x(location::geometry) as lon
      from pois limit ${limit}
    `;
  }

  console.log(`Enriching ${targets.length} POI(s) -- ${dryRun ? "DRY RUN" : "LIVE"}`);

  const results: Result[] = [];
  for (const poi of targets) {
    try {
      results.push(await enrichOne(poi, dryRun));
    } catch (e) {
      console.error(`  failed: ${e instanceof Error ? e.message : e}`);
      results.push({ poi, ok: false, error: e instanceof Error ? e.message : String(e), hasAddress: false, hasPhoto: false, hasRoute: false, hasTrekMeta: false });
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  const total = results.length;
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n=== Enrichment report ===");
  console.log(`total: ${total}`);
  console.log(`succeeded: ${succeeded}`);
  console.log(`with address/city/state/country: ${results.filter((r) => r.hasAddress).length}`);
  console.log(`with photo: ${results.filter((r) => r.hasPhoto).length}`);
  console.log(`with route geometry: ${results.filter((r) => r.hasRoute).length}`);
  console.log(`with trek metadata: ${results.filter((r) => r.hasTrekMeta).length}`);
  if (failed.length) {
    console.log(`failed (${failed.length}):`);
    for (const f of failed) console.log(`  - ${f.poi.name}: ${f.error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
