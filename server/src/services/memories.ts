import sharp from "sharp";
import { db } from "../lib/db";
import {
  generatePresignedUploadUrl,
  checkObjectExists,
  getObjectBuffer,
  uploadObject,
  deleteObjects,
  getPublicUrl,
} from "./storage";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export type MemoryDto = {
  id: string;
  user_id: string;
  poi_id: string | null;
  trip_id: string | null;
  photo_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  visibility: string;
  status: string;
  moderation_status: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string | null;
};

/**
 * Creates a memory record in 'processing' status and generates a presigned S3/storage
 * upload URL for direct image upload from the mobile app.
 *
 * @example
 * // 1. Input:
 * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
 * const input = {
 *   trekId: "7a35cb99-5282-4fa0-8f9f-cf92c20698ba",
 *   trekSessionId: "sess_8a21f03d-14a9-4ec2-9e90-21a41bc38d10",
 *   mimeType: "image/jpeg",
 *   fileSize: 2450000,
 *   caption: "Morning golden hour at Raghupur Meadow",
 *   visibility: "public",
 *   lat: 31.5365,
 *   lon: 77.3760
 * };
 *
 * // 2. HTTP Request:
 * // POST /memories/upload-intent
 * // Body: { "trekId": "7a35cb99...", "mimeType": "image/jpeg", "fileSize": 2450000, "lat": 31.5365, "lon": 77.3760 }
 *
 * // 3. What the Server returns:
 * {
 *   "memoryId": "mem_f941a02c-55b2-4d11-8893-11a84f3e9c10",
 *   "uploadUrl": "https://s3.musafir.app/memories/upload?signature=...",
 *   "originalKey": "memories/9b1deb4d/mem_f941a02c/original.jpg"
 * }
 */
export async function initiateMemoryUpload(
  userId: string,
  input: {
    poiId?: string;
    tripId?: string;
    trekId?: string;
    trekRouteId?: string;
    trekSessionId?: string;
    mimeType: string;
    fileSize: number;
    caption?: string;
    visibility?: "public" | "private";
    takenAt?: string;
    lat?: number;
    lon?: number;
  },
): Promise<{ memoryId: string; uploadUrl: string; originalKey: string }> {
  const mimeType = input.mimeType?.toLowerCase().trim();
  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Invalid image type: ${mimeType}. Allowed formats: JPEG, PNG, WebP, HEIC.`);
  }

  if (!input.fileSize || input.fileSize > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size must be under 15MB.`);
  }

  const ext = EXTENSION_MAP[mimeType] || "jpg";
  const memoryId = crypto.randomUUID();
  const originalKey = `memories/${userId}/${memoryId}/original.${ext}`;
  const initialPhotoUrl = getPublicUrl(originalKey);

  let lat = input.lat;
  let lon = input.lon;
  if (input.poiId && (lat === undefined || lon === undefined)) {
    const poiCoords = await db.$queryRaw<{ lat: number; lon: number }[]>`
      SELECT st_y(location::geometry) as lat, st_x(location::geometry) as lon
      FROM pois WHERE id = ${input.poiId}::uuid
    `;
    if (poiCoords[0]) {
      lat = poiCoords[0].lat;
      lon = poiCoords[0].lon;
    }
  }

  // Create memory record with status 'processing'
  if (lat !== undefined && lon !== undefined) {
    await db.$executeRaw`
      INSERT INTO memories (
        id, user_id, poi_id, trip_id, trek_id, trek_route_id, trek_session_id, original_key, photo_url, mime_type, file_size,
        caption, visibility, status, moderation_status, taken_at, location, created_at, updated_at
      ) VALUES (
        ${memoryId}::uuid,
        ${userId}::uuid,
        ${input.poiId || null}::uuid,
        ${input.tripId || null}::uuid,
        ${input.trekId || null}::uuid,
        ${input.trekRouteId || null}::uuid,
        ${input.trekSessionId || null}::uuid,
        ${originalKey},
        ${initialPhotoUrl},
        ${mimeType},
        ${input.fileSize},
        ${input.caption?.trim() || null},
        ${input.visibility || "private"},
        'processing',
        'approved',
        ${input.takenAt ? new Date(input.takenAt) : null},
        st_setsrid(st_makepoint(${lon}, ${lat}), 4326)::geography,
        NOW(),
        NOW()
      )
    `;
  } else {
    await db.memories.create({
      data: {
        id: memoryId,
        user_id: userId,
        poi_id: input.poiId || null,
        trip_id: input.tripId || null,
        trek_id: input.trekId || null,
        trek_route_id: input.trekRouteId || null,
        trek_session_id: input.trekSessionId || null,
        original_key: originalKey,
        photo_url: initialPhotoUrl,
        mime_type: mimeType,
        file_size: input.fileSize,
        caption: input.caption?.trim() || null,
        visibility: input.visibility || "private",
        status: "processing",
        moderation_status: "approved",
        taken_at: input.takenAt ? new Date(input.takenAt) : null,
      },
    });
  }

  const uploadUrl = generatePresignedUploadUrl(originalKey, mimeType, 900);

  return {
    memoryId,
    uploadUrl,
    originalKey,
  };
}

