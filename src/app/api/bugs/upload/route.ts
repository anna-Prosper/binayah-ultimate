import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToS3, MAX_ATTACHMENT_BYTES, MAX_SERVER_UPLOAD_BYTES, ALLOWED_CONTENT_TYPES, normalizeAttachmentContentType } from "@/lib/s3";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/bugs/upload — upload a file and return attachment metadata for the
// bug tracker. The bug record itself is held client-side in the shared state
// and persists through the standard pipeline-state patch flow.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(req, "/api/bugs/upload", 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many uploads — slow down" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "upload failed — file may be too large for the server limit" }, { status: 413 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file field required" }, { status: 400 });

  const maxBytes = Math.min(MAX_ATTACHMENT_BYTES, MAX_SERVER_UPLOAD_BYTES);
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `file too large — max ${Math.round(maxBytes / 1024 / 1024)}MB` }, { status: 413 });
  }
  const contentType = normalizeAttachmentContentType(file.name, file.type || "application/octet-stream");
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: `unsupported file type: ${contentType}` }, { status: 415 });
  }

  let uploaded: Awaited<ReturnType<typeof uploadToS3>>;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    uploaded = await uploadToS3("bugs", file.name, buf, contentType);
  } catch (e) {
    console.error("[bugs/upload] upload failed:", e);
    return NextResponse.json({ error: "upload failed — storage is not accepting the file" }, { status: 502 });
  }

  return NextResponse.json({
    attachment: {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      url: uploaded.url,
      name: file.name,
      contentType: uploaded.contentType,
      size: uploaded.size,
      uploadedAt: Date.now(),
    },
  }, { status: 201 });
}
