import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

export interface TrackPointPayload {
  lat: number;
  lon: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
  sequence: number;
  isPaused?: boolean;
}

export interface TrekSessionPoint {
  id?: string;
  lat: number;
  lon: number;
  altitude: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
  sequence: number;
  is_paused: boolean;
}

export interface TrekSession {
  id: string;
  userId: string;
  trekId: string;
  trekName: string;
  trekSlug: string;
  trekRouteId: string | null;
  routeName: string | null;
  routeVerificationStatus: string | null;
  routeGeometry?: any;
  routeWaypoints?: Array<{
    name: string;
    lat: number;
    lon: number;
    altitude_m?: number;
    order: number;
  }>;
  status: "active" | "paused" | "completed" | "cancelled";
  startedAt: string;
  pausedAt: string | null;
  resumedAt: string | null;
  completedAt: string | null;
  actualDistanceKm: number;
  actualDurationSec: number;
  elevationGainM: number;
  elevationLossM: number;
  highestAltitudeM: number | null;
  lowestAltitudeM: number | null;
  pointsCount: number;
  geometry: any | null;
  startLocation: any | null;
  endLocation: any | null;
  metadata: Record<string, any>;
  points: TrekSessionPoint[];
  memories: Array<{
    id: string;
    photo_url: string;
    thumbnail_url: string | null;
    caption: string | null;
    visibility?: string;
    taken_at: string | null;
    created_at: string;
    lat: number | null;
    lon: number | null;
  }>;
}

import { OfflineStorage } from "./offlineStorage";

const OFFLINE_QUEUE_KEY_PREFIX = "@musafir_trek_queue_";
const ACTIVE_OFFLINE_SESSION_KEY = "@musafir_active_offline_session";

/**
 * Starts a live trek tracking session. If connected, it creates the session on the
 * backend server; if the traveler is in a zero-network mountain valley, it gracefully
 * falls back to creating an offline session backed by the local offline package.
 *
 * @example
 * // 1. Input:
 * const session = await startTrekSession({
 *   trekId: "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *   trekRouteId: "c1f7a08b-2401-4ec9-8664-8830768e7ec8",
 *   startLat: 31.5348,
 *   startLon: 77.3780
 * });
 *
 * // 2. Output:
 * // Returns a TrekSession object with status "active" and point 0 recorded
 */
export async function startTrekSession(params: {
  trekId: string;
  trekRouteId?: string | null;
  startLat?: number | null;
  startLon?: number | null;
  metadata?: Record<string, any>;
}): Promise<TrekSession> {
  try {
    const res = await api<TrekSession>("/trek-sessions", {
      method: "POST",
      body: JSON.stringify(params),
    });
    // Clear any leftover local offline session
    await AsyncStorage.removeItem(ACTIVE_OFFLINE_SESSION_KEY);
    return res;
  } catch (err) {
    // Offline: generate local tracking session from cached offline package
    const pkg = await OfflineStorage.getOfflinePackage(params.trekId, params.trekRouteId || undefined);
    const offlineSessionId = `offline_sess_${Date.now()}`;
    const offlineSession: TrekSession = {
      id: offlineSessionId,
      userId: "local_offline_user",
      trekId: params.trekId,
      trekName: pkg?.trek.name || "Offline Trek",
      trekSlug: pkg?.trek.slug || "offline-trek",
      trekRouteId: params.trekRouteId || null,
      routeName: pkg?.route.name || "Offline Verified Route",
      routeVerificationStatus: pkg?.route.verificationStatus || "musafir_verified",
      routeGeometry: pkg?.route.geometry,
      routeWaypoints: (pkg?.waypoints || []).map((w, idx) => ({
        name: w.name,
        lat: w.lat,
        lon: w.lng,
        order: idx + 1,
      })),
      status: "active",
      startedAt: new Date().toISOString(),
      pausedAt: null,
      resumedAt: null,
      completedAt: null,
      actualDistanceKm: 0,
      actualDurationSec: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      highestAltitudeM: null,
      lowestAltitudeM: null,
      pointsCount: 0,
      geometry: null,
      startLocation:
        params.startLat && params.startLon
          ? { type: "Point", coordinates: [params.startLon, params.startLat] }
          : null,
      endLocation: null,
      metadata: { ...params.metadata, isOfflineCreated: true },
      points: [],
      memories: [],
    };

    await AsyncStorage.setItem(ACTIVE_OFFLINE_SESSION_KEY, JSON.stringify(offlineSession));
    return offlineSession;
  }
}

