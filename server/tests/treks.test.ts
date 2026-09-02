import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import { listTreks, getTrekById } from "../src/services/treks";
import {
  listRoutesForTrek,
  getTrekRouteById,
  createCommunityRoute,
  updateCommunityRoute,
  deleteTrekRoute,
  listPendingTrekRoutes,
  verifyTrekRoute,
  rejectTrekRoute,
} from "../src/services/trekRoutes";
import { validateCoordinates, asSubmitTrekRoute } from "../src/lib/validate";

describe("Trek and Multiple Routes Backend Foundation (Phase 1B)", () => {
  let TEST_USER_ID_1: string;
  let TEST_USER_ID_2: string;
  let ADMIN_USER_ID: string;

  let testTrekId: string;
  let testPoiId: string;
  let testRouteId1: string;
  let testRouteId2: string;

  beforeAll(async () => {
    // Fetch valid users from DB
    const existingUsers = await db.users.findMany({ take: 3, select: { id: true } });
    if (existingUsers.length >= 3 && existingUsers[0] && existingUsers[1] && existingUsers[2]) {
      TEST_USER_ID_1 = existingUsers[0].id;
      TEST_USER_ID_2 = existingUsers[1].id;
      ADMIN_USER_ID = existingUsers[2].id;
    } else {
      throw new Error("Test requires at least 3 existing user records in database");
    }

    // Create a dedicated test POI and Trek
    const poi = await db.$queryRaw<any[]>`
      INSERT INTO pois (name, category, subcategory, location, is_verified)
      VALUES (
        'Test Himalayan Peak Trek',
        'trek',
        'hiking',
        st_setsrid(st_makepoint(77.1234, 32.5678), 4326)::geography,
        true
      )
      RETURNING id
    `;
    testPoiId = poi[0].id;

    const trek = await db.treks.create({
      data: {
        poi_id: testPoiId,
        name: "Test Himalayan Peak Trek",
        slug: "test-himalayan-peak-trek-" + Date.now(),
        region: "Himachal Pradesh",
        difficulty: "moderate",
        summary: "Automated test trek for multi-route validation.",
      },
    });
    testTrekId = trek.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup test POI, Trek, and Routes (Cascade will remove trek & routes)
    if (testPoiId) {
      await db.pois.delete({ where: { id: testPoiId } }).catch(() => {});
    }
  }, 30000);

  it("1. Validates coordinate syntax and rejects invalid geometries (anti-fabrication)", () => {
    // Valid coordinates
    const validCoords = [
      [77.12, 32.56],
      [77.13, 32.57],
      [77.14, 32.58],
    ];
    expect(validateCoordinates(validCoords)).toEqual(validCoords as [number, number][]);

    // Invalid: single coordinate (cannot form a LineString)
    expect(() => validateCoordinates([[77.12, 32.56]])).toThrow();

    // Invalid: out-of-bounds longitude (> 180)
    expect(() =>
      validateCoordinates([
        [195.0, 32.0],
        [77.0, 32.0],
      ])
    ).toThrow();

    // Invalid: non-number coordinates
    expect(() =>
      validateCoordinates([
        ["77.12", 32.56],
        [77.13, 32.57],
      ])
    ).toThrow();
  }, 20000);

  it("2. Allows community route submission in 'pending' status", async () => {
    const routeInput = asSubmitTrekRoute({
      name: "Scenic North Ridge Ascent",
      routeType: "out_and_back",
      coordinates: [
        [77.1234, 32.5678],
        [77.1245, 32.5689],
        [77.1260, 32.5701],
      ],
      distanceKm: 4.5,
      elevationGainM: 520,
      elevationLossM: 40,
      minElevationM: 2400,
      maxElevationM: 2920,
      startPointName: "North Basecamp",
      endPointName: "Summit Ridge",
      sourceType: "community_gps",
    });

    testRouteId1 = await createCommunityRoute(testTrekId, routeInput, TEST_USER_ID_1);
    expect(testRouteId1).toBeDefined();

    // Submitter can view their own pending route
    const fetchedRoute = await getTrekRouteById(testRouteId1, { userId: TEST_USER_ID_1 });
    expect(fetchedRoute).toBeDefined();
    expect(fetchedRoute!.name).toBe("Scenic North Ridge Ascent");
    expect(fetchedRoute!.verificationStatus).toBe("pending");
    expect(fetchedRoute!.submittedBy).toBe(TEST_USER_ID_1);
    expect(fetchedRoute!.geometry?.type).toBe("LineString");
    expect(fetchedRoute!.geometry?.coordinates.length).toBe(3);
  }, 20000);

  it("3. Supports multiple coexisting routes for a single trek", async () => {
    const secondRouteInput = asSubmitTrekRoute({
      name: "Direct South Wall Route",
      routeType: "point_to_point",
      coordinates: [
        [77.1234, 32.5678],
        [77.1220, 32.5650],
        [77.1200, 32.5620],
      ],
      distanceKm: 3.8,
      elevationGainM: 680,
      sourceType: "community_gps",
    });

    testRouteId2 = await createCommunityRoute(testTrekId, secondRouteInput, TEST_USER_ID_2);
    expect(testRouteId2).toBeDefined();
    expect(testRouteId2).not.toBe(testRouteId1);

    // Both routes exist independently in database
    const totalCount = await db.trek_routes.count({ where: { trek_id: testTrekId } });
    expect(totalCount).toBe(2);
  }, 20000);

  it("4. Enforces public security: unverified routes are hidden from public queries", async () => {
    // Public query (no auth / no author match) returns zero unverified routes
    const publicRoutes = await listRoutesForTrek(testTrekId, { includeUnverified: false });
    expect(publicRoutes.length).toBe(0);

    // Unauthorized stranger attempting to fetch pending route directly gets 404
    expect(
      getTrekRouteById(testRouteId1, { userId: "00000000-0000-0000-0000-999999999999" })
    ).rejects.toThrow();

    // Submitter 1 querying with includeUnverified sees only their own pending route
    const user1Routes = await listRoutesForTrek(testTrekId, {
      includeUnverified: true,
      userId: TEST_USER_ID_1,
    });
    expect(user1Routes.length).toBe(1);
    expect(user1Routes[0]!.id).toBe(testRouteId1);
  }, 20000);

  it("5. Allows author to update own pending submission; forbids strangers from updating", async () => {
    // Author updates pending route distance & name
    await updateCommunityRoute(
      testRouteId1,
      { name: "Scenic North Ridge Ascent (Updated)", distanceKm: 4.8 },
      TEST_USER_ID_1
    );

    const updated = await getTrekRouteById(testRouteId1, { userId: TEST_USER_ID_1 });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Scenic North Ridge Ascent (Updated)");
    expect(updated!.distanceKm).toBe(4.8);

    // Stranger user 2 attempts to update User 1's route -> 403 Forbidden
    expect(
      updateCommunityRoute(testRouteId1, { name: "Hacked Route" }, TEST_USER_ID_2)
    ).rejects.toThrow();
  }, 20000);

  it("6. Admin verification workflow: approves route and marks it Musafir Verified", async () => {
    // Admin lists pending routes
    const pendingList = await listPendingTrekRoutes();
    const foundPending = pendingList.find((r: any) => r.id === testRouteId1);
    expect(foundPending).toBeDefined();

    // Admin approves route 1 as primary verified route
    const verifyResult = await verifyTrekRoute(testRouteId1, ADMIN_USER_ID, {
      verificationStatus: "musafir_verified",
      confidence: "high",
      isPrimary: true,
    });

    expect(verifyResult.verificationStatus).toBe("musafir_verified");
    expect(verifyResult.isPrimary).toBe(true);

    // Now route 1 is immediately available in public query!
    const publicRoutes = await listRoutesForTrek(testTrekId);
    expect(publicRoutes.length).toBe(1);
    expect(publicRoutes[0]!.id).toBe(testRouteId1);
    expect(publicRoutes[0]!.verificationStatus).toBe("musafir_verified");
  }, 20000);

  it("7. Guard: Normal users cannot edit or delete verified routes", async () => {
    // User 1 tries to modify their previously approved route -> 403 Forbidden
    expect(
      updateCommunityRoute(testRouteId1, { name: "Attempted Edit on Verified Route" }, TEST_USER_ID_1)
    ).rejects.toThrow();

    // User 1 tries to delete verified route -> 403 Forbidden
    expect(
      deleteTrekRoute(testRouteId1, TEST_USER_ID_1)
    ).rejects.toThrow();
  }, 20000);

  it("8. Admin rejection workflow: rejects unverified route with reason", async () => {
    const rejectResult = await rejectTrekRoute(
      testRouteId2,
      ADMIN_USER_ID,
      "Incomplete GPS track coordinates across river crossing."
    );

    expect(rejectResult.verificationStatus).toBe("rejected");
    expect(rejectResult.rejectionReason).toBe("Incomplete GPS track coordinates across river crossing.");

    // Rejected route is NOT visible in public list
    const publicRoutes = await listRoutesForTrek(testTrekId);
    expect(publicRoutes.some(r => r.id === testRouteId2)).toBe(false);
  }, 20000);

  it("9. Links memories to specific trek_id and trek_route_id", async () => {
    const memory = await db.memories.create({
      data: {
        user_id: TEST_USER_ID_1,
        poi_id: testPoiId,
        trek_id: testTrekId,
        trek_route_id: testRouteId1,
        photo_url: "https://images.gomusafir.app/test-photo.jpg",
        visibility: "public",
        status: "ready",
        moderation_status: "approved",
        caption: "Summit view on North Ridge",
      },
    });

    expect(memory.trek_id).toBe(testTrekId);
    expect(memory.trek_route_id).toBe(testRouteId1);

    // Trek detail query returns this memory
    const trekDetail = await getTrekById(testTrekId);
    expect(trekDetail).toBeDefined();
    expect(trekDetail!.memories.length).toBeGreaterThanOrEqual(1);
    expect(trekDetail!.memories[0]!.photo_url).toBe("https://images.gomusafir.app/test-photo.jpg");

    // Clean up memory
    await db.memories.delete({ where: { id: memory.id } });
  }, 20000);

  it("10. Validates seeded Phase 1A pilot treks presence in database", async () => {
    const treks = await listTreks();
    expect(treks.length).toBeGreaterThanOrEqual(15);

    const triund = await getTrekById("triund-trek");
    expect(triund).toBeDefined();
    expect(triund!.name).toBe("Triund Trek");
    expect(triund!.routes.length).toBeGreaterThanOrEqual(1);

    const hampta = await getTrekById("hampta-pass");
    expect(hampta).toBeDefined();
    expect(hampta!.name).toBe("Hampta Pass");
    expect(hampta!.routes[0]!.distanceKm).toBeGreaterThan(20);
    expect(hampta!.routes[0]!.maxElevationM).toBeGreaterThan(4000);
  }, 20000);
});
