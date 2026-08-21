export type Place = { lat: number; lon: number; label: string };

// Input: a place name typed by the user, e.g. "Triund"
// Output: its coordinates, or null if nothing matched
// ponytail: uses OSM Nominatim's free public endpoint (1 req/sec, no key).
// Swap for a paid geocoder (Mapbox/Google) if usage outgrows that limit.
export async function geocode(query: string): Promise<Place | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Musafir/0.1 (travel app MVP)" } });
  if (!res.ok) throw new Error(`geocoding failed: ${res.status}`);
  const results = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const first = results[0];
  if (!first) return null;
  return { lat: Number(first.lat), lon: Number(first.lon), label: first.display_name };
}
