import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "musafir:lastLocation";

export type Coords = { lat: number; lon: number };

export type NavigationLocation = {
  lat: number;
  lon: number;
  heading: number | null;
  speedKmh: number | null;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
};

// Returns the last GPS fix read from cache if any
export async function getCachedLocation(): Promise<Coords | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
}

// Requests foreground permission and gets a single fresh location fix
export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(coords)).catch(() => {});
    return coords;
  } catch {
    return null;
  }
}

// Starts high-frequency, continuous real GPS tracking specifically tuned for active navigation
export async function watchNavigationLocation(
  onUpdate: (loc: NavigationLocation) => void,
  onError?: (err: Error) => void,
): Promise<() => void> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Location permission denied");
    }

    let lastCoords: Coords | null = null;

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000, // update every 1 second
        distanceInterval: 2, // update every 2 meters
      },
      (location) => {
        let heading = location.coords.heading;

        // If GPS heading is unavailable (-1 or null), calculate bearing from previous fix
        if ((heading == null || heading < 0) && lastCoords) {
          const calculated = calculateBearing(lastCoords, {
            lat: location.coords.latitude,
            lon: location.coords.longitude,
          });
          if (calculated != null) heading = calculated;
        }

        lastCoords = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        };

        const speedMps = location.coords.speed;
        const speedKmh = speedMps != null && speedMps >= 0 ? Math.round(speedMps * 3.6) : null;

        const navLoc: NavigationLocation = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
          heading: heading != null && heading >= 0 ? Math.round(heading) : null,
          speedKmh,
          accuracy: location.coords.accuracy ?? null,
          altitude: location.coords.altitude ?? null,
          timestamp: location.timestamp,
        };

        // Cache last location
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(lastCoords)).catch(() => {});

        onUpdate(navLoc);
      },
    );

    return () => {
      subscription.remove();
    };
  } catch (err) {
    if (onError && err instanceof Error) onError(err);
    return () => {};
  }
}

// Helper: Calculate initial bearing (0-360 deg) between two points
export function calculateBearing(start: Coords, end: Coords): number | null {
  const dLon = ((end.lon - start.lon) * Math.PI) / 180;
  const lat1 = (start.lat * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;

  if (Math.abs(start.lat - end.lat) < 0.00001 && Math.abs(start.lon - end.lon) < 0.00001) {
    return null;
  }

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Helper: Great-circle distance between two coords in meters
export function haversineMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

// Helper: Distance in meters from a point to a line segment [p1, p2]
export function distanceToSegmentMeters(p: Coords, a: Coords, b: Coords): number {
  const dAB = haversineMeters(a, b);
  if (dAB === 0) return haversineMeters(p, a);

  // Project point onto segment in spherical approximate space
  const dAP = haversineMeters(a, p);
  const dBP = haversineMeters(b, p);

  // If projection falls outside segment, distance is to nearest endpoint
  if (dBP * dBP >= dAP * dAP + dAB * dAB) return dAP;
  if (dAP * dAP >= dBP * dBP + dAB * dAB) return dBP;

  // Otherwise calculate perpendicular distance via Heron's formula
  const s = (dAB + dAP + dBP) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - dAB) * (s - dAP) * (s - dBP)));
  return (2 * area) / dAB;
}

// Helper: Minimum distance in meters from point to any segment along a polyline [[lon, lat], ...]
export function minDistanceToPolylineMeters(point: Coords, coordinates: [number, number][]): {
  minDistanceM: number;
  nearestSegmentIndex: number;
} {
  if (coordinates.length === 0) return { minDistanceM: Infinity, nearestSegmentIndex: -1 };
  if (coordinates.length === 1) {
    return {
      minDistanceM: haversineMeters(point, { lat: coordinates[0][1], lon: coordinates[0][0] }),
      nearestSegmentIndex: 0,
    };
  }

  let minDistanceM = Infinity;
  let nearestSegmentIndex = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = { lat: coordinates[i][1], lon: coordinates[i][0] };
    const b = { lat: coordinates[i + 1][1], lon: coordinates[i + 1][0] };
    const dist = distanceToSegmentMeters(point, a, b);
    if (dist < minDistanceM) {
      minDistanceM = dist;
      nearestSegmentIndex = i;
    }
  }

  return { minDistanceM, nearestSegmentIndex };
}