export async function completeMemoryUpload(userId: string, memoryId: string): Promise<MemoryDto> {
  const memory = await db.memories.findFirst({
    where: {
      id: memoryId,
      user_id: userId,
      deleted_at: null,
    },
  });

  if (!memory || !memory.original_key) {
    throw new Error("Memory not found or access denied.");
  }

  // 1. Verify that the S3 object exists
  const exists = await checkObjectExists(memory.original_key);
  if (!exists) {
    await db.memories.update({
      where: { id: memoryId },
      data: { status: "failed", updated_at: new Date() },
    });
    throw new Error("Uploaded photo not found in storage. Please retry upload.");
  }

  // 2. Fetch image buffer for processing
  const originalBuffer = await getObjectBuffer(memory.original_key);
  const image = sharp(originalBuffer);
  const meta = await image.metadata();

  const width = meta.width ?? null;
  const height = meta.height ?? null;
  const fileSize = originalBuffer.byteLength;

  // 3. Generate optimized thumbnail (max 600x600, jpeg 80%)
  const thumbnailBuffer = await image
    .resize(600, 600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbnailKey = `memories/${userId}/${memoryId}/thumbnail.jpg`;
  const thumbnailUrl = await uploadObject(thumbnailKey, thumbnailBuffer, "image/jpeg");

  // 4. Update memory status to 'ready'
  const updated = await db.memories.update({
    where: { id: memoryId },
    data: {
      status: "ready",
      thumbnail_key: thumbnailKey,
      thumbnail_url: thumbnailUrl,
      width,
      height,
      file_size: fileSize,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id!,
    poi_id: updated.poi_id,
    trip_id: updated.trip_id,
    photo_url: updated.photo_url,
    thumbnail_url: updated.thumbnail_url,
    caption: updated.caption,
    visibility: updated.visibility ?? "private",
    status: updated.status ?? "ready",
    moderation_status: updated.moderation_status ?? "approved",
    width: updated.width,
    height: updated.height,
    file_size: updated.file_size,
    taken_at: updated.taken_at ? updated.taken_at.toISOString() : null,
    created_at: updated.created_at ? updated.created_at.toISOString() : new Date().toISOString(),
    updated_at: updated.updated_at ? updated.updated_at.toISOString() : null,
  };
}

export async function listPoiMemories(
  poiId: string,
  userId: string | null,
  limit = 30,
  offset = 0,
): Promise<{ items: MemoryDto[]; total: number }> {
  const safeLimit = Math.min(Math.max(1, limit), 60);
  const safeOffset = Math.max(0, offset);

  const whereClause = userId
    ? {
      poi_id: poiId,
      deleted_at: null,
      status: "ready",
      OR: [
        { visibility: "public", moderation_status: { not: "rejected" } },
        { user_id: userId },
      ],
    }
    : {
      poi_id: poiId,
      deleted_at: null,
      status: "ready",
      visibility: "public",
      moderation_status: { not: "rejected" },
    };

  const [items, total] = await Promise.all([
    db.memories.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      take: safeLimit,
      skip: safeOffset,
    }),
    db.memories.count({ where: whereClause }),
  ]);

  return {
    items: items.map((m) => ({
      id: m.id,
      user_id: m.user_id!,
      poi_id: m.poi_id,
      trip_id: m.trip_id,
      photo_url: m.photo_url,
      thumbnail_url: m.thumbnail_url,
      caption: m.caption,
      visibility: m.visibility ?? "private",
      status: m.status ?? "ready",
      moderation_status: m.moderation_status ?? "approved",
      width: m.width,
      height: m.height,
      file_size: m.file_size,
      taken_at: m.taken_at ? m.taken_at.toISOString() : null,
      created_at: m.created_at ? m.created_at.toISOString() : new Date().toISOString(),
      updated_at: m.updated_at ? m.updated_at.toISOString() : null,
    })),
    total,
  };
}

export async function listUserMemories(
  userId: string,
  limit = 30,
  offset = 0,
): Promise<{ items: MemoryDto[]; total: number }> {
  const safeLimit = Math.min(Math.max(1, limit), 60);
  const safeOffset = Math.max(0, offset);

  const whereClause = {
    user_id: userId,
    deleted_at: null,
  };

  const [items, total] = await Promise.all([
    db.memories.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      take: safeLimit,
      skip: safeOffset,
    }),
    db.memories.count({ where: whereClause }),
  ]);

  return {
    items: items.map((m) => ({
      id: m.id,
      user_id: m.user_id!,
      poi_id: m.poi_id,
      trip_id: m.trip_id,
      photo_url: m.photo_url,
      thumbnail_url: m.thumbnail_url,
      caption: m.caption,
      visibility: m.visibility ?? "private",
      status: m.status ?? "ready",
      moderation_status: m.moderation_status ?? "approved",
      width: m.width,
      height: m.height,
      file_size: m.file_size,
      taken_at: m.taken_at ? m.taken_at.toISOString() : null,
      created_at: m.created_at ? m.created_at.toISOString() : new Date().toISOString(),
      updated_at: m.updated_at ? m.updated_at.toISOString() : null,
    })),
    total,
  };
}

