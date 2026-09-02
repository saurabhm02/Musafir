import AsyncStorage from "@react-native-async-storage/async-storage";

export type OfflinePackageState =
  | "not_downloaded"
  | "downloading"
  | "ready"
  | "updating"
  | "failed"
  | "deleted";

export interface OfflineWaypoint {
  id: number | string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  tags?: {
    ele?: number;
    description?: string;
  };
}

export interface OfflineMemoryMeta {
  id: string;
  thumbnailUrl: string;
  photoUrl: string;
  caption: string | null;
  lat: number;
  lon: number;
  altitude: number | null;
  authorName: string;
  authorAvatarUrl: string | null;
  likesCount: number;
  createdAt: string;
}

export interface OfflineMapBoundary {
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number]; // [lon, lat]
  defaultZoom: number;
  styleUrl: string;
  offlineResourceBundle: {
    requiredTileBbox: [number, number, number, number];
    minZoom: number;
    maxZoom: number;
  };
}

export interface OfflineTrekPackageData {
  packageVersion: string;
  downloadedAt: string;
  lastSyncedAt: string;
  status: OfflinePackageState;
  sizeEstimateBytes: number;
  trek: {
    id: string;
    name: string;
    slug: string;
    summary: string | null;
    difficulty: string | null;
    region: string | null;
    bestMonths: number[];
    coverPhoto: string | null;
    lat: number;
    lon: number;
  };
  route: {
    id: string;
    name: string;
    routeType: string | null;
    verificationStatus: string;
    distanceKm: number | null;
    elevationGainM: number | null;
    elevationLossM: number | null;
    minElevationM: number | null;
    maxElevationM: number | null;
    startPointName: string | null;
    endPointName: string | null;
    trailheadLat: number | null;
    trailheadLon: number | null;
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    } | null;
    waypoints: OfflineWaypoint[];
    elevationProfile: Array<{ distanceKm: number; elevationM: number }>;
    updatedAt: string;
  };
  waypoints: OfflineWaypoint[];
  memories: OfflineMemoryMeta[];
  mapBoundary: OfflineMapBoundary;
}

export interface OfflineTrackPoint {
  sessionId: string;
  lat: number;
  lon: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: string;
  sequence: number;
  isPaused: boolean;
  synced: boolean;
}

export interface OfflineMemoryItem {
  localId: string;
  trekId: string;
  trekRouteId?: string;
  trekSessionId?: string;
  photoUri: string;
  caption: string | null;
  visibility: "public" | "private";
  lat: number;
  lon: number;
  altitude?: number | null;
  takenAt: string;
  synced: boolean;
  serverMemoryId?: string;
  retryCount: number;
}

export interface SyncQueueItem {
  id: string;
  type: "points" | "memory" | "session_state";
  payload: any;
  retryCount: number;
  createdAt: string;
}

// Storage Key Prefixes
const KEY_PKG_PREFIX = "@musafir_pkg:";
const KEY_POINTS_PREFIX = "@musafir_pts:";
const KEY_MEMORIES = "@musafir_offline_memories";
const KEY_SYNC_QUEUE = "@musafir_sync_queue";

