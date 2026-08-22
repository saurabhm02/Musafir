import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "musafir:lastLocation";

export type Coords = { lat: number; lon: number };

// Input: nothing
// Output: the last GPS fix we successfully read, if any -- lets the UI
// center on something instantly instead of waiting on a fresh GPS read.
export async function getCachedLocation(): Promise<Coords | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
}

// Input: nothing
// Output: the device's current coordinates, or null if permission was
// denied or the read failed -- callers fall back instead of erroring out.
// Caches every successful read so getCachedLocation() has something to
// return immediately on the next screen visit or app launch.
export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({});
    const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(coords)).catch(() => {});
    return coords;
  } catch {
    return null;
  }
}
