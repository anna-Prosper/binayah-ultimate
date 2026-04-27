import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import BinayahDocument from "@/lib/BinayahDocument";
import { deleteFromS3 } from "@/lib/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// DELETE /api/documents/[id]/attachments/[attachmentId]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; attachmentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await ctx.params;
  if (!id || !attachmentId) return NextResponse.json({ error: "ids required" }, { status: 400 });

  await connectMongo();
  const doc = await BinayahDocument.findById(id);
  if (!doc) return NextResponse.json({ error: "doc not found" }, { status: 404 });

  const attachment = doc.attachments.find(a => a.id === attachmentId);
  if (!attachment) return NextResponse.json({ error: "attachment not found" }, { status: 404 });

  // Best-effort S3 delete (don't block the DB cleanup if S3 is flaky)
  try {
    await deleteFromS3(attachment.key);
  } catch (e) {
    console.warn(`[docs/attachments] s3 delete failed for ${attachment.key}:`, e);
  }

  doc.attachments = doc.attachments.filter(a => a.id !== attachmentId);
  doc.updatedBy = session.user?.fixedUserId ?? "unknown";
  await doc.save();

  return NextResponse.json({ ok: true });
}