/**
 * Uploads a batch of GPS track points to the backend server. If offline, it
 * buffers the points in local AsyncStorage to ensure no footsteps are lost.
 *
 * @example
 * // 1. Input:
 * await recordTrekPoints("sess_8a21f03d...", [
 *   { lat: 31.5348, lon: 77.3780, altitude: 3120, sequence: 1, timestamp: "2026-09-02T10:00:10Z" },
 *   { lat: 31.5362, lon: 77.3769, altitude: 3150, sequence: 2, timestamp: "2026-09-02T10:00:20Z" }
 * ]);
 */
export async function recordTrekPoints(
  sessionId: string,
  newPoints: TrackPointPayload[]
): Promise<TrekSession> {
  // 1. Get queued points from AsyncStorage
  const queueKey = `${OFFLINE_QUEUE_KEY_PREFIX}${sessionId}`;
  let queued: TrackPointPayload[] = [];
  try {
    const raw = await AsyncStorage.getItem(queueKey);
    if (raw) queued = JSON.parse(raw);
  } catch {}

  const allPoints = [...queued, ...newPoints];

  if (allPoints.length === 0) {
    return api<TrekSession>(`/trek-sessions/${sessionId}`);
  }

  try {
    const res = await api<TrekSession>(`/trek-sessions/${sessionId}/points`, {
      method: "POST",
      body: JSON.stringify({ points: allPoints }),
    });
    // On success, clear the offline queue
    await AsyncStorage.removeItem(queueKey);
    return res;
  } catch (err) {
    // If offline / network error, persist allPoints to AsyncStorage for retry
    try {
      await AsyncStorage.setItem(queueKey, JSON.stringify(allPoints));
    } catch {}
    throw err;
  }
}

/**
 * Pause tracking session
 */
export async function pauseTrekSession(sessionId: string): Promise<TrekSession> {
  return api<TrekSession>(`/trek-sessions/${sessionId}/pause`, {
    method: "POST",
  });
}

/**
 * Resume tracking session
 */
export async function resumeTrekSession(sessionId: string): Promise<TrekSession> {
  return api<TrekSession>(`/trek-sessions/${sessionId}/resume`, {
    method: "POST",
  });
}

/**
 * Complete and finalize trek session
 */
export async function completeTrekSession(sessionId: string): Promise<TrekSession> {
  // First attempt to flush any leftover offline points
  const queueKey = `${OFFLINE_QUEUE_KEY_PREFIX}${sessionId}`;
  try {
    const raw = await AsyncStorage.getItem(queueKey);
    if (raw) {
      const queued: TrackPointPayload[] = JSON.parse(raw);
      if (queued.length > 0) {
        await api(`/trek-sessions/${sessionId}/points`, {
          method: "POST",
          body: JSON.stringify({ points: queued }),
        });
        await AsyncStorage.removeItem(queueKey);
      }
    }
  } catch {}

  return api<TrekSession>(`/trek-sessions/${sessionId}/complete`, {
    method: "POST",
  });
}

/**
 * Retrieve user's currently active / paused trek session (for app restart recovery)
 */
export async function fetchActiveTrekSession(): Promise<TrekSession | null> {
  try {
    const res = await api<{ session: TrekSession | null }>("/trek-sessions/active");
    if (res?.session) return res.session;
  } catch {}

  // Fallback to local active session if offline
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_OFFLINE_SESSION_KEY);
    if (raw) {
      const parsed: TrekSession = JSON.parse(raw);
      if (parsed.status === "active" || parsed.status === "paused") {
        return parsed;
      }
    }
  } catch {}

  return null;
}

/**
 * Fetch specific session details
 */
export async function fetchTrekSession(sessionId: string): Promise<TrekSession> {
  return api<TrekSession>(`/trek-sessions/${sessionId}`);
}
