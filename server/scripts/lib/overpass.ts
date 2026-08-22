// Shared by the POI import and enrichment scripts -- not used by the running
// server. Talks to the free public Overpass API (no key, rate-limited).
// ponytail: overpass-api.de refuses connections from this environment as of
// 2026-08-22 (connection refused on 80/443, not just rate-limited) -- using
// the openstreetmap.fr mirror instead. Swap back if the main instance is
// confirmed back up.
const OVERPASS_URL = "https://overpass.openstreetmap.fr/api/interpreter";

export type OsmElement = {
  type?: "node" | "way" | "relation";
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; ref: number; role: string }[];
  tags?: Record<string, string>;
};

// Input: an Overpass QL query
// Output: parsed elements, retrying with backoff on the public instance's
// rate limit (429) so one 429 mid-run doesn't kill a whole script.
export async function fetchOverpass(query: string, attempt = 1): Promise<OsmElement[]> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "*/*",
      "User-Agent": "Musafir/0.1 (travel app MVP; POI enrichment script)",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (res.status === 429 && attempt <= 3) {
    const waitS = 30 * attempt;
    console.log(`  rate limited, waiting ${waitS}s before retry ${attempt}/3...`);
    await new Promise((r) => setTimeout(r, waitS * 1000));
    return fetchOverpass(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`overpass request failed: ${res.status} ${await res.text().catch(() => "")}`);
  const data = (await res.json()) as { elements?: OsmElement[] };
  return data.elements ?? [];
}

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}
