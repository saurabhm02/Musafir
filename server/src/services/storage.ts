import { S3Client } from "bun";

const s3 = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
  bucket: process.env.S3_BUCKET,
});

export async function uploadAsset(path: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  await s3.write(path, bytes, { type: contentType });
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${path}`;
}
