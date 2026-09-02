import { api } from "./api";

export type Memory = {
  id: string;
  user_id: string;
  poi_id: string | null;
  trip_id: string | null;
  photo_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  visibility: "public" | "private";
  status: "processing" | "ready" | "failed";
  moderation_status: "approved" | "pending" | "rejected";
  width: number | null;
  height: number | null;
  file_size: number | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type MemoriesListResponse = {
  items: Memory[];
  total: number;
};

export type AdminMemoryItem = Memory & {
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

export async function fetchPoiMemories(poiId: string, limit = 30, offset = 0): Promise<MemoriesListResponse> {
  return api<MemoriesListResponse>(`/pois/${poiId}/memories?limit=${limit}&offset=${offset}`);
}

export async function fetchMyMemories(limit = 30, offset = 0): Promise<MemoriesListResponse> {
  return api<MemoriesListResponse>(`/memories/me?limit=${limit}&offset=${offset}`);
}

export async function uploadMemory(input: {
  poiId?: string;
  tripId?: string;
  trekId?: string;
  trekRouteId?: string;
  trekSessionId?: string;
  uri: string;
  caption?: string;
  visibility: "public" | "private";
  mimeType?: string;
  fileSize?: number;
}): Promise<Memory> {
  const mimeType = input.mimeType || "image/jpeg";
  const fileSize = input.fileSize || 1024 * 1024; // fallback estimate if not provided

  // 1. Initiate upload session with server
  const session = await api<{ memoryId: string; uploadUrl: string; originalKey: string }>("/memories/upload", {
    method: "POST",
    body: JSON.stringify({
      poiId: input.poiId,
      tripId: input.tripId,
      trekId: input.trekId,
      trekRouteId: input.trekRouteId,
      trekSessionId: input.trekSessionId,
      mimeType,
      fileSize,
      caption: input.caption,
      visibility: input.visibility,
    }),
  });

  // 2. Fetch local image binary as Blob
  const localRes = await fetch(input.uri);
  const blob = await localRes.blob();

  // 3. Upload directly to S3 via Presigned URL (zero server bandwidth used)
  const s3PutRes = await fetch(session.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: blob,
  });

  if (!s3PutRes.ok) {
    throw new Error(`Direct S3 upload failed with status ${s3PutRes.status}`);
  }

  // 4. Complete upload on server (triggers sharp thumbnail generation & verification)
  const completed = await api<Memory>(`/memories/${session.memoryId}/complete`, {
    method: "POST",
  });

  return completed;
}

export async function updateMemory(
  id: string,
  input: { caption?: string; visibility?: "public" | "private" },
): Promise<Memory> {
  return api<Memory>(`/memories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteMemory(id: string): Promise<void> {
  await api(`/memories/${id}`, {
    method: "DELETE",
  });
}

// Admin Moderation API Methods
export async function fetchAdminMemories(params?: {
  status?: "pending" | "approved" | "rejected" | "all";
  poiId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminMemoriesResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.poiId) query.set("poiId", params.poiId);
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  return api<AdminMemoriesResponse>(`/api/admin/memories?${query.toString()}`);
}

export async function approveAdminMemory(id: string): Promise<{ ok: boolean; id: string; moderation_status: string }> {
  return api(`/api/admin/memories/${id}/approve`, { method: "POST" });
}

export async function rejectAdminMemory(
  id: string,
  reason?: string,
): Promise<{ ok: boolean; id: string; moderation_status: string }> {
  return api(`/api/admin/memories/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function revokeAdminMemory(id: string): Promise<{ ok: boolean; id: string; moderation_status: string }> {
  return api(`/api/admin/memories/${id}/revoke`, { method: "POST" });
}

export async function deleteAdminMemory(id: string): Promise<{ ok: boolean }> {
  return api(`/api/admin/memories/${id}`, { method: "DELETE" });
}

export type TrekMemoryItem = Memory & {
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

export type TrekMemoriesResponse = {
  items: TrekMemoryItem[];
  total: number;
  trek: { id: string; name: string; slug: string } | null;
};

export async function fetchTrekMemories(
  trekId: string,
  params?: {
    routeId?: string;
    bbox?: [number, number, number, number];
    type?: "all" | "photos" | "videos" | "notes";
    time?: "all" | "week" | "month" | "season";
    sortBy?: "recent" | "likes" | "altitude";
    limit?: number;
    offset?: number;
  }
): Promise<TrekMemoriesResponse> {
  const query = new URLSearchParams();
  if (params?.routeId) query.set("routeId", params.routeId);
  if (params?.type && params.type !== "all") query.set("type", params.type);
  if (params?.time && params.time !== "all") query.set("time", params.time);
  if (params?.sortBy) query.set("sortBy", params.sortBy);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.bbox) query.set("bbox", params.bbox.join(","));

  return api<TrekMemoriesResponse>(`/treks/${trekId}/memories?${query.toString()}`);
}

export async function fetchMemoryById(memoryId: string): Promise<TrekMemoryItem> {
  return api<TrekMemoryItem>(`/memories/${memoryId}`);
}
