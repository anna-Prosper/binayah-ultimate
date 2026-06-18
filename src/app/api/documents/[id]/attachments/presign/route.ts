import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import BinayahDocument from "@/lib/BinayahDocument";
import { ALLOWED_CONTENT_TYPES, MAX_ATTACHMENT_BYTES, createPresignedFormUpload, normalizeAttachmentContentType } from "@/lib/s3";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(req, "/api/documents/attachments/presign", 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many uploads — slow down" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const { id } = await ctx.params;
  if (!id || typeof id !== "string") return NextResponse.json({ error: "doc id required" }, { status: 400 });

  const body = await req.json().catch(() => null) as { name?: unknown; type?: unknown; size?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name : "";
  const rawType = typeof body?.type === "string" ? body.type : "application/octet-stream";
  const size = typeof body?.size === "number" ? body.size : 0;
  if (!name) return NextResponse.json({ error: "file name required" }, { status: 400 });
  if (size <= 0) return NextResponse.json({ error: "file size required" }, { status: 400 });
  if (size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: `file too large — max ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB` }, { status: 413 });
  }

  const contentType = normalizeAttachmentContentType(name, rawType);
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: `unsupported file type: ${contentType}` }, { status: 415 });
  }

  await connectMongo();
  const doc = await BinayahDocument.findById(id).select("_id").lean();
  if (!doc) return NextResponse.json({ error: "doc not found" }, { status: 404 });

  try {
    const upload = await createPresignedFormUpload(`docs/${id}`, name, contentType, MAX_ATTACHMENT_BYTES);
    return NextResponse.json({ ok: true, upload });
  } catch (e) {
    console.error("[docs/attachments/presign] failed:", e);
    return NextResponse.json({ error: "upload failed — storage is not configured" }, { status: 502 });
  }
}
