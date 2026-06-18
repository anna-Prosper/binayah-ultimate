import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import BinayahDocument, { type IDocAttachment } from "@/lib/BinayahDocument";
import { uploadToS3, getS3ObjectInfo, getS3PublicUrl, MAX_ATTACHMENT_BYTES, MAX_SERVER_UPLOAD_BYTES, ALLOWED_CONTENT_TYPES, normalizeAttachmentContentType } from "@/lib/s3";
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

  const userId = session.user?.fixedUserId ?? "unknown";

  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = await req.json().catch(() => null) as {
      key?: unknown; url?: unknown; name?: unknown; contentType?: unknown; size?: unknown;
    } | null;
    const key = typeof body?.key === "string" ? body.key : "";
    const submittedUrl = typeof body?.url === "string" ? body.url : "";
    const name = typeof body?.name === "string" ? body.name : "";
    const contentType = typeof body?.contentType === "string" ? normalizeAttachmentContentType(name, body.contentType) : "";
    const size = typeof body?.size === "number" ? body.size : 0;

    if (!key.startsWith(`docs/${id}/`) || !submittedUrl || !name || !contentType || size <= 0) {
      return NextResponse.json({ error: "invalid uploaded attachment metadata" }, { status: 400 });
    }
    if (size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: `file too large — max ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB` }, { status: 413 });
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: `unsupported file type: ${contentType}` }, { status: 415 });
    }
    const url = getS3PublicUrl(key);
    if (submittedUrl !== url) {
      return NextResponse.json({ error: "uploaded attachment URL did not match storage key" }, { status: 400 });
    }

    let stored: Awaited<ReturnType<typeof getS3ObjectInfo>>;
    try {
      stored = await getS3ObjectInfo(key);
    } catch (e) {
      try {
        const publicHead = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (!publicHead.ok) throw e;
        stored = {
          size: Number(publicHead.headers.get("content-length") || "0"),
          contentType: publicHead.headers.get("content-type"),
        };
      } catch {
        console.error("[docs/attachments] uploaded object not found:", e);
        return NextResponse.json({ error: "upload did not reach storage — please try again" }, { status: 502 });
      }
    }
    if (stored.size !== size) {
      return NextResponse.json({ error: "uploaded file size did not match" }, { status: 400 });
    }
    const storedContentType = normalizeAttachmentContentType(name, stored.contentType || contentType);
    if (storedContentType !== contentType) {
      return NextResponse.json({ error: "uploaded file type did not match" }, { status: 400 });
    }

    await connectMongo();
    const doc = await BinayahDocument.findById(id).select("_id").lean();
    if (!doc) return NextResponse.json({ error: "doc not found" }, { status: 404 });

    const attachment: IDocAttachment = {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      key,
      url,
      name,
      contentType,
      size,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    await BinayahDocument.findByIdAndUpdate(id, {
      $push: { attachments: attachment },
      $set: { updatedBy: userId, updatedAt: new Date() },
    });

    return NextResponse.json({ attachment }, { status: 201 });
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

  await connectMongo();
  const doc = await BinayahDocument.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "doc not found" }, { status: 404 });

  let uploaded: Awaited<ReturnType<typeof uploadToS3>>;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    uploaded = await uploadToS3(`docs/${id}`, file.name, buf, contentType);
  } catch (e) {
    console.error("[docs/attachments] upload failed:", e);
    return NextResponse.json({ error: "upload failed — storage is not accepting the file" }, { status: 502 });
  }

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
