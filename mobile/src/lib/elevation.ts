export type ElevationProfile = { gain: number; samples: number[] };

// Input: the route's path (a list of [lng, lat] points)
// Output: total climb along the route, and the sampled heights themselves
// (used to draw the elevation sparkline)
// Samples ~20 evenly spaced points instead of every point (the free API
// is slow/rate-limited on large batches) and adds up every uphill step.
// ponytail: Open-Elevation's public server is flaky under load; self-host
// it or switch providers if elevation calls start failing often.
export async function fetchElevationProfile(coordinates: [number, number][]): Promise<ElevationProfile> {
  if (coordinates.length < 2) return { gain: 0, samples: [] };

  const sampleCount = Math.min(20, coordinates.length);
  const step = Math.floor(coordinates.length / sampleCount) || 1;
  const sampled = coordinates.filter((_, i) => i % step === 0);

  const locations = sampled.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
  const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations }),
  });
  if (!res.ok) throw new Error(`elevation lookup failed: ${res.status}`);
  const data = (await res.json()) as { results: { elevation: number }[] };
  const samples = data.results.map((r) => r.elevation);

  let gain = 0;
  for (let i = 1; i < samples.length; i++) {
    const delta = samples[i] - samples[i - 1];
    if (delta > 0) gain += delta;
  }
  return { gain: Math.round(gain), samples };
}
