import { describe, it, expect, beforeAll } from "bun:test";
import { db } from "../src/lib/db";
import { TrekTrackingService, type TrackPointInput } from "../src/services/trekTracking";

describe("Real Trek GPS Tracking Engine (Phase 5B)", () => {
  let testUserId1: string;
  let testUserId2: string;
  let testTrekId: string;
  let testRouteId: string;

  beforeAll(async () => {
    // 1. Get test users
    const existingUsers = await db.users.findMany({ take: 2, select: { id: true } });
    if (existingUsers.length >= 2 && existingUsers[0] && existingUsers[1]) {
      testUserId1 = existingUsers[0].id;
      testUserId2 = existingUsers[1].id;
    } else {
      throw new Error("Test requires at least 2 existing user records in database");
    }

    // 2. Fetch seeded Raghupur Fort Trek
    const trek = await db.treks.findFirst({
      where: { slug: "raghupur-fort-trek" },
      include: { routes: true },
    });

    if (trek) {
      testTrekId = trek.id;
      testRouteId = trek.routes[0]?.id || "";
    } else {
      // Fallback: pick any trek
      const anyTrek = await db.treks.findFirst({ include: { routes: true } });
      if (!anyTrek) throw new Error("No treks found in DB. Ensure seeds are run.");
      testTrekId = anyTrek.id;
      testRouteId = anyTrek.routes[0]?.id || "";
    }
  }, 30000);

  it(
    "1. Starts a new trek session and records initial start point",
    async () => {
      const session = await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
        trekRouteId: testRouteId || null,
        startLat: 31.5348,
        startLon: 77.378,
        metadata: { device: "iPhone 15 Pro", test: true },
      });
      if (!session) throw new Error("Failed to start session");

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe("active");
      expect(session.userId).toBe(testUserId1);
      expect(session.trekId).toBe(testTrekId);
      expect(session.pointsCount).toBeGreaterThanOrEqual(1);
      expect(session.points[0]?.lat).toBeCloseTo(31.5348, 4);
      expect(session.points[0]?.lon).toBeCloseTo(77.378, 4);
    },
    20000
  );

  it(
    "2. Records batch of valid GPS points and calculates authoritative distance and duration",
    async () => {
      const session = await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
        trekRouteId: testRouteId || null,
      });
      if (!session) throw new Error("Failed to start session");

      const now = Date.now();
      const samplePoints: TrackPointInput[] = [
        {
          lat: 31.5348,
          lon: 77.378,
          altitude: 3120,
          accuracy: 5.0,
          speed: 1.2,
          timestamp: new Date(now).toISOString(),
          sequence: 1,
        },
        {
          lat: 31.5365,
          lon: 77.3775,
          altitude: 3150,
          accuracy: 6.0,
          speed: 1.1,
          timestamp: new Date(now + 120000).toISOString(),
          sequence: 2,
        },
        {
          lat: 31.5385,
          lon: 77.3768,
          altitude: 3190,
          accuracy: 4.5,
          speed: 1.3,
          timestamp: new Date(now + 240000).toISOString(),
          sequence: 3,
        },
        {
          lat: 31.5405,
          lon: 77.3755,
          altitude: 3240,
          accuracy: 5.2,
          speed: 1.0,
          timestamp: new Date(now + 360000).toISOString(),
          sequence: 4,
        },
      ];

      const updated = await TrekTrackingService.recordPoints(testUserId1, session.id, samplePoints);

      expect(updated).toBeDefined();
      expect(updated?.pointsCount).toBe(4);
      expect(updated?.actualDistanceKm).toBeGreaterThan(0.5);
      expect(updated?.actualDistanceKm).toBeLessThan(1.2);
      expect(updated?.actualDurationSec).toBe(360);
    },
    20000
  );

  it(
    "3. Quality Filter: rejects inaccurate GPS points, invalid coordinates, and impossible jumps",
    async () => {
      const session = await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      });
      if (!session) throw new Error("Failed to start session");

      const now = Date.now();
      const mixedPoints: TrackPointInput[] = [
        {
          lat: 31.5348,
          lon: 77.378,
          altitude: 3120,
          accuracy: 8.0,
          timestamp: new Date(now).toISOString(),
          sequence: 1,
        },
        {
          lat: 131.5348,
          lon: 77.378,
          accuracy: 5.0,
          timestamp: new Date(now + 10000).toISOString(),
          sequence: 2,
        },
        {
          lat: 31.535,
          lon: 77.3781,
          accuracy: 120.0,
          timestamp: new Date(now + 20000).toISOString(),
          sequence: 3,
        },
        {
          lat: 33.0,
          lon: 79.0,
          accuracy: 5.0,
          timestamp: new Date(now + 22000).toISOString(),
          sequence: 4,
        },
        {
          lat: 31.5355,
          lon: 77.3782,
          altitude: 3135,
          accuracy: 6.0,
          timestamp: new Date(now + 40000).toISOString(),
          sequence: 5,
        },
      ];

      const updated = await TrekTrackingService.recordPoints(testUserId1, session.id, mixedPoints);

      expect(updated?.pointsCount).toBe(2);
      expect(updated?.points.map((p) => p.sequence)).toEqual([1, 5]);
    },
    20000
  );

  it(
    "4. Idempotency & Offline Sync: retrying the same points does not duplicate or inflate distance",
    async () => {
      const session = await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      });
      if (!session) throw new Error("Failed to start session");

      const now = Date.now();
      const batch: TrackPointInput[] = [
        {
          lat: 31.5348,
          lon: 77.378,
          altitude: 3120,
          timestamp: new Date(now).toISOString(),
          sequence: 1,
        },
        {
          lat: 31.536,
          lon: 77.377,
          altitude: 3145,
          timestamp: new Date(now + 60000).toISOString(),
          sequence: 2,
        },
      ];

      const firstRes = await TrekTrackingService.recordPoints(testUserId1, session.id, batch);
      const initialDist = firstRes?.actualDistanceKm;
      const initialCount = firstRes?.pointsCount;

      const secondRes = await TrekTrackingService.recordPoints(testUserId1, session.id, batch);

      expect(secondRes?.pointsCount).toBe(initialCount);
      expect(secondRes?.actualDistanceKm).toBe(initialDist);
    },
    20000
  );

  it(
    "5. Calculates elevation gain, loss, and highest altitude with vertical noise filter",
    async () => {
      const session = await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      });
      if (!session) throw new Error("Failed to start session");

      const now = Date.now();
      const climbingPoints: TrackPointInput[] = [
        { lat: 31.5348, lon: 77.378, altitude: 3120, timestamp: new Date(now).toISOString(), sequence: 1 },
        { lat: 31.535, lon: 77.378, altitude: 3120.8, timestamp: new Date(now + 30000).toISOString(), sequence: 2 },
        { lat: 31.536, lon: 77.377, altitude: 3160, timestamp: new Date(now + 60000).toISOString(), sequence: 3 },
        { lat: 31.537, lon: 77.376, altitude: 3135, timestamp: new Date(now + 90000).toISOString(), sequence: 4 },
        { lat: 31.5385, lon: 77.3745, altitude: 3335, timestamp: new Date(now + 120000).toISOString(), sequence: 5 },
      ];

      const updated = await TrekTrackingService.recordPoints(testUserId1, session.id, climbingPoints);

      expect(updated?.highestAltitudeM).toBe(3335);
      expect(updated?.lowestAltitudeM).toBe(3120);
      expect(updated?.elevationGainM).toBeGreaterThanOrEqual(235);
      expect(updated?.elevationGainM).toBeLessThanOrEqual(245);
      expect(updated?.elevationLossM).toBe(25);
    },
    20000
  );

  it(
    "6. Handles pause & resume lifecycle and excludes paused intervals from stats",
    async () => {
      const session = await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      });
      if (!session) throw new Error("Failed to start session");

      const now = Date.now();
      await TrekTrackingService.recordPoints(testUserId1, session.id, [
        { lat: 31.5348, lon: 77.378, altitude: 3120, timestamp: new Date(now).toISOString(), sequence: 1 },
        { lat: 31.536, lon: 77.377, altitude: 3140, timestamp: new Date(now + 60000).toISOString(), sequence: 2 },
      ]);

      const paused = await TrekTrackingService.pauseSession(testUserId1, session.id);
      expect(paused?.status).toBe("paused");
      expect(paused?.pausedAt).toBeDefined();

      await TrekTrackingService.recordPoints(testUserId1, session.id, [
        {
          lat: 31.536,
          lon: 77.377,
          altitude: 3140,
          timestamp: new Date(now + 600000).toISOString(),
          sequence: 3,
          isPaused: true,
        },
      ]);

      const resumed = await TrekTrackingService.resumeSession(testUserId1, session.id);
      expect(resumed?.status).toBe("active");
      expect(resumed?.resumedAt).toBeDefined();

      const afterResume = await TrekTrackingService.recordPoints(testUserId1, session.id, [
        { lat: 31.538, lon: 77.375, altitude: 3170, timestamp: new Date(now + 660000).toISOString(), sequence: 4 },
      ]);

      expect(afterResume?.actualDurationSec).toBeLessThan(300);
    },
    20000
  );

  it(
    "7. App restart recovery: retrieves user's active session with latest points and route",
    async () => {
      const created = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
        trekRouteId: testRouteId || null,
      }))!;

      const active = await TrekTrackingService.getActiveSession(testUserId1);
      expect(active).toBeDefined();
      expect(active?.id).toBe(created.id);
      expect(active?.status).toBe("active");
      expect(active?.trekId).toBe(testTrekId);
    },
    20000
  );

  it(
    "8. Attaches photo memories to the active trek session",
    async () => {
      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      const memoryId = crypto.randomUUID();
      await db.memories.create({
        data: {
          id: memoryId,
          user_id: testUserId1,
          trek_id: testTrekId,
          trek_session_id: session.id,
          photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
          caption: "Summit view at Jalori Pass",
          visibility: "public",
          status: "ready",
          moderation_status: "approved",
        },
      });

      const sessionWithMemories = await TrekTrackingService.getSession(testUserId1, session.id);
      expect(sessionWithMemories?.memories.length).toBe(1);
      expect(sessionWithMemories?.memories[0]?.caption).toBe("Summit view at Jalori Pass");
    },
    20000
  );

  it(
    "9. Completes session: builds PostGIS LineString geometry and finalizes stats",
    async () => {
      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      const now = Date.now();
      await TrekTrackingService.recordPoints(testUserId1, session.id, [
        { lat: 31.5348, lon: 77.378, altitude: 3120, timestamp: new Date(now).toISOString(), sequence: 1 },
        { lat: 31.537, lon: 77.376, altitude: 3180, timestamp: new Date(now + 120000).toISOString(), sequence: 2 },
        { lat: 31.541, lon: 77.372, altitude: 3290, timestamp: new Date(now + 240000).toISOString(), sequence: 3 },
      ]);

      const completed = await TrekTrackingService.completeSession(testUserId1, session.id);

      expect(completed?.status).toBe("completed");
      expect(completed?.completedAt).toBeDefined();
      expect(completed?.geometry).toBeDefined();
      expect(completed?.geometry.type).toBe("LineString");
      expect(completed?.geometry.coordinates.length).toBe(3);
      expect(completed?.startLocation).toBeDefined();
      expect(completed?.endLocation).toBeDefined();
    },
    20000
  );

  it(
    "10. Security: forbids unauthorized users from accessing or modifying another user's session",
    async () => {
      const sessionUser1 = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      expect(
        TrekTrackingService.recordPoints(testUserId2, sessionUser1.id, [
          { lat: 31.5348, lon: 77.378, timestamp: new Date().toISOString(), sequence: 99 },
        ])
      ).rejects.toThrow("Unauthorized");

      expect(TrekTrackingService.pauseSession(testUserId2, sessionUser1.id)).rejects.toThrow(
        "Unauthorized"
      );

      expect(TrekTrackingService.completeSession(testUserId2, sessionUser1.id)).rejects.toThrow(
        "Unauthorized"
      );

      await TrekTrackingService.completeSession(testUserId1, sessionUser1.id);
      expect(
        TrekTrackingService.recordPoints(testUserId1, sessionUser1.id, [
          { lat: 31.5348, lon: 77.378, timestamp: new Date().toISOString(), sequence: 100 },
        ])
      ).rejects.toThrow("Cannot record points to completed session");
    },
    20000
  );
});
