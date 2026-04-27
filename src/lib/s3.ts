import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.AWS_S3_BUCKET || "";

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not configured");
  }
  _client = new S3Client({ region: REGION, credentials: { accessKeyId, secretAccessKey } });
  return _client;
}

export interface UploadResult {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export async function uploadToS3(
  prefix: string,
  filename: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<UploadResult> {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${prefix.replace(/\/$/, "")}/${Date.now()}-${safe}`;
  await client().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
  }));
  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURI(key)}`;
  return { key, url, contentType, size: body.length };
}

export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB
export const ALLOWED_CONTENT_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/markdown", "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);