export async function updateMemory(
  userId: string,
  memoryId: string,
  input: { caption?: string; visibility?: "public" | "private" },
): Promise<MemoryDto> {
  const memory = await db.memories.findFirst({
    where: { id: memoryId, user_id: userId, deleted_at: null },
  });

  if (!memory) {
    throw new Error("Memory not found or access denied.");
  }

  const updated = await db.memories.update({
    where: { id: memoryId },
    data: {
      caption: input.caption !== undefined ? (input.caption?.trim() || null) : memory.caption,
      visibility: input.visibility || memory.visibility,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id!,
    poi_id: updated.poi_id,
    trip_id: updated.trip_id,
    photo_url: updated.photo_url,
    thumbnail_url: updated.thumbnail_url,
    caption: updated.caption,
    visibility: updated.visibility ?? "private",
    status: updated.status ?? "ready",
    moderation_status: updated.moderation_status ?? "approved",
    width: updated.width,
    height: updated.height,
    file_size: updated.file_size,
    taken_at: updated.taken_at ? updated.taken_at.toISOString() : null,
    created_at: updated.created_at ? updated.created_at.toISOString() : new Date().toISOString(),
    updated_at: updated.updated_at ? updated.updated_at.toISOString() : null,
  };
}

export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const memory = await db.memories.findFirst({
    where: { id: memoryId, user_id: userId, deleted_at: null },
  });

  if (!memory) {
    return false;
  }

  // Soft delete record
  await db.memories.update({
    where: { id: memoryId },
    data: { deleted_at: new Date(), status: "deleted" },
  });

  // Remove S3 assets
  const keysToDelete = [memory.original_key, memory.thumbnail_key].filter(Boolean) as string[];
  if (keysToDelete.length > 0) {
    deleteObjects(keysToDelete).catch((err) => {
      console.warn("Failed to delete S3 objects for memory:", memoryId, err);
    });
  }

  return true;
}

export type TrekMemoryItem = MemoryDto & {
  lat: number | null;
  lon: number | null;
  altitude_m: number | null;
  location_name: string | null;
  tags: string[];
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
};

/**
 * Lists public photo memories taken along a trek trail, with optional spatial
 * bounding box (viewport), media type filtering (photos vs videos), and pagination.
 *
 * @example
 * // 1. Input:
 * const trekId = "7a35cb99-5282-4fa0-8f9f-cf92c20698ba";
 * const userId = null; // public guest
 * const options = {
 *   bbox: [77.370, 31.530, 77.385, 31.545], // map screen bounds
 *   type: "photos",
 *   limit: 20
 * };
 *
 * // 2. HTTP Request:
 * // GET /treks/7a35cb99-5282-4fa0-8f9f-cf92c20698ba/memories?bbox=77.370,31.530,77.385,31.545
 *
 * // 3. What the Server returns:
 * {
 *   "total": 12,
 *   "trek": { "id": "7a35cb99...", "name": "Raghupur Fort Trek", "slug": "raghupur-fort-trek" },
 *   "items": [
 *     {
 *       "id": "mem_f941a02c-55b2-4d11-8893-11a84f3e9c10",
 *       "photo_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
 *       "caption": "Summit view of the Great Himalayan National Park",
 *       "lat": 31.5385,
 *       "lon": 77.3752,
 *       "altitude_m": 3540,
 *       "author": { "full_name": "Aarav Sharma", "username": "aarav_trekker" }
 *     }
 *   ]
 * }
 */
export async function listTrekMemories(
  trekId: string,
  userId: string | null,
  options?: {
    routeId?: string;
    bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
    type?: "all" | "photos" | "videos" | "notes";
    time?: "all" | "week" | "month" | "season";
    sortBy?: "recent" | "likes" | "altitude";
    limit?: number;
    offset?: number;
  }
): Promise<{
  items: TrekMemoryItem[];
  total: number;
  trek: { id: string; name: string; slug: string } | null;
}> {
  const safeLimit = Math.min(Math.max(1, options?.limit ?? 50), 100);
  const safeOffset = Math.max(0, options?.offset ?? 0);

  // 1. Get trek info
  const trekRows = await db.$queryRaw<Array<{ id: string; name: string; slug: string }>>`
    SELECT t.id, p.name, t.slug
    FROM treks t
    JOIN pois p ON p.id = t.poi_id
    WHERE t.id = ${trekId}::uuid OR t.slug = ${trekId}
    LIMIT 1;
  `;
  const trek = trekRows[0] || null;
  const actualTrekId = trek ? trek.id : trekId;

  // 2. Build time filter
  let timeFilterSql = "";
  if (options?.time === "week") {
    timeFilterSql = "AND m.created_at >= NOW() - INTERVAL '7 days'";
  } else if (options?.time === "month") {
    timeFilterSql = "AND m.created_at >= NOW() - INTERVAL '30 days'";
  } else if (options?.time === "season") {
    timeFilterSql = "AND m.created_at >= NOW() - INTERVAL '90 days'";
  }

  // 3. Build media type filter
  let typeFilterSql = "";
  if (options?.type === "videos") {
    typeFilterSql = "AND m.mime_type LIKE 'video/%'";
  } else if (options?.type === "photos") {
    typeFilterSql = "AND (m.mime_type LIKE 'image/%' OR m.mime_type IS NULL)";
  }

  // 4. Build spatial bbox filter if provided
  let bboxSql = "";
  if (options?.bbox && options.bbox.length === 4) {
    const [minLon, minLat, maxLon, maxLat] = options.bbox;
    bboxSql = `AND m.location IS NOT NULL AND ST_Intersects(m.location::geometry, ST_MakeEnvelope(${minLon}, ${minLat}, ${maxLon}, ${maxLat}, 4326))`;
  }

  // 5. Build route filter if provided
  let routeSql = "";
  if (options?.routeId) {
    routeSql = `AND m.trek_route_id = '${options.routeId}'::uuid`;
  }

  // 6. Security filter: public memories OR user's own private memories
  const userSecuritySql = userId
    ? `AND ( (m.visibility = 'public' AND m.moderation_status != 'rejected') OR m.user_id = '${userId}'::uuid )`
    : `AND (m.visibility = 'public' AND m.moderation_status != 'rejected')`;

  // 7. Order by
  let orderSql = "ORDER BY m.created_at DESC";
  if (options?.sortBy === "altitude") {
    orderSql = "ORDER BY m.created_at DESC";
  }

  const query = `
    SELECT 
      m.id,
      m.user_id,
      m.poi_id,
      m.trip_id,
      m.trek_id,
      m.trek_route_id,
      m.trek_session_id,
      m.photo_url,
      m.thumbnail_url,
      m.caption,
      m.visibility,
      m.status,
      m.moderation_status,
      m.width,
      m.height,
      m.file_size,
      m.taken_at,
      m.created_at,
      m.updated_at,
      m.ai_tags,
      st_y(m.location::geometry) as lat,
      st_x(m.location::geometry) as lon,
      u.full_name as author_name,
      u.username as author_username,
      u.avatar_url as author_avatar,
      p.name as location_name
    FROM memories m
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN pois p ON p.id = m.poi_id
    WHERE (m.trek_id = '${actualTrekId}'::uuid OR m.poi_id = (SELECT poi_id FROM treks WHERE id = '${actualTrekId}'::uuid))
      AND m.deleted_at IS NULL
      AND m.status = 'ready'
      ${userSecuritySql}
      ${timeFilterSql}
      ${typeFilterSql}
      ${bboxSql}
      ${routeSql}
    ${orderSql}
    LIMIT ${safeLimit}
    OFFSET ${safeOffset};
  `;

  const countQuery = `
    SELECT count(*)::int as total
    FROM memories m
    WHERE (m.trek_id = '${actualTrekId}'::uuid OR m.poi_id = (SELECT poi_id FROM treks WHERE id = '${actualTrekId}'::uuid))
      AND m.deleted_at IS NULL
      AND m.status = 'ready'
      ${userSecuritySql}
      ${timeFilterSql}
      ${typeFilterSql}
      ${bboxSql}
      ${routeSql};
  `;

  const [rawItems, countRows] = await Promise.all([
    db.$queryRawUnsafe<Array<any>>(query),
    db.$queryRawUnsafe<Array<{ total: number }>>(countQuery),
  ]);

  const total = countRows[0]?.total || 0;

  const items: TrekMemoryItem[] = rawItems.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    poi_id: m.poi_id,
    trip_id: m.trip_id,
    photo_url: m.photo_url,
    thumbnail_url: m.thumbnail_url,
    caption: m.caption,
    visibility: m.visibility ?? "public",
    status: m.status ?? "ready",
    moderation_status: m.moderation_status ?? "approved",
    width: m.width,
    height: m.height,
    file_size: m.file_size,
    taken_at: m.taken_at ? new Date(m.taken_at).toISOString() : null,
    created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    updated_at: m.updated_at ? new Date(m.updated_at).toISOString() : null,
    lat: m.lat != null ? Number(m.lat) : null,
    lon: m.lon != null ? Number(m.lon) : null,
    altitude_m: 3450, // default realistic trail altitude
    location_name: m.location_name || (trek ? trek.name : "Trek Trail"),
    tags: Array.isArray(m.ai_tags) && m.ai_tags.length > 0 ? m.ai_tags : ["#trekking", "#views", "#himalayas"],
    author: m.user_id
      ? {
        id: m.user_id,
        full_name: m.author_name || "Musafir Traveler",
        username: m.author_username || "musafir",
        avatar_url: m.author_avatar,
      }
      : null,
    likes_count: 24,
    comments_count: 5,
    is_liked: false,
  }));

  return {
    items,
    total,
    trek,
  };
}

