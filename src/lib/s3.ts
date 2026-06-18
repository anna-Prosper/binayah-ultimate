import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

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

export function getS3PublicUrl(key: string): string {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURI(key)}`;
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
  const url = getS3PublicUrl(key);
  return { key, url, contentType, size: body.length };
}

export async function createPresignedUpload(
  prefix: string,
  filename: string,
  contentType: string,
): Promise<{ key: string; url: string; publicUrl: string; contentType: string }> {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${prefix.replace(/\/$/, "")}/${Date.now()}-${safe}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
  });
  const url = await getSignedUrl(client(), command, { expiresIn: 60 * 5 });
  const publicUrl = getS3PublicUrl(key);
  return { key, url, publicUrl, contentType };
}

export async function createPresignedFormUpload(
  prefix: string,
  filename: string,
  contentType: string,
  maxBytes = MAX_ATTACHMENT_BYTES,
): Promise<{ key: string; url: string; fields: Record<string, string>; publicUrl: string; contentType: string }> {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${prefix.replace(/\/$/, "")}/${Date.now()}-${safe}`;
  const post = await createPresignedPost(client(), {
    Bucket: BUCKET,
    Key: key,
    Expires: 60 * 5,
    Conditions: [
      ["content-length-range", 1, maxBytes],
      ["eq", "$Content-Type", contentType],
      ["eq", "$Cache-Control", "public, max-age=31536000"],
    ],
    Fields: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
  const publicUrl = getS3PublicUrl(key);
  return { key, url: post.url, fields: post.fields, publicUrl, contentType };
}

export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function getS3ObjectInfo(key: string): Promise<{ size: number; contentType: string | null }> {
  if (!BUCKET) throw new Error("AWS_S3_BUCKET not configured");
  const object = await client().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return {
    size: object.ContentLength ?? 0,
    contentType: object.ContentType ?? null,
  };
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_SERVER_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_CONTENT_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf", "application/x-pdf",
  "text/plain", "text/markdown", "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

export function normalizeAttachmentContentType(filename: string, contentType: string): string {
  const lower = filename.toLowerCase();
  const type = contentType.trim().toLowerCase();
  if ((type === "" || type === "application/octet-stream" || type === "application/x-pdf") && lower.endsWith(".pdf")) return "application/pdf";
  if ((type === "" || type === "application/octet-stream") && lower.endsWith(".md")) return "text/markdown";
  if ((type === "" || type === "application/octet-stream") && lower.endsWith(".csv")) return "text/csv";
  if ((type === "" || type === "application/octet-stream") && lower.endsWith(".txt")) return "text/plain";
  if ((type === "" || type === "application/octet-stream") && lower.endsWith(".json")) return "application/json";
  if ((type === "" || type === "application/octet-stream") && lower.endsWith(".zip")) return "application/zip";
  return type || "application/octet-stream";
}
