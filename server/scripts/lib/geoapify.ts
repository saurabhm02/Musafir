// Geoapify Places API (free tier, 3000 credits/day) -- address/city/state/
// district/country via reverse geocoding, plus best-effort opening_hours/
// website/entry_fee via a categorized nearby-places search matched by name.
// Never used for rating/review_count -- Geoapify doesn't carry those, and we
// don't guess (see enrich-pois.ts).
const BASE = "https://api.geoapify.com";

function key() {
  const k = process.env.GEOAPIFY_API_KEY;
  if (!k) throw new Error("GEOAPIFY_API_KEY not set");
  return k;
}

export type ReverseGeocode = {
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  formatted: string | null;
};

// Input: a POI's coordinates
// Output: administrative area names from OSM-backed reverse geocoding, or
// all-null if Geoapify has nothing for that point.
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocode> {
  const res = await fetch(`${BASE}/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${key()}`);
  if (!res.ok) return { country: null, state: null, district: null, city: null, formatted: null };
  const data = (await res.json()) as { features?: { properties?: Record<string, string> }[] };
  const p = data.features?.[0]?.properties;
  if (!p) return { country: null, state: null, district: null, city: null, formatted: null };
  return {
    country: p.country ?? null,
    state: p.state ?? null,
    district: p.state_district ?? p.county ?? null,
    city: p.city ?? p.suburb ?? null,
    formatted: p.formatted ?? null,
  };
}

export type PlaceExtras = {
  website: string | null;
  openingHours: string | null;
  entryFee: string | null;
  confidence: "high" | "medium" | "unverified";
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Input: a POI's name/coords + a Geoapify category string to search
// Output: whatever raw OSM tags Geoapify surfaces for the name-matching
// candidate within radiusM, or nulls if no confident match was found.
export async function findPlaceExtras(name: string, lat: number, lon: number, category: string, radiusM = 1500): Promise<PlaceExtras> {
  const res = await fetch(`${BASE}/v2/places?categories=${category}&filter=circle:${lon},${lat},${radiusM}&limit=10&apiKey=${key()}`);
  if (!res.ok) return { website: null, openingHours: null, entryFee: null, confidence: "unverified" };
  const data = (await res.json()) as { features?: { properties?: Record<string, any> }[] };
  const features = data.features ?? [];
  if (features.length === 0) return { website: null, openingHours: null, entryFee: null, confidence: "unverified" };

  const target = normalize(name);
  let best: { properties: Record<string, any> } | null = null;
  let confidence: PlaceExtras["confidence"] = "unverified";
  for (const f of features) {
    const fname = f.properties?.name;
    if (!fname) continue;
    const n = normalize(fname);
    if (n === target) {
      best = f as any;
      confidence = "high";
      break;
    }
    if (!best && (n.includes(target) || target.includes(n))) {
      best = f as any;
      confidence = "medium";
    }
  }
  if (!best) return { website: null, openingHours: null, entryFee: null, confidence: "unverified" };

  const raw = best.properties?.datasource?.raw ?? {};
  return {
    website: best.properties?.contact?.website ?? raw.website ?? raw["contact:website"] ?? null,
    openingHours: raw.opening_hours ?? null,
    entryFee: raw.fee ?? raw.charge ?? null,
    confidence,
  };
}
