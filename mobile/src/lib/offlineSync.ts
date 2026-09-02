import { api } from "./api";
import {
  OfflineStorage,
  type OfflineTrekPackageData,
  type OfflineTrackPoint,
  type OfflineMemoryItem,
} from "./offlineStorage";
import { recordTrekPoints, type TrackPointPayload } from "./trekTracker";
import { uploadMemory } from "./memories";

export const OfflineSyncManager = {
  /**
   * Downloads a route-specific offline trek package and saves it locally.
   */
  async downloadPackage(
    trekId: string,
    routeId?: string,
    onProgress?: (percent: number) => void
  ): Promise<OfflineTrekPackageData> {
    onProgress?.(15);
    const path = `/treks/${trekId}/offline-package${routeId ? `?routeId=${routeId}` : ""}`;
    const serverPkg = await api<any>(path);

    onProgress?.(65);
    const offlinePkg: OfflineTrekPackageData = {
      ...serverPkg,
      status: "ready",
      downloadedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };

    await OfflineStorage.saveOfflinePackage(offlinePkg);
    onProgress?.(100);

    return offlinePkg;
  },

  /**
   * Checks if an updated version of the offline package is available on the server.
   */
  async checkPackageUpdate(
    trekId: string,
    routeId?: string
  ): Promise<{
    updateAvailable: boolean;
    localVersion?: string;
    latestVersion?: string;
    serverPackage?: any;
  }> {
    const local = await OfflineStorage.getOfflinePackage(trekId, routeId);
    if (!local) {
      return { updateAvailable: false };
    }

    try {
      const path = `/treks/${trekId}/offline-package${routeId ? `?routeId=${routeId}` : ""}`;
      const serverPkg = await api<any>(path);

      const updateAvailable = serverPkg.packageVersion !== local.packageVersion;
      return {
        updateAvailable,
        localVersion: local.packageVersion,
        latestVersion: serverPkg.packageVersion,
        serverPackage: serverPkg,
      };
    } catch {
      // Offline: cannot reach server to verify updates
      return { updateAvailable: false, localVersion: local.packageVersion };
    }
  },

  /**
   * Updates an existing offline package with the latest server data.
   */
  async updatePackage(trekId: string, routeId?: string): Promise<OfflineTrekPackageData> {
    return this.downloadPackage(trekId, routeId);
  },

  /**
   * Flushes unsynced offline GPS points to the server.
   */
  async syncTrackPoints(sessionId: string): Promise<{ syncedCount: number }> {
    const unsynced = await OfflineStorage.getUnsyncedTrackPoints(sessionId);
    if (unsynced.length === 0) {
      return { syncedCount: 0 };
    }

    const payload: TrackPointPayload[] = unsynced.map((p) => ({
      lat: p.lat,
      lon: p.lon,
      altitude: p.altitude ?? undefined,
      accuracy: p.accuracy ?? undefined,
      speed: p.speed ?? undefined,
      heading: p.heading ?? undefined,
      timestamp: p.timestamp,
      sequence: p.sequence,
      isPaused: p.isPaused,
    }));

    try {
      const result = await recordTrekPoints(sessionId, payload);
      if (result) {
        const sequences = unsynced.map((p) => p.sequence);
        await OfflineStorage.markTrackPointsSynced(sessionId, sequences);
        return { syncedCount: unsynced.length };
      }
    } catch (err) {
      // Failed: points remain in local storage for subsequent retry
      console.warn("Failed to sync offline track points:", err);
    }

    return { syncedCount: 0 };
  },

  /**
   * Flushes offline photo/video/note memories to the server.
   */
  async syncMemories(): Promise<{ syncedCount: number }> {
    const unsynced = await OfflineStorage.getUnsyncedMemories();
    if (unsynced.length === 0) {
      return { syncedCount: 0 };
    }

    let synced = 0;
    for (const mem of unsynced) {
      try {
        const res = await uploadMemory({
          poiId: mem.trekId,
          trekId: mem.trekId,
          trekRouteId: mem.trekRouteId,
          trekSessionId: mem.trekSessionId,
          uri: mem.photoUri,
          caption: mem.caption || undefined,
          visibility: mem.visibility,
        });

        if (res?.id) {
          await OfflineStorage.markMemorySynced(mem.localId, res.id);
          synced++;
        }
      } catch (err) {
        console.warn("Failed to upload offline memory:", err);
      }
    }

    return { syncedCount: synced };
  },

  /**
   * Flushes all pending offline data (points and memories).
   */
  async flushAllPending(
    sessionId?: string
  ): Promise<{ pointsSynced: number; memoriesSynced: number }> {
    let pointsSynced = 0;
    if (sessionId) {
      const res = await this.syncTrackPoints(sessionId);
      pointsSynced = res.syncedCount;
    }
    const memRes = await this.syncMemories();
    return {
      pointsSynced,
      memoriesSynced: memRes.syncedCount,
    };
  },
};