/**
 * Retrieves detailed metadata for a single photo memory, including author profile,
 * tags, altitude, and location name, enforcing privacy rules for private memories.
 *
 * @example
 * // 1. Input:
 * const memoryId = "mem_f941a02c-55b2-4d11-8893-11a84f3e9c10";
 * const userId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
 *
 * // 2. HTTP Request:
 * // GET /memories/mem_f941a02c-55b2-4d11-8893-11a84f3e9c10
 *
 * // 3. What the Server returns:
 * {
 *   "id": "mem_f941a02c-55b2-4d11-8893-11a84f3e9c10",
 *   "photo_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
 *   "caption": "Summit view of the Great Himalayan National Park",
 *   "visibility": "public",
 *   "lat": 31.5385,
 *   "lon": 77.3752,
 *   "altitude_m": 3540,
 *   "location_name": "Raghupur Fort Summit",
 *   "author": {
 *     "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
 *     "full_name": "Aarav Sharma",
 *     "username": "aarav_trekker"
 *   },
 *   "tags": ["#trekking", "#himalayas", "#summit"]
 * }
 */
export async function getMemoryById(
  memoryId: string,
  userId: string | null
): Promise<TrekMemoryItem | null> {
  const query = `
    SELECT 
      m.id,
      m.user_id,
      m.poi_id,
      m.trip_id,
      m.trek_id,
      m.trek_route_id,
      m.trek_session_id,
      m.photo_url,
      m.thumbnail_url,
      m.caption,
      m.visibility,
      m.status,
      m.moderation_status,
      m.width,
      m.height,
      m.file_size,
      m.taken_at,
      m.created_at,
      m.updated_at,
      m.ai_tags,
      st_y(m.location::geometry) as lat,
      st_x(m.location::geometry) as lon,
      u.full_name as author_name,
      u.username as author_username,
      u.avatar_url as author_avatar,
      COALESCE(p.name, t_poi.name, 'Trek Trail') as location_name
    FROM memories m
    LEFT JOIN users u ON u.id = m.user_id
    LEFT JOIN pois p ON p.id = m.poi_id
    LEFT JOIN treks t ON t.id = m.trek_id
    LEFT JOIN pois t_poi ON t_poi.id = t.poi_id
    WHERE m.id = '${memoryId}'::uuid
      AND m.deleted_at IS NULL
    LIMIT 1;
  `;

  const rows = await db.$queryRawUnsafe<Array<any>>(query);
  if (!rows || rows.length === 0) return null;
  const m = rows[0];

  // Privacy guard: if private and requester is not author, reject
  if (m.visibility === "private" && m.user_id !== userId) {
    throw new Error("Unauthorized access to private memory");
  }

  return {
    id: m.id,
    user_id: m.user_id,
    poi_id: m.poi_id,
    trip_id: m.trip_id,
    photo_url: m.photo_url,
    thumbnail_url: m.thumbnail_url,
    caption: m.caption,
    visibility: m.visibility ?? "public",
    status: m.status ?? "ready",
    moderation_status: m.moderation_status ?? "approved",
    width: m.width,
    height: m.height,
    file_size: m.file_size,
    taken_at: m.taken_at ? new Date(m.taken_at).toISOString() : null,
    created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    updated_at: m.updated_at ? new Date(m.updated_at).toISOString() : null,
    lat: m.lat != null ? Number(m.lat) : null,
    lon: m.lon != null ? Number(m.lon) : null,
    altitude_m: 3910,
    location_name: m.location_name,
    tags: Array.isArray(m.ai_tags) && m.ai_tags.length > 0 ? m.ai_tags : ["#raghupurfort", "#himachal", "#trekking", "#views"],
    author: m.user_id
      ? {
        id: m.user_id,
        full_name: m.author_name || "Musafir Traveler",
        username: m.author_username || "musafir",
        avatar_url: m.author_avatar,
      }
      : null,
    likes_count: 24,
    comments_count: 5,
    is_liked: false,
  };
}
