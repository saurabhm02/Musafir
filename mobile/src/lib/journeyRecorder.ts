import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationLocation, haversineMeters } from "./location";
import { sendTripTelemetry, completeTrip, TelemetryPoint, CompleteTripInput } from "./trips";

const JOURNEY_STORAGE_KEY = "musafir:active_journey_state";
const BATCH_FLUSH_SIZE = 25;
const FLUSH_INTERVAL_MS = 30000;

export type JourneyState = {
  tripId: string;
  tripTitle: string;
  status: "active" | "paused";
  startedAt: number;
  lastPointTimestamp: number;
  distanceMeters: number;
  movingSeconds: number;
  elevationGainMeters: number;
  maxSpeedKmh: number;
  lastAltitude: number | null;
  lastCoords: { lat: number; lon: number } | null;
  unsyncedPoints: TelemetryPoint[];
  allRecordedCoordinates: [number, number][];
};

class JourneyRecorderManager {
  private state: JourneyState | null = null;
  private flushTimer: any = null;
  private batchSequence = 0;
  private listeners: Array<(state: JourneyState | null) => void> = [];

  constructor() {
    this.restoreActiveJourney();
  }

  public subscribe(listener: (state: JourneyState | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public async restoreActiveJourney(): Promise<JourneyState | null> {
    try {
      const raw = await AsyncStorage.getItem(JOURNEY_STORAGE_KEY);
      if (raw) {
        this.state = JSON.parse(raw);
        if (this.state && this.state.status === "active") {
          this.startPeriodicFlush();
        }
        this.notify();
        return this.state;
      }
    } catch (e) {
      console.warn("Failed to restore active journey:", e);
    }
    return null;
  }

  public async startJourney(tripId: string, tripTitle: string): Promise<JourneyState> {
    const now = Date.now();
    this.state = {
      tripId,
      tripTitle,
      status: "active",
      startedAt: now,
      lastPointTimestamp: now,
      distanceMeters: 0,
      movingSeconds: 0,
      elevationGainMeters: 0,
      maxSpeedKmh: 0,
      lastAltitude: null,
      lastCoords: null,
      unsyncedPoints: [],
      allRecordedCoordinates: [],
    };

    await this.persistState();
    this.startPeriodicFlush();
    this.notify();
    return this.state;
  }

  public async pauseJourney(): Promise<void> {
    if (!this.state) return;
    this.state.status = "paused";
    this.stopPeriodicFlush();
    await this.flushTelemetry();
    await this.persistState();
    this.notify();
  }

  public async resumeJourney(): Promise<void> {
    if (!this.state) return;
    this.state.status = "active";
    this.startPeriodicFlush();
    await this.persistState();
    this.notify();
  }

  public recordLocation(loc: NavigationLocation): void {
    if (!this.state || this.state.status !== "active") return;

    // 1. Accuracy Filter: discard fixes with accuracy > 35 meters
    if (loc.accuracy != null && loc.accuracy > 35) {
      return;
    }

    const currentCoords = { lat: loc.lat, lon: loc.lon };

    // 2. Outlier & Teleportation Rejection
    if (this.state.lastCoords) {
      const stepDistM = haversineMeters(this.state.lastCoords, currentCoords);
      const timeDeltaSec = Math.max(1, (loc.timestamp - this.state.lastPointTimestamp) / 1000);
      const calculatedSpeedKmh = (stepDistM / timeDeltaSec) * 3.6;

      // Discard unrealistic GPS jumps > 250 km/h
      if (calculatedSpeedKmh > 250) {
        return;
      }

      // 3. Accumulate distance only if meaningful movement occurred (>= 3 meters)
      if (stepDistM >= 3) {
        this.state.distanceMeters += stepDistM;

        // Moving time if speed > 2.5 km/h
        if ((loc.speedKmh != null && loc.speedKmh >= 2.5) || calculatedSpeedKmh >= 2.5) {
          this.state.movingSeconds += timeDeltaSec;
        }
      }
    }

    // 4. Track Max Speed
    if (loc.speedKmh != null && loc.speedKmh > this.state.maxSpeedKmh && loc.speedKmh <= 250) {
      this.state.maxSpeedKmh = Math.round(loc.speedKmh);
    }

    // 5. Calculate Elevation Gain
    if (loc.altitude != null) {
      if (this.state.lastAltitude != null) {
        const altDelta = loc.altitude - this.state.lastAltitude;
        if (altDelta > 1.5 && altDelta < 50) {
          this.state.elevationGainMeters += altDelta;
        }
      }
      this.state.lastAltitude = loc.altitude;
    }

    this.state.lastCoords = currentCoords;
    this.state.lastPointTimestamp = loc.timestamp;

    const point: TelemetryPoint = {
      lat: loc.lat,
      lon: loc.lon,
      alt: loc.altitude ? Math.round(loc.altitude) : null,
      speed: loc.speedKmh,
      acc: loc.accuracy ? Math.round(loc.accuracy) : null,
      t: loc.timestamp,
    };

    this.state.unsyncedPoints.push(point);
    this.state.allRecordedCoordinates.push([loc.lon, loc.lat]);

    // Fast check: if batch size reached, flush asynchronously
    if (this.state.unsyncedPoints.length >= BATCH_FLUSH_SIZE) {
      this.flushTelemetry().catch(() => { });
    }

    this.persistState().catch(() => { });
    this.notify();
  }

  public async flushTelemetry(): Promise<void> {
    if (!this.state || this.state.unsyncedPoints.length === 0) return;

    const pointsToSend = [...this.state.unsyncedPoints];
    const seq = ++this.batchSequence;

    const currentStats = {
      distanceKm: Number((this.state.distanceMeters / 1000).toFixed(2)),
      movingMinutes: Math.round(this.state.movingSeconds / 60),
      elevationGainM: Math.round(this.state.elevationGainMeters),
      maxSpeedKmh: this.state.maxSpeedKmh,
      avgSpeedKmh:
        this.state.movingSeconds > 60
          ? Number(((this.state.distanceMeters / 1000) / (this.state.movingSeconds / 3600)).toFixed(1))
          : undefined,
    };

    try {
      await sendTripTelemetry(this.state.tripId, {
        batchSequence: seq,
        points: pointsToSend,
        currentStats,
      });

      // On success, prune sent points
      if (this.state) {
        this.state.unsyncedPoints = this.state.unsyncedPoints.slice(pointsToSend.length);
        await this.persistState();
      }
    } catch (e) {
      console.warn("Telemetry batch flush skipped (offline):", e);
    }
  }

  public async finishJourney(): Promise<{
    tripId: string;
    actualDistanceKm: number;
    actualDurationMin: number;
    movingDurationMin: number;
    elevationGainM: number;
    maxSpeedKmh: number;
  }> {
    if (!this.state) throw new Error("No active journey to finish");

    this.stopPeriodicFlush();

    const distanceKm = Number((this.state.distanceMeters / 1000).toFixed(2));
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - this.state.startedAt) / 60000));
    const movingMinutes = Math.round(this.state.movingSeconds / 60);
    const elevationGainM = Math.round(this.state.elevationGainMeters);
    const maxSpeedKmh = this.state.maxSpeedKmh;
    const avgSpeedKmh =
      this.state.movingSeconds > 60
        ? Number((distanceKm / (this.state.movingSeconds / 3600)).toFixed(1))
        : null;

