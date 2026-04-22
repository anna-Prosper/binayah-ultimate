import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import BinayahDocument from "@/lib/BinayahDocument";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength } from "@/lib/validate";

export const dynamic = "force-dynamic";

const ROUTE = "/api/documents/[id]";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectMongo();
  const doc = await BinayahDocument.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ doc });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(req, ROUTE, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests — slow down" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const sizeErr = checkContentLength(req);
  if (sizeErr) return NextResponse.json({ error: sizeErr }, { status: 400 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  // Whitelist: only title, content, pipelineId — updatedBy is always set server-side below
  const update: Record<string, unknown> = {};

  if ("title" in body) {
    const t = body.title;
    if (typeof t !== "string") return NextResponse.json({ error: "title must be a string" }, { status: 400 });
    if (t.length > 200) return NextResponse.json({ error: "title exceeds 200 chars" }, { status: 400 });
    update.title = t;
  }

  if ("content" in body) {
    if (typeof body.content !== "object" || body.content === null || Array.isArray(body.content)) {
      return NextResponse.json({ error: "content must be a TipTap JSON object" }, { status: 400 });
    }
    update.content = body.content;
  }

  if ("pipelineId" in body) {
    const pid = body.pipelineId;
    if (pid !== null && typeof pid !== "string") {
      return NextResponse.json({ error: "pipelineId must be a string or null" }, { status: 400 });
    }
    update.pipelineId = pid;
  }

  // Always set updatedBy server-side from session — never accept from client body
  update.updatedBy = session.user.fixedUserId;

  await connectMongo();
  const doc = await BinayahDocument.findByIdAndUpdate(
    id,
    { $set: { ...update, updatedAt: new Date() } },
    { new: true }
  ).lean();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ doc });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(req, ROUTE, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests — slow down" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { id } = await params;

  await connectMongo();
  const doc = await BinayahDocument.findByIdAndDelete(id).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
