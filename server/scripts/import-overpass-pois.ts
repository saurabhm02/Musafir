// Run manually to (re)populate real India POIs from OpenStreetMap, e.g.:
//   bun run scripts/import-overpass-pois.ts --dry-run
//   bun run scripts/import-overpass-pois.ts --dry-run --area="Himachal Pradesh" --limit=50
//   bun run scripts/import-overpass-pois.ts
//
// Not wired into the running server -- this is a one-time/occasional
// maintenance script, not a live API call path. Safe to re-run: it skips
// anything within 200m of an existing same-category POI.
import { db } from "../src/lib/db";
import { fetchOverpass, haversineKm, type OsmElement } from "./lib/overpass";

type Category = "trek" | "viewpoint" | "temple" | "waterfall" | "beach" | "heritage";

// ponytail: OSM has no popularity/review-count signal, so "top" here just
// means "named + not a near-duplicate of something we already have," capped
// per category by --limit. Swap for a ranked source (e.g. review counts from
// a paid places API) if true popularity ranking is ever needed.
const CATEGORY_QUERIES: Record<Category, string> = {
  trek: `nwr["natural"="peak"]["name"](area.a);`,
  viewpoint: `nwr["tourism"="viewpoint"]["name"](area.a);`,
  temple: `nwr["amenity"="place_of_worship"]["religion"~"^(hindu|buddhist|jain|sikh)$"]["name"](area.a);`,
  waterfall: `nwr["waterway"="waterfall"]["name"](area.a);`,
  beach: `nwr["natural"="beach"]["name"](area.a);`,
  heritage: `nwr["tourism"="attraction"]["name"](area.a);`,
};

type Candidate = { name: string; category: Category; lat: number; lon: number; description: string | null };

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 300);
  const areaFilter = args.find((a) => a.startsWith("--area="))?.split("=")[1] ?? null;
  return { dryRun, limit, areaFilter };
}

function areaSelector(areaFilter: string | null): string {
  return areaFilter
    ? `area["name"="${areaFilter}"]["admin_level"="4"]->.a;`
    : `area["ISO3166-1"="IN"][admin_level=2]->.a;`;
}

async function fetchCategory(category: Category, areaFilter: string | null): Promise<OsmElement[]> {
  const query = `
    [out:json][timeout:180];
    ${areaSelector(areaFilter)}
    (
      ${CATEGORY_QUERIES[category]}
    );
    out center tags;
  `;
  return fetchOverpass(query);
}

function toPoint(el: OsmElement): { lat: number; lon: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lon: el.lon };
  if (el.center) return el.center;
  return null;
}

// Input: raw Overpass elements for one category
// Output: the same elements (with a resolved point) reordered to visit
// different ~1-degree (~110km) grid cells in turn, instead of Overpass's
// own internal ordering -- which tends to cluster by whichever region it
// scanned first (e.g. Andaman Islands ahead of the Himalayas for "peak").
// This runs BEFORE the --limit cap, so the cap ends up geographically
// spread across India rather than concentrated in one corner.
function spreadGeographically(elements: OsmElement[]): { el: OsmElement; point: { lat: number; lon: number } }[] {
  const cells = new Map<string, { el: OsmElement; point: { lat: number; lon: number } }[]>();
  for (const el of elements) {
    const point = toPoint(el);
    if (!point || !el.tags?.name) continue;
    const key = `${Math.floor(point.lat)},${Math.floor(point.lon)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push({ el, point });
    else cells.set(key, [{ el, point }]);
  }

  const buckets = [...cells.values()];
  const ordered: { el: OsmElement; point: { lat: number; lon: number } }[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const bucket of buckets) {
      const next = bucket.shift();
      if (next) {
        ordered.push(next);
        if (bucket.length > 0) remaining = true;
      }
    }
  }
  return ordered;
}

async function main() {
  const { dryRun, limit, areaFilter } = parseArgs();
  console.log(`Importing India POIs from OpenStreetMap -- ${dryRun ? "DRY RUN" : "LIVE"}, limit ${limit}/category${areaFilter ? `, area="${areaFilter}"` : " (all of India)"}`);

  const existing = await db.$queryRaw<{ lat: number; lon: number; category: string }[]>`
    select st_y(location::geometry) as lat, st_x(location::geometry) as lon, category from pois
  `;
  console.log(`${existing.length} POIs already in the database`);

  const accepted: Candidate[] = [];

  for (const category of Object.keys(CATEGORY_QUERIES) as Category[]) {
    console.log(`\nFetching ${category}...`);
    let elements: OsmElement[];
    try {
      elements = await fetchCategory(category, areaFilter);
    } catch (e) {
      console.error(`  failed: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    console.log(`  ${elements.length} raw results from Overpass`);
    const spread = spreadGeographically(elements);

    let kept = 0;
    for (const { el, point } of spread) {
      if (kept >= limit) break;
      const name = el.tags!.name!;

      const tooClose = [...existing, ...accepted].some((p) => p.category === category && haversineKm(point, p) <= 0.2);
      if (tooClose) continue;

      accepted.push({ name, category, lat: point.lat, lon: point.lon, description: el.tags?.description ?? null });
      kept++;
    }
    console.log(`  kept ${kept} after name/dedupe filtering`);

    // be polite to the free public Overpass instance between requests
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.log(`\n${accepted.length} POIs to insert total`);
  if (dryRun) {
    console.log("Dry run -- not writing to the database. Sample:");
    console.table(accepted.slice(0, 20));
    return;
  }

  let inserted = 0;
  for (const poi of accepted) {
    await db.$executeRaw`
      insert into pois (name, description, category, location, is_verified)
      values (${poi.name}, ${poi.description}, ${poi.category}, st_setsrid(st_makepoint(${poi.lon}, ${poi.lat}), 4326)::geography, true)
    `;
    inserted++;
    if (inserted % 100 === 0) console.log(`  inserted ${inserted}/${accepted.length}`);
  }
  console.log(`Done -- inserted ${inserted} POIs`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
