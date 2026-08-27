import { api } from "./api";
import type { Poi } from "./pois";

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  poi_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type CollectionDetail = Collection & {
  pois: Poi[];
};

export function fetchCollections(): Promise<Collection[]> {
  return api<Collection[]>("/collections");
}

export function fetchCollectionDetail(id: string): Promise<CollectionDetail> {
  return api<CollectionDetail>(`/collections/${id}`);
}

export function createCollection(input: {
  name: string;
  description?: string;
  cover_url?: string;
  is_public?: boolean;
}): Promise<Collection> {
  return api<Collection>("/collections", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCollection(
  id: string,
  input: { name?: string; description?: string; cover_url?: string; is_public?: boolean },
): Promise<Collection> {
  return api<Collection>(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCollection(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/collections/${id}`, {
    method: "DELETE",
  });
}

export function addPoiToCollection(collectionId: string, poiId: string): Promise<{ added: boolean }> {
  return api<{ added: boolean }>(`/collections/${collectionId}/pois`, {
    method: "POST",
    body: JSON.stringify({ poiId }),
  });
}

export function removePoiFromCollection(collectionId: string, poiId: string): Promise<{ removed: boolean }> {
  return api<{ removed: boolean }>(`/collections/${collectionId}/pois/${poiId}`, {
    method: "DELETE",
  });
}

export function reorderCollectionPois(collectionId: string, poiIds: string[]): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/collections/${collectionId}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ poiIds }),
  });
}

export function togglePoiInCollection(
  collectionId: string,
  poiId: string,
): Promise<{ in_collection?: boolean; inCollection?: boolean; poi_count?: number }> {
  return api<{ in_collection?: boolean; inCollection?: boolean; poi_count?: number }>(
    `/me/collections/${collectionId}/toggle-poi`,
    {
      method: "POST",
      body: JSON.stringify({ poiId }),
    },
  );
}
