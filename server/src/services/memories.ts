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

export async function initiateMemoryUpload(
  userId: string,
  input: {
    poiId?: string;
    tripId?: string;
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
        id, user_id, poi_id, trip_id, original_key, photo_url, mime_type, file_size,
        caption, visibility, status, moderation_status, taken_at, location, created_at, updated_at
      ) VALUES (
        ${memoryId}::uuid,
        ${userId}::uuid,
        ${input.poiId || null}::uuid,
        ${input.tripId || null}::uuid,
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