export const OfflineStorage = {
  // 1. Packages
  async saveOfflinePackage(pkg: OfflineTrekPackageData): Promise<void> {
    const key = `${KEY_PKG_PREFIX}${pkg.trek.id}:${pkg.route.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(pkg));
  },

  async getOfflinePackage(trekId: string, routeId?: string): Promise<OfflineTrekPackageData | null> {
    if (routeId) {
      const key = `${KEY_PKG_PREFIX}${trekId}:${routeId}`;
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }

    // Find any package matching trekId
    const allKeys = await AsyncStorage.getAllKeys();
    const matchKey = allKeys.find((k) => k.startsWith(`${KEY_PKG_PREFIX}${trekId}:`));
    if (!matchKey) return null;
    const raw = await AsyncStorage.getItem(matchKey);
    return raw ? JSON.parse(raw) : null;
  },

  async listOfflinePackages(): Promise<OfflineTrekPackageData[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    const pkgKeys = allKeys.filter((k) => k.startsWith(KEY_PKG_PREFIX));
    if (pkgKeys.length === 0) return [];
    const entries = await AsyncStorage.multiGet(pkgKeys);
    return entries
      .map(([_, val]) => (val ? (JSON.parse(val) as OfflineTrekPackageData) : null))
      .filter((p): p is OfflineTrekPackageData => p !== null && p.status !== "deleted");
  },

  async deleteOfflinePackage(trekId: string, routeId?: string): Promise<void> {
    if (routeId) {
      const key = `${KEY_PKG_PREFIX}${trekId}:${routeId}`;
      await AsyncStorage.removeItem(key);
      return;
    }
    const allKeys = await AsyncStorage.getAllKeys();
    const pkgKeys = allKeys.filter((k) => k.startsWith(`${KEY_PKG_PREFIX}${trekId}:`));
    if (pkgKeys.length > 0) {
      await AsyncStorage.multiRemove(pkgKeys);
    }
  },

  // 2. Track Points Persistence
  async saveOfflineTrackPoints(sessionId: string, points: OfflineTrackPoint[]): Promise<void> {
    const key = `${KEY_POINTS_PREFIX}${sessionId}`;
    const existingRaw = await AsyncStorage.getItem(key);
    const existing: OfflineTrackPoint[] = existingRaw ? JSON.parse(existingRaw) : [];

    // Map existing by sequence for deduplication
    const map = new Map<number, OfflineTrackPoint>();
    for (const pt of existing) {
      map.set(pt.sequence, pt);
    }
    for (const pt of points) {
      map.set(pt.sequence, pt);
    }

    const merged = Array.from(map.values()).sort((a, b) => a.sequence - b.sequence);
    await AsyncStorage.setItem(key, JSON.stringify(merged));
  },

  async getOfflineTrackPoints(sessionId: string): Promise<OfflineTrackPoint[]> {
    const key = `${KEY_POINTS_PREFIX}${sessionId}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  },

  async getUnsyncedTrackPoints(sessionId: string): Promise<OfflineTrackPoint[]> {
    const points = await this.getOfflineTrackPoints(sessionId);
    return points.filter((p) => !p.synced);
  },

  async markTrackPointsSynced(sessionId: string, sequences: number[]): Promise<void> {
    const key = `${KEY_POINTS_PREFIX}${sessionId}`;
    const points = await this.getOfflineTrackPoints(sessionId);
    const seqSet = new Set(sequences);
    const updated = points.map((p) => (seqSet.has(p.sequence) ? { ...p, synced: true } : p));
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  },

  // 3. Offline Memories Persistence
  async saveOfflineMemory(memory: OfflineMemoryItem): Promise<void> {
    const raw = await AsyncStorage.getItem(KEY_MEMORIES);
    const list: OfflineMemoryItem[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((m) => m.localId === memory.localId);
    if (idx >= 0) {
      list[idx] = memory;
    } else {
      list.push(memory);
    }
    await AsyncStorage.setItem(KEY_MEMORIES, JSON.stringify(list));
  },

  async getOfflineMemories(): Promise<OfflineMemoryItem[]> {
    const raw = await AsyncStorage.getItem(KEY_MEMORIES);
    return raw ? JSON.parse(raw) : [];
  },

  async getUnsyncedMemories(): Promise<OfflineMemoryItem[]> {
    const list = await this.getOfflineMemories();
    return list.filter((m) => !m.synced);
  },

  async markMemorySynced(localId: string, serverMemoryId: string): Promise<void> {
    const list = await this.getOfflineMemories();
    const updated = list.map((m) =>
      m.localId === localId ? { ...m, synced: true, serverMemoryId } : m
    );
    await AsyncStorage.setItem(KEY_MEMORIES, JSON.stringify(updated));
  },

  // 4. General Sync Queue
  async enqueueSyncItem(type: "points" | "memory" | "session_state", payload: any): Promise<void> {
    const raw = await AsyncStorage.getItem(KEY_SYNC_QUEUE);
    const queue: SyncQueueItem[] = raw ? JSON.parse(raw) : [];
    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    queue.push(item);
    await AsyncStorage.setItem(KEY_SYNC_QUEUE, JSON.stringify(queue));
  },

  async getPendingSyncQueue(): Promise<SyncQueueItem[]> {
    const raw = await AsyncStorage.getItem(KEY_SYNC_QUEUE);
    return raw ? JSON.parse(raw) : [];
  },

  async removeSyncQueueItem(id: string): Promise<void> {
    const queue = await this.getPendingSyncQueue();
    const filtered = queue.filter((q) => q.id !== id);
    await AsyncStorage.setItem(KEY_SYNC_QUEUE, JSON.stringify(filtered));
  },
};
