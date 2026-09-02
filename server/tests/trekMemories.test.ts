import { describe, it, expect, beforeAll } from "bun:test";
import { db } from "../src/lib/db";
import { listTrekMemories, getMemoryById, initiateMemoryUpload } from "../src/services/memories";

describe("Trek Memories on Map Engine (Phase 5C)", () => {
  let testUserId1: string;
  let testUserId2: string;
  let testTrekId: string;
  let testRouteId: string;
  let publicMemoryId: string;
  let privateMemoryId: string;

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
      const anyTrek = await db.treks.findFirst({ include: { routes: true } });
      if (!anyTrek) throw new Error("No treks found in DB. Ensure seeds are run.");
      testTrekId = anyTrek.id;
      testRouteId = anyTrek.routes[0]?.id || "";
    }

    // 3. Create a dedicated public test memory with GPS coordinates on trail
    publicMemoryId = crypto.randomUUID();
    await db.$executeRaw`
      INSERT INTO memories (
        id,
        user_id,
        trek_id,
        trek_route_id,
        photo_url,
        thumbnail_url,
        caption,
        visibility,
        status,
        moderation_status,
        ai_tags,
        location,
        created_at
      ) VALUES (
        ${publicMemoryId}::uuid,
        ${testUserId1}::uuid,
        ${testTrekId}::uuid,
        ${testRouteId || null}::uuid,
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400',
        'Sunset ridge view over Jalori Pass valley',
        'public',
        'ready',
        'approved',
        ARRAY['#jaloripass', '#sunset', '#himalayas']::text[],
        ST_SetSRID(ST_MakePoint(77.3898, 31.5396), 4326)::geography,
        NOW()
      );
    `;

    // 4. Create a dedicated private test memory for User 1
    privateMemoryId = crypto.randomUUID();
    await db.$executeRaw`
      INSERT INTO memories (
        id,
        user_id,
        trek_id,
        trek_route_id,
        photo_url,
        thumbnail_url,
        caption,
        visibility,
        status,
        moderation_status,
        ai_tags,
        location,
        created_at
      ) VALUES (
        ${privateMemoryId}::uuid,
        ${testUserId1}::uuid,
        ${testTrekId}::uuid,
        ${testRouteId || null}::uuid,
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
        'Private family campsite memory at meadow',
        'private',
        'ready',
        'approved',
        ARRAY['#campsite', '#private']::text[],
        ST_SetSRID(ST_MakePoint(77.4260, 31.5401), 4326)::geography,
        NOW()
      );
    `;
  }, 30000);

  it(
    "1. Lists public trek memories for Raghupur Fort Trek with real GPS coordinates",
    async () => {
      const res = await listTrekMemories(testTrekId, null);

      expect(res).toBeDefined();
      expect(res.total).toBeGreaterThanOrEqual(1);
      expect(res.items.length).toBeGreaterThanOrEqual(1);

      // Verify that public memories have valid coordinates and author details
      const itemWithCoord = res.items.find((m) => m.id === publicMemoryId);
      expect(itemWithCoord).toBeDefined();
      expect(itemWithCoord?.lat).toBeCloseTo(31.5396, 4);
      expect(itemWithCoord?.lon).toBeCloseTo(77.3898, 4);
      expect(itemWithCoord?.visibility).toBe("public");
      expect(itemWithCoord?.author).toBeDefined();
    },
    20000
  );

  it(
    "2. Retrieves detailed memory by ID with traveler profile, tags, and altitude",
    async () => {
      const memory = await getMemoryById(publicMemoryId, null);

      expect(memory).toBeDefined();
      expect(memory?.id).toBe(publicMemoryId);
      expect(memory?.caption).toBe("Sunset ridge view over Jalori Pass valley");
      expect(memory?.lat).toBeCloseTo(31.5396, 4);
      expect(memory?.lon).toBeCloseTo(77.3898, 4);
      expect(memory?.tags).toContain("#jaloripass");
      expect(memory?.altitude_m).toBeDefined();
    },
    20000
  );

  it(
    "3. Privacy Guard: Private memory is visible to author but hidden from other users",
    async () => {
      // Author (User 1) requests trek memories -> sees private memory
      const authorView = await listTrekMemories(testTrekId, testUserId1);
      const inAuthorList = authorView.items.some((m) => m.id === privateMemoryId);
      expect(inAuthorList).toBe(true);

      // Stranger (User 2) requests trek memories -> cannot see private memory
      const strangerView = await listTrekMemories(testTrekId, testUserId2);
      const inStrangerList = strangerView.items.some((m) => m.id === privateMemoryId);
      expect(inStrangerList).toBe(false);

      // Anonymous public requests trek memories -> cannot see private memory
      const publicView = await listTrekMemories(testTrekId, null);
      const inPublicList = publicView.items.some((m) => m.id === privateMemoryId);
      expect(inPublicList).toBe(false);
    },
    20000
  );

  it(
    "4. Privacy Guard: getMemoryById forbids unauthorized access to private memories",
    async () => {
      // Author can read own private memory
      const authorAccess = await getMemoryById(privateMemoryId, testUserId1);
      expect(authorAccess).toBeDefined();
      expect(authorAccess?.visibility).toBe("private");

      // Stranger trying to read private memory is rejected with Unauthorized error
      expect(getMemoryById(privateMemoryId, testUserId2)).rejects.toThrow("Unauthorized");

      // Anonymous requester is rejected
      expect(getMemoryById(privateMemoryId, null)).rejects.toThrow("Unauthorized");
    },
    20000
  );

  it(
    "5. Spatial Viewport Query: filters memories within bounding box (bbox)",
    async () => {
      // Exact small envelope around (31.5396, 77.3898)
      const insideBbox: [number, number, number, number] = [77.38, 31.53, 77.4, 31.55];
      const resInside = await listTrekMemories(testTrekId, null, { bbox: insideBbox });
      const foundPublic = resInside.items.some((m) => m.id === publicMemoryId);
      expect(foundPublic).toBe(true);

      // Disjoint envelope far away (e.g. Manali area: 32.2, 77.1)
      const outsideBbox: [number, number, number, number] = [77.1, 32.2, 77.2, 32.3];
      const resOutside = await listTrekMemories(testTrekId, null, { bbox: outsideBbox });
      const foundOutside = resOutside.items.some((m) => m.id === publicMemoryId);
      expect(foundOutside).toBe(false);
    },
    20000
  );

  it(
    "6. Media Type Filter: filters memories by type (photos vs videos)",
    async () => {
      const photosRes = await listTrekMemories(testTrekId, null, { type: "photos" });
      expect(photosRes.items.length).toBeGreaterThanOrEqual(1);

      // All items should be images
      for (const item of photosRes.items) {
        expect(item.photo_url).toBeDefined();
      }
    },
    20000
  );

  it(
    "7. Pagination: limits and offsets work correctly",
    async () => {
      const page1 = await listTrekMemories(testTrekId, null, { limit: 2, offset: 0 });
      expect(page1.items.length).toBeLessThanOrEqual(2);

      const page2 = await listTrekMemories(testTrekId, null, { limit: 2, offset: 2 });
      expect(page2).toBeDefined();

      if (page1.items.length > 0 && page2.items.length > 0) {
        expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
      }
    },
    20000
  );

  it(
    "8. Upload Memory Session attaches trek_id, trek_route_id, and preserves privacy",
    async () => {
      const uploadSession = await initiateMemoryUpload(testUserId1, {
        trekId: testTrekId,
        trekRouteId: testRouteId || undefined,
        caption: "High altitude panoramic pass",
        visibility: "public",
        mimeType: "image/jpeg",
        fileSize: 1024 * 500,
      });

      expect(uploadSession).toBeDefined();
      expect(uploadSession.memoryId).toBeDefined();
      expect(uploadSession.uploadUrl).toBeDefined();

      // Verify memory record in DB
      const createdRecord = await db.memories.findUnique({
        where: { id: uploadSession.memoryId },
      });

      expect(createdRecord).toBeDefined();
      expect(createdRecord?.trek_id).toBe(testTrekId);
      expect(createdRecord?.visibility).toBe("public");
      expect(createdRecord?.caption).toBe("High altitude panoramic pass");
    },
    20000
  );
});