    const payload: CompleteTripInput = {
      actualDistanceKm: distanceKm,
      actualDurationMin: elapsedMinutes,
      movingDurationMin: movingMinutes,
      elevationGainM: elevationGainM,
      maxSpeedKmh: maxSpeedKmh,
      avgSpeedKmh: avgSpeedKmh || undefined,
      points: this.state.allRecordedCoordinates,
    };

    const tripId = this.state.tripId;

    try {
      await completeTrip(tripId, payload);
    } finally {
      this.state = null;
      await AsyncStorage.removeItem(JOURNEY_STORAGE_KEY);
      this.notify();
    }

    return {
      tripId,
      actualDistanceKm: distanceKm,
      actualDurationMin: elapsedMinutes,
      movingDurationMin: movingMinutes,
      elevationGainM: elevationGainM,
      maxSpeedKmh: maxSpeedKmh,
    };
  }

  public async cancelJourney(): Promise<void> {
    this.stopPeriodicFlush();
    this.state = null;
    await AsyncStorage.removeItem(JOURNEY_STORAGE_KEY);
    this.notify();
  }

  public getActiveState(): JourneyState | null {
    return this.state;
  }

  private startPeriodicFlush() {
    this.stopPeriodicFlush();
    this.flushTimer = setInterval(() => {
      this.flushTelemetry().catch(() => { });
    }, FLUSH_INTERVAL_MS);
  }

  private stopPeriodicFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async persistState() {
    if (!this.state) return;
    try {
      await AsyncStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(this.state));
    } catch { }
  }
}

export const journeyRecorder = new JourneyRecorderManager();
