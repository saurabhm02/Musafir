import { api } from "./api";
import { compressImage, uploadToStorage } from "./imageUpload";

export type Memory = { id: string; photo_url: string; visibility: "public" | "private"; user_id: string };

// Input: a POI id
// Output: every memory the current user is allowed to see for it
// The server does the public/private filtering now (see server/src/memories.ts)
export async function fetchMemories(poiId: string): Promise<Memory[]> {
  return api<Memory[]>(`/pois/${poiId}/memories`);
}

// Input: a photo picked for a POI, and public/private
// Output: nothing -- the memory is saved, geo-tagged to the POI's own location by the server
export async function addMemory(input: {
  poiId: string;
  photoUri: string;
  visibility: "public" | "private";
}): Promise<void> {
  const compressed = await compressImage(input.photoUri);
  const photoUrl = await uploadToStorage(`poi-photos/${input.poiId}/${Date.now()}.jpg`, compressed);
  await api("/memories", {
    method: "POST",
    body: JSON.stringify({ poiId: input.poiId, photoUrl, visibility: input.visibility }),
  });
}
