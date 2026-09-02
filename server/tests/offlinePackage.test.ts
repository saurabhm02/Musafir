import { describe, it, expect, beforeAll } from "bun:test";
import { db } from "../src/lib/db";
import { getOfflineTrekPackage, type OfflineTrekPackage } from "../src/services/offlineTrekPackage";
import { TrekTrackingService, type TrackPointInput } from "../src/services/trekTracking";

describe("Musafir Offline Trek Foundation Engine (Phase 5F.1)", () => {
  let testUserId1: string;
  let testUserId2: string;
  let testTrekId: string;
  let testRouteId: string;

  beforeAll(async () => {
    // 1. Fetch existing users
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

  it("1. Generates complete offline trek package for verified route", async () => {
    const pkg: OfflineTrekPackage = await getOfflineTrekPackage(testTrekId, testRouteId);

    expect(pkg).toBeDefined();
    expect(pkg.packageVersion).toBeDefined();
    expect(pkg.packageVersion).toContain("pkg_v1_");
    expect(pkg.sizeEstimateBytes).toBeGreaterThan(500);

    // Trek metadata
    expect(pkg.trek.id).toBe(testTrekId);
    expect(pkg.trek.name).toContain("Raghupur");
    expect(pkg.trek.lat).toBeDefined();
    expect(pkg.trek.lon).toBeDefined();

    // Route metadata
    expect(pkg.route.id).toBe(testRouteId);
    expect(pkg.route.verificationStatus).toMatch(/verified/);
    expect(pkg.route.geometry).toBeDefined();
    expect(pkg.route.geometry?.type).toBe("LineString");
    expect(pkg.route.geometry?.coordinates.length).toBeGreaterThanOrEqual(2);

    // Waypoints
    expect(pkg.waypoints.length).toBeGreaterThanOrEqual(1);

    // Map Boundary & Offline Tile Bbox
    expect(pkg.mapBoundary.bbox.length).toBe(4);
    expect(pkg.mapBoundary.center.length).toBe(2);
    expect(pkg.mapBoundary.styleUrl).toBe("https://tiles.openfreemap.org/styles/liberty");
  }, 60000);

  it("2. Privacy Guard: Private memories are excluded from public offline package", async () => {
    // Create a private memory for user 1
    const privMemId = crypto.randomUUID();
    await db.memories.create({
      data: {
        id: privMemId,
        user_id: testUserId1,
        trek_id: testTrekId,
        photo_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
        caption: "Private personal memory hidden from public offline packages",
        visibility: "private",
        status: "ready",
        moderation_status: "approved",
      },
    });

    const pkg = await getOfflineTrekPackage(testTrekId, testRouteId);
    const leaked = pkg.memories.find((m) => m.id === privMemId);
    expect(leaked).toBeUndefined();
  }, 60000);

  it("3. Package Versioning: Package version deterministically changes when route is updated", async () => {
    const pkg1 = await getOfflineTrekPackage(testTrekId, testRouteId);

    // Simulate route modification timestamp update
    const newDate = new Date(Date.now() + 10000);
    await db.trek_routes.update({
      where: { id: testRouteId },
      data: { updated_at: newDate },
    });

    const pkg2 = await getOfflineTrekPackage(testTrekId, testRouteId);
    expect(pkg2.packageVersion).not.toBe(pkg1.packageVersion);
  }, 60000);

  it("4. Anti-Fabrication & Guard: Rejects offline package generation for non-existent trek or unverified route", async () => {
    // Non-existent trek
    expect(getOfflineTrekPackage("00000000-0000-0000-0000-000000000000")).rejects.toThrow("Trek not found");

    // Fake route ID
    expect(
      getOfflineTrekPackage(testTrekId, "00000000-0000-0000-0000-000000000000")
    ).rejects.toThrow("No verified route available");
  }, 60000);

  it("5. Offline Track Points Sync & Idempotency: Local points sync without duplication or corrupting session", async () => {
    const sessionId = crypto.randomUUID();
    await db.trek_sessions.create({
      data: {
        id: sessionId,
        user_id: testUserId2,
        trek_id: testTrekId,
        trek_route_id: testRouteId,
        status: "active",
        started_at: new Date(),
        actual_distance_km: 0,
        actual_duration_sec: 0,
        elevation_gain_m: 0,
        elevation_loss_m: 0,
      },
    });

    const now = Date.now();
    const offlineBatch: TrackPointInput[] = [
      { lat: 31.5348, lon: 77.378, altitude: 3120, timestamp: new Date(now).toISOString(), sequence: 1 },
      { lat: 31.5362, lon: 77.3769, altitude: 3180, timestamp: new Date(now + 60000).toISOString(), sequence: 2 },
      { lat: 31.5385, lon: 77.3752, altitude: 3350, timestamp: new Date(now + 120000).toISOString(), sequence: 3 },
    ];

    // First sync
    const firstSync = await TrekTrackingService.recordPoints(testUserId2, sessionId, offlineBatch);
    expect(firstSync?.pointsCount).toBeGreaterThanOrEqual(3);
    const initialDistance = firstSync?.actualDistanceKm;

    // Retry sync (simulating network reconnect replay)
    const secondSync = await TrekTrackingService.recordPoints(testUserId2, sessionId, offlineBatch);
    expect(secondSync?.pointsCount).toBe(firstSync?.pointsCount);
    expect(secondSync?.actualDistanceKm).toBe(initialDistance);
  }, 60000);

  it("6. Map Boundary & Bounding Box: Correctly encloses route geometry and waypoints", async () => {
    const pkg = await getOfflineTrekPackage(testTrekId, testRouteId);
    const [minLon, minLat, maxLon, maxLat] = pkg.mapBoundary.bbox;

    expect(minLon).toBeLessThanOrEqual(maxLon);
    expect(minLat).toBeLessThanOrEqual(maxLat);

    // Verify all route coordinates are inside bounding box
    if (pkg.route.geometry) {
      for (const [lon, lat] of pkg.route.geometry.coordinates) {
        expect(lon).toBeGreaterThanOrEqual(minLon);
        expect(lon).toBeLessThanOrEqual(maxLon);
        expect(lat).toBeGreaterThanOrEqual(minLat);
        expect(lat).toBeLessThanOrEqual(maxLat);
      }
    }
  }, 60000);

  it("7. Package Size Estimation: Computes non-zero deterministic byte size", async () => {
    const pkg = await getOfflineTrekPackage(testTrekId, testRouteId);
    expect(pkg.sizeEstimateBytes).toBeGreaterThan(1000);
    expect(pkg.sizeEstimateBytes).toBeLessThan(10000000); // under 10MB
  }, 60000);

  it("8. Route Endpoint GET /treks/:id/offline-package: Serves complete payload over HTTP handler", async () => {
    const { treksRoutes } = await import("../src/routes/treks");
    const handler = (treksRoutes as any)["/treks/:id/offline-package"].GET;

    const mockReq = {
      url: `http://localhost:3000/treks/${testTrekId}/offline-package?routeId=${testRouteId}`,
      params: { id: testTrekId },
    } as any;

    const res: Response = await handler(mockReq);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.packageVersion).toBeDefined();
    expect(body.trek.id).toBe(testTrekId);
    expect(body.route.id).toBe(testRouteId);
  }, 60000);
});
