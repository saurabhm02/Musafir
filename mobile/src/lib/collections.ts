import { api } from "./api";
import type { Poi } from "./pois";

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  poi_count: number;
  created_at: string;
  updated_at: string;
};

export type CollectionDetail = Collection & {
  pois: Poi[];
};

export function fetchCollections(): Promise<Collection[]> {
  return api<Collection[]>("/me/collections");
}

export function fetchCollectionDetail(id: string): Promise<CollectionDetail> {
  return api<CollectionDetail>(`/me/collections/${id}`);
}

export function createCollection(input: { name: string; description?: string; cover_url?: string }): Promise<Collection> {
  return api<Collection>("/me/collections", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCollection(
  id: string,
  input: { name?: string; description?: string; cover_url?: string },
): Promise<Collection> {
  return api<Collection>(`/me/collections/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteCollection(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/me/collections/${id}`, {
    method: "DELETE",
  });
}

export function togglePoiInCollection(
  collectionId: string,
  poiId: string,
): Promise<{ in_collection: boolean; poi_count: number }> {
  return api<{ in_collection: boolean; poi_count: number }>(`/me/collections/${collectionId}/toggle-poi`, {
    method: "POST",
    body: JSON.stringify({ poiId }),
  });
}
