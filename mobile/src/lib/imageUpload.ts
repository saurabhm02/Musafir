import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { ensureSession } from "./supabase";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;

// Input: a locally picked photo's uri
// Output: a resized (max 1080px wide) jpeg's uri, ready to upload
export async function compressImage(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1080 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

// Input: a storage path (e.g. "poi-photos/<poiId>/<timestamp>.jpg") and a local file uri
// Output: the public URL of the uploaded file
// ponytail: uploads via the server, not straight to S3 -- the S3 secret key
// can never live in the app bundle, only the server holds it.
export async function uploadToStorage(path: string, uri: string): Promise<string> {
  const session = await ensureSession();
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const uploadRes = await fetch(`${SERVER_URL}/upload?path=${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", Authorization: `Bearer ${session!.access_token}` },
    body: bytes,
  });
  if (!uploadRes.ok) throw new Error(`upload failed: ${uploadRes.status}`);
  const { url } = await uploadRes.json();
  return url;
}
