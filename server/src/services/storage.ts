import { S3Client } from "bun";

const bucket = process.env.S3_BUCKET || "gomusafir";
const region = process.env.S3_REGION || "us-east-1";

export const s3 = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region,
  bucket,
});

export function getPublicUrl(key: string): string {
  const cdnBase = process.env.S3_CDN_URL;
  if (cdnBase) {
    return `${cdnBase.replace(/\/$/, "")}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSec = 900,
): string {
  const file = s3.file(key);
  return file.presign({
    method: "PUT",
    expiresIn: expiresInSec,
    type: contentType,
  });
}

export async function checkObjectExists(key: string): Promise<boolean> {
  try {
    const file = s3.file(key);
    return await file.exists();
  } catch {
    return false;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const file = s3.file(key);
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadObject(
  key: string,
  bytes: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  await s3.write(key, bytes, { type: contentType });
  return getPublicUrl(key);
}

export async function deleteObject(key: string): Promise<boolean> {
  try {
    const file = s3.file(key);
    await file.delete();
    return true;
  } catch {
    return false;
  }
}

export async function deleteObjects(keys: string[]): Promise<void> {
  await Promise.all(keys.filter(Boolean).map((k) => deleteObject(k)));
}

// Legacy helper for any existing callers
export async function uploadAsset(
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  return uploadObject(path, bytes, contentType);
}
