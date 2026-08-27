import { db } from "../lib/db";
import { deleteObjects } from "./storage";
import { dispatchNotification } from "./notifications";

export type AdminMemoryItem = {
  id: string;
  photo_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  visibility: string;
  status: string;
  moderation_status: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string | null;
  lat: number | null;
  lon: number | null;
  poi: {
    id: string;
    name: string;
    category: string;
    state: string | null;
    district: string | null;
    address: string | null;
  } | null;
  user: {
    id: string;
    email: string | null;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type AdminMemoriesResponse = {
  items: AdminMemoryItem[];
  total: number;
  stats: {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalPublic: number;
  };
};

export async function listAdminMemories(filters: {
  moderationStatus?: string; // 'pending' | 'approved' | 'rejected' | 'all'
  poiId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminMemoriesResponse> {
  const limit = Math.min(Math.max(1, filters.limit ?? 30), 100);
  const offset = Math.max(0, filters.offset ?? 0);
  const statusFilter = filters.moderationStatus && filters.moderationStatus !== "all" ? filters.moderationStatus : null;
  const search = filters.search?.trim().toLowerCase();

  // 1. Calculate overall stats across all public memories
  const [statsRows] = await db.$queryRaw<
    {
      total_pending: bigint;
      total_approved: bigint;
      total_rejected: bigint;
      total_public: bigint;
    }[]
  >`
    SELECT
      count(*) FILTER (WHERE moderation_status = 'pending') as total_pending,
      count(*) FILTER (WHERE moderation_status = 'approved') as total_approved,
      count(*) FILTER (WHERE moderation_status = 'rejected') as total_rejected,
      count(*) as total_public
    FROM memories
    WHERE deleted_at IS NULL AND visibility = 'public' AND status = 'ready'
  `;

  const stats = {
    totalPending: Number(statsRows?.total_pending ?? 0),
    totalApproved: Number(statsRows?.total_approved ?? 0),
    totalRejected: Number(statsRows?.total_rejected ?? 0),
    totalPublic: Number(statsRows?.total_public ?? 0),
  };

  // 2. Query filtered memories with PostGIS coordinates, POI metadata, and uploader account
  let querySql = `
    SELECT
      m.id,
      m.photo_url,
      m.thumbnail_url,
      m.caption,
      m.visibility,
      m.status,
      m.moderation_status,
      m.width,
      m.height,
      m.file_size,
      m.mime_type,
      m.taken_at,
      m.created_at,
      m.updated_at,
      st_y(m.location::geometry) as lat,
      st_x(m.location::geometry) as lon,
      p.id as poi_id,
      p.name as poi_name,
      p.category as poi_category,
      p.address as poi_address,
      pm.state as poi_state,
      pm.district as poi_district,
      u.id as user_id,
      u.email as user_email,
      u.username as user_username,
      u.full_name as user_full_name,
      u.avatar_url as user_avatar_url
    FROM memories m
    LEFT JOIN pois p ON m.poi_id = p.id
    LEFT JOIN poi_metadata pm ON p.id = pm.poi_id
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.deleted_at IS NULL AND m.visibility = 'public'
  `;

  const params: any[] = [];
  let paramIdx = 1;

  if (statusFilter) {
    querySql += ` AND m.moderation_status = $${paramIdx++}`;
    params.push(statusFilter);
  }

  if (filters.poiId) {
    querySql += ` AND m.poi_id = $${paramIdx++}::uuid`;
    params.push(filters.poiId);
  }

  if (search) {
    querySql += ` AND (
      p.name ILIKE $${paramIdx} OR
      m.caption ILIKE $${paramIdx} OR
      u.email ILIKE $${paramIdx} OR
      u.full_name ILIKE $${paramIdx} OR
      u.username ILIKE $${paramIdx}
    )`;
    paramIdx++;
    params.push(`%${search}%`);
  }

  // Count query for pagination
  const countSql = `SELECT count(*) as total FROM (${querySql}) as sub`;
  const countRes = await db.$queryRawUnsafe<{ total: bigint }[]>(countSql, ...params);
  const total = Number(countRes[0]?.total ?? 0);

  // Order and paginate
  querySql += ` ORDER BY m.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);

  const rows = await db.$queryRawUnsafe<any[]>(querySql, ...params);

  const items: AdminMemoryItem[] = rows.map((r) => ({
    id: r.id,
    photo_url: r.photo_url,
    thumbnail_url: r.thumbnail_url,
    caption: r.caption,
    visibility: r.visibility,
    status: r.status,
    moderation_status: r.moderation_status || "approved",
    width: r.width,
    height: r.height,
    file_size: r.file_size,
    mime_type: r.mime_type,
    taken_at: r.taken_at ? new Date(r.taken_at).toISOString() : null,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null,
    lat: r.lat != null ? Number(r.lat) : null,
    lon: r.lon != null ? Number(r.lon) : null,
    poi: r.poi_id
      ? {
          id: r.poi_id,
          name: r.poi_name,
          category: r.poi_category,
          state: r.poi_state,
          district: r.poi_district,
          address: r.poi_address,
        }
      : null,
    user: r.user_id
      ? {
          id: r.user_id,
          email: r.user_email,
          username: r.user_username,
          full_name: r.user_full_name,
          avatar_url: r.user_avatar_url,
        }
      : null,
  }));

  return {
    items,
    total,
    stats,
  };
}

export async function approveMemory(memoryId: string): Promise<boolean> {
  const memory = await db.memories.findUnique({
    where: { id: memoryId },
  });

  if (!memory || memory.deleted_at) {
    throw new Error("Memory not found");
  }

  await db.memories.update({
    where: { id: memoryId },
    data: {
      moderation_status: "approved",
      updated_at: new Date(),
    },
  });

  if (memory.user_id) {
    dispatchNotification({
      userId: memory.user_id,
      type: "memory_moderated",
      title: "Memory Featured! 📸",
      subtitle: "Your travel memory has been approved and published to the explore feed.",
      data: { entityType: "memory", entityId: memoryId },
      idempotencyKey: `mem_approved_${memoryId}`,
    }).catch(() => {});
  }

  return true;
}

export async function rejectMemory(memoryId: string, reason?: string): Promise<boolean> {
  const memory = await db.memories.findUnique({
    where: { id: memoryId },
  });

  if (!memory || memory.deleted_at) {
    throw new Error("Memory not found");
  }

  await db.memories.update({
    where: { id: memoryId },
    data: {
      moderation_status: "rejected",
      updated_at: new Date(),
    },
  });

  if (memory.user_id) {
    dispatchNotification({
      userId: memory.user_id,
      type: "memory_removed",
      title: "Memory Review Notice",
      subtitle: reason ? `Your memory was rejected: ${reason}` : "Your photo did not meet community guidelines.",
      data: { entityType: "memory", entityId: memoryId },
      idempotencyKey: `mem_rejected_${memoryId}`,
    }).catch(() => {});
  }

  return true;
}

export async function revokeApprovedMemory(memoryId: string): Promise<boolean> {
  const memory = await db.memories.findUnique({
    where: { id: memoryId },
  });

  if (!memory || memory.deleted_at) {
    throw new Error("Memory not found");
  }

  await db.memories.update({
    where: { id: memoryId },
    data: {
      moderation_status: "rejected",
      updated_at: new Date(),
    },
  });

  return true;
}

export async function deleteMemoryAdmin(memoryId: string): Promise<boolean> {
  const memory = await db.memories.findUnique({
    where: { id: memoryId },
  });

  if (!memory) {
    return false;
  }

  // Soft delete record
  await db.memories.update({
    where: { id: memoryId },
    data: {
      deleted_at: new Date(),
      status: "deleted",
    },
  });

  // Clean S3 objects
  const keysToDelete = [memory.original_key, memory.thumbnail_key].filter(Boolean) as string[];
  if (keysToDelete.length > 0) {
    deleteObjects(keysToDelete).catch((err) => {
      console.warn("Failed to clean S3 objects for deleted memory:", memoryId, err);
    });
  }

  return true;
}
