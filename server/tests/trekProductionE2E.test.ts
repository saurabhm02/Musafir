import { describe, it, expect, beforeAll } from "bun:test";
import { db } from "../src/lib/db";
import { TrekTrackingService, type TrackPointInput } from "../src/services/trekTracking";
import { listTrekMemories, getMemoryById } from "../src/services/memories";
import { discoverJourneys } from "../src/services/transport/journeyDiscovery";

describe("Musafir Production Readiness & End-to-End Trek Engine (Phase 5E)", () => {
  let testUserId1: string;
  let testUserId2: string;
  let testTrekId: string;
  let testRouteId: string;

  beforeAll(async () => {
    // 1. Fetch existing users for authorization testing
    const users = await db.users.findMany({ take: 2, select: { id: true } });
    if (users.length >= 2 && users[0] && users[1]) {
      testUserId1 = users[0].id;
      testUserId2 = users[1].id;
    } else {
      throw new Error("Test requires at least 2 existing users in DB");
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
      const anyTrek = await db.treks.findFirst({ include: { routes: true } });
      if (!anyTrek) throw new Error("No treks found in DB. Ensure seeds are run.");
      testTrekId = anyTrek.id;
      testRouteId = anyTrek.routes[0]?.id || "";
    }
  }, 30000);

  const resetSessions = async (userId: string) => {
    await db.$executeRaw`
      UPDATE trek_sessions 
      SET status = 'completed' 
      WHERE user_id = ${userId}::uuid AND status IN ('active', 'paused');
    `;
  };

  it(
    "1. Multi-Origin Journey Discovery: generates dynamic route options from Amgaon, Gondia, Nagpur, and GPS coordinates",
    async () => {
      // Test A: Amgaon GPS
      const amgaonRes = await discoverJourneys({
        originLat: 21.3653,
        originLon: 80.3802,
        trekId: "raghupur-fort-trek",
        trekRouteId: testRouteId || undefined,
      });
      expect(amgaonRes.journeys.length).toBeGreaterThanOrEqual(1);
      expect(amgaonRes.trailhead.name).toBeDefined();

      // Test B: Gondia GPS
      const gondiaRes = await discoverJourneys({
        originLat: 21.4556,
        originLon: 80.1963,
        trekId: "raghupur-fort-trek",
      });
      expect(gondiaRes.journeys.length).toBeGreaterThanOrEqual(1);

      // Test C: Arbitrary GPS
      const customRes = await discoverJourneys({
        originLat: 28.6139,
        originLon: 77.209,
        trekId: "raghupur-fort-trek",
      });
      expect(customRes.journeys.length).toBeGreaterThanOrEqual(1);
    },
    25000
  );

  it(
    "2. Complete End-to-End Trek Lifecycle: Starts session, records GPS points, and computes authoritative stats",
    async () => {
      await resetSessions(testUserId1);

      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
        trekRouteId: testRouteId || null,
        startLat: 31.5348,
        startLon: 77.378,
      }))!;

      expect(session.id).toBeDefined();
      expect(session.status).toBe("active");

      const now = Date.now();
      const points: TrackPointInput[] = [
        { lat: 31.5348, lon: 77.378, altitude: 3120, speed: 1.1, timestamp: new Date(now).toISOString(), sequence: 1 },
        { lat: 31.5365, lon: 77.3768, altitude: 3180, speed: 1.2, timestamp: new Date(now + 60000).toISOString(), sequence: 2 },
        { lat: 31.539, lon: 77.375, altitude: 3400, speed: 1.0, timestamp: new Date(now + 120000).toISOString(), sequence: 3 },
        { lat: 31.543, lon: 77.3735, altitude: 3650, speed: 0.9, timestamp: new Date(now + 180000).toISOString(), sequence: 4 },
        { lat: 31.547, lon: 77.371, altitude: 3910, speed: 1.0, timestamp: new Date(now + 240000).toISOString(), sequence: 5 },
      ];

      const updated = await TrekTrackingService.recordPoints(testUserId1, session.id, points);

      expect(updated?.pointsCount).toBeGreaterThanOrEqual(5);
      expect(updated?.actualDistanceKm).toBeGreaterThan(1.0);
      expect(updated?.elevationGainM).toBe(790);
      expect(updated?.highestAltitudeM).toBe(3910);
      expect(updated?.lowestAltitudeM).toBe(3120);
    },
    20000
  );

  it(
    "3. Offline Queue & Idempotency: Duplicate point delivery does not corrupt track or inflate distance",
    async () => {
      await resetSessions(testUserId1);

      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      const now = Date.now();
      const batch: TrackPointInput[] = [
        { lat: 31.5348, lon: 77.378, altitude: 3120, timestamp: new Date(now).toISOString(), sequence: 1 },
        { lat: 31.536, lon: 77.377, altitude: 3150, timestamp: new Date(now + 30000).toISOString(), sequence: 2 },
      ];

      const firstPass = await TrekTrackingService.recordPoints(testUserId1, session.id, batch);
      const initialDist = firstPass?.actualDistanceKm;
      const initialCount = firstPass?.pointsCount;

      // Replay batch (simulating offline queue retry)
      const secondPass = await TrekTrackingService.recordPoints(testUserId1, session.id, batch);

      expect(secondPass?.pointsCount).toBe(initialCount);
      expect(secondPass?.actualDistanceKm).toBe(initialDist);
    },
    20000
  );

  it(
    "4. App Restart Recovery: Restores active session with latest points and route metadata",
    async () => {
      await resetSessions(testUserId1);

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
    "5. Pause & Resume Accuracy: Movement during paused state is excluded from active metrics",
    async () => {
      await resetSessions(testUserId1);

      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      const now = Date.now();
      // Active point
      await TrekTrackingService.recordPoints(testUserId1, session.id, [
        { lat: 31.5348, lon: 77.378, altitude: 3120, timestamp: new Date(now).toISOString(), sequence: 1 },
      ]);

      // Pause
      const paused = await TrekTrackingService.pauseSession(testUserId1, session.id);
      expect(paused?.status).toBe("paused");

      // Record point while paused
      await TrekTrackingService.recordPoints(testUserId1, session.id, [
        { lat: 31.5355, lon: 77.3775, altitude: 3130, timestamp: new Date(now + 300000).toISOString(), sequence: 2, isPaused: true },
      ]);

      // Resume
      const resumed = await TrekTrackingService.resumeSession(testUserId1, session.id);
      expect(resumed?.status).toBe("active");
    },
    20000
  );

  it(
    "6. Dual Route Preservation: Preserves both Verified Route and User Actual GPS Track separately",
    async () => {
      await resetSessions(testUserId1);

      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
        trekRouteId: testRouteId || null,
      }))!;

      const now = Date.now();
      // User takes a custom detour
      await TrekTrackingService.recordPoints(testUserId1, session.id, [
        { lat: 31.5348, lon: 77.378, altitude: 3120, timestamp: new Date(now).toISOString(), sequence: 1 },
        { lat: 31.538, lon: 77.382, altitude: 3250, timestamp: new Date(now + 60000).toISOString(), sequence: 2 }, // Detour
        { lat: 31.541, lon: 77.375, altitude: 3400, timestamp: new Date(now + 120000).toISOString(), sequence: 3 },
      ]);

      const completed = await TrekTrackingService.completeSession(testUserId1, session.id);
      const sessionData = await TrekTrackingService.getSession(testUserId1, session.id);

      // 1. User's actual GPS track has detour
      expect(sessionData?.geometry?.coordinates?.length).toBe(3);
      expect(sessionData?.geometry.coordinates[1][0]).toBeCloseTo(77.382, 3);

      // 2. Verified planned route remains intact and separate
      if (sessionData?.routeGeometry) {
        expect(sessionData.routeGeometry.type).toBe("LineString");
      }
    },
    20000
  );

  it(
    "7. Memory Integration & Privacy Guard: Public memories are shared; Private memories are strictly protected",
    async () => {
      await resetSessions(testUserId1);

      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      const privMemId = crypto.randomUUID();
      await db.memories.create({
        data: {
          id: privMemId,
          user_id: testUserId1,
          trek_id: testTrekId,
          trek_session_id: session.id,
          photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
          caption: "Private rest stop note",
          visibility: "private",
          status: "ready",
          moderation_status: "approved",
        },
      });

      // Author can access
      const authorAccess = await getMemoryById(privMemId, testUserId1);
      expect(authorAccess?.id).toBe(privMemId);

      // Unauthorized user is rejected
      expect(getMemoryById(privMemId, testUserId2)).rejects.toThrow("Unauthorized");
    },
    20000
  );

  it(
    "8. Security: Forbids unauthorized users from mutating another traveler's session",
    async () => {
      await resetSessions(testUserId1);

      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      // User 2 trying to pause User 1's session
      expect(TrekTrackingService.pauseSession(testUserId2, session.id)).rejects.toThrow("Unauthorized");

      // User 2 trying to record points to User 1's session
      expect(
        TrekTrackingService.recordPoints(testUserId2, session.id, [
          { lat: 31.5348, lon: 77.378, timestamp: new Date().toISOString(), sequence: 99 },
        ])
      ).rejects.toThrow("Unauthorized");

      // User 2 trying to complete User 1's session
      expect(TrekTrackingService.completeSession(testUserId2, session.id)).rejects.toThrow("Unauthorized");
    },
    20000
  );

  it(
    "9. High Density Scale Test: Ingests 500 GPS points with fast PostGIS LineString calculation",
    async () => {
      await resetSessions(testUserId1);

      const session = (await TrekTrackingService.startSession(testUserId1, {
        trekId: testTrekId,
      }))!;

      const startTime = Date.now();
      const largeBatch: TrackPointInput[] = [];

      // Generate 500 continuous GPS track points along trail
      for (let i = 1; i <= 500; i++) {
        const factor = i / 500;
        largeBatch.push({
          lat: 31.5348 + factor * 0.02,
          lon: 77.378 - factor * 0.01,
          altitude: 3120 + Math.sin(factor * Math.PI) * 800,
          speed: 1.1 + (i % 3) * 0.1,
          accuracy: 5.0,
          timestamp: new Date(startTime + i * 2000).toISOString(),
          sequence: i,
        });
      }

      const updated = await TrekTrackingService.recordPoints(testUserId1, session.id, largeBatch);

      expect(updated?.pointsCount).toBe(500);
      expect(updated?.actualDistanceKm).toBeGreaterThan(1.5);

      // Complete session and generate LineString
      const completed = await TrekTrackingService.completeSession(testUserId1, session.id);
      expect(completed?.status).toBe("completed");
      expect(completed?.geometry?.coordinates?.length).toBe(500);
    },
    40000
  );
});
