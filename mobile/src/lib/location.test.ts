import { beforeEach, describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";

type PositionOptions = { accuracy?: number };

const mockState = {
  permissionRequests: 0,
  positionOptions: [] as PositionOptions[],
  watchOptions: [] as Record<string, unknown>[],
  stored: [] as string[],
  removed: 0,
};

const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

mock.module("expo-location", () => ({
  Accuracy,
  async requestForegroundPermissionsAsync() {
    mockState.permissionRequests += 1;
    return { status: "granted" };
  },
  async getCurrentPositionAsync(options: PositionOptions) {
    mockState.positionOptions.push(options);
    return {
      coords: {
        latitude: 27.7172,
        longitude: 85.324,
        accuracy: 5,
        altitude: 1400,
        heading: -1,
        speed: 0,
      },
      timestamp: 1700000000000,
    };
  },
  async watchPositionAsync(
    options: Record<string, unknown>,
    callback: (location: unknown) => void,
  ) {
    mockState.watchOptions.push(options);
    callback({
      coords: {
        latitude: 27.7172,
        longitude: 85.324,
        accuracy: 4,
        altitude: 1400,
        heading: -1,
        speed: 2.5,
      },
      timestamp: 1700000000000,
    });
    return {
      remove() {
        mockState.removed += 1;
      },
    };
  },
}));

mock.module("@react-native-async-storage/async-storage", () => ({
  default: {
    async getItem() {
      return null;
    },
    async setItem(_key: string, value: string) {
      mockState.stored.push(value);
    },
  },
}));

const { getCurrentLocation, watchNavigationLocation } = await import("./location");

const expoLocationSpec = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).dependencies["expo-location"] as string;

describe("expo-location dependency", () => {
  it("declares the 58.0.23 patch release or newer", () => {
    expect(expoLocationSpec).toMatch(/^[~^]?58\.0\.\d+$/);
    const patch = Number(expoLocationSpec.replace(/^[~^]/, "").split(".")[2]);
    expect(patch).toBeGreaterThanOrEqual(23);
  });
});

describe("location helpers", () => {
  beforeEach(() => {
    mockState.permissionRequests = 0;
    mockState.positionOptions.length = 0;
    mockState.watchOptions.length = 0;
    mockState.stored.length = 0;
    mockState.removed = 0;
  });

  it("asks for foreground permission before a balanced one-off fix", async () => {
    const coords = await getCurrentLocation();

    expect(mockState.permissionRequests).toBe(1);
    expect(mockState.positionOptions).toEqual([{ accuracy: Accuracy.Balanced }]);
    expect(coords).toEqual({ lat: 27.7172, lon: 85.324 });
    expect(mockState.stored).toEqual([JSON.stringify({ lat: 27.7172, lon: 85.324 })]);
  });

  it("subscribes to navigation updates with the expected accuracy and intervals", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const stop = await watchNavigationLocation((location) => updates.push(location));

    expect(mockState.watchOptions).toEqual([
      {
        accuracy: Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
      },
    ]);
    expect(updates).toEqual([
      {
        lat: 27.7172,
        lon: 85.324,
        heading: null,
        speedKmh: 9,
        accuracy: 4,
        altitude: 1400,
        timestamp: 1700000000000,
      },
    ]);

    stop();
    expect(mockState.removed).toBe(1);
  });
});
