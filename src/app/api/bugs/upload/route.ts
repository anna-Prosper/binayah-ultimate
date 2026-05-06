import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { uploadToS3, MAX_ATTACHMENT_BYTES, ALLOWED_CONTENT_TYPES } from "@/lib/s3";
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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file field required" }, { status: 400 });

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: `file too large — max ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB` }, { status: 413 });
  }
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: `unsupported file type: ${contentType}` }, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadToS3("bugs", file.name, buf, contentType);

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
