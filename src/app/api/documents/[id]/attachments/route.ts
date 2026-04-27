import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import BinayahDocument, { type IDocAttachment } from "@/lib/BinayahDocument";
import { uploadToS3, MAX_ATTACHMENT_BYTES, ALLOWED_CONTENT_TYPES } from "@/lib/s3";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/documents/[id]/attachments — upload a file as attachment
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(req, "/api/documents/attachments", 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many uploads — slow down" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const { id } = await ctx.params;
  if (!id || typeof id !== "string") return NextResponse.json({ error: "doc id required" }, { status: 400 });

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

  await connectMongo();
  const doc = await BinayahDocument.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "doc not found" }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadToS3(`docs/${id}`, file.name, buf, contentType);

  const userId = session.user?.fixedUserId ?? "unknown";
  const attachment: IDocAttachment = {
    id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    key: uploaded.key,
    url: uploaded.url,
    name: file.name,
    contentType: uploaded.contentType,
    size: uploaded.size,
    uploadedBy: userId,
    uploadedAt: new Date(),
  };

  await BinayahDocument.findByIdAndUpdate(id, {
    $push: { attachments: attachment },
    $set: { updatedBy: userId, updatedAt: new Date() },
  });

  return NextResponse.json({ attachment }, { status: 201 });
}
