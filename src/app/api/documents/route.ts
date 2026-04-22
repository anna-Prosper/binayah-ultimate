import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import BinayahDocument from "@/lib/BinayahDocument";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength } from "@/lib/validate";

export const dynamic = "force-dynamic";

const ROUTE = "/api/documents";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");

  await connectMongo();

  const query = pipelineId ? { pipelineId } : {};
  const docs = await BinayahDocument.find(query)
    .sort({ updatedAt: -1 })
    .select("-content") // exclude content from list for payload efficiency
    .lean();

  return NextResponse.json({ docs });
}

export async function POST(req: NextRequest) {
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

  const body = (await req.json()) as Record<string, unknown>;

  // Validate title
  const rawTitle = body.title;
  if (rawTitle !== undefined) {
    if (typeof rawTitle !== "string") return NextResponse.json({ error: "title must be a string" }, { status: 400 });
    if (rawTitle.length > 200) return NextResponse.json({ error: "title exceeds 200 chars" }, { status: 400 });
  }

  const createdBy = session.user?.fixedUserId ?? (session.user as { fixedUserId?: string })?.fixedUserId ?? "unknown";

  await connectMongo();

  const doc = await BinayahDocument.create({
    title: typeof body.title === "string" ? body.title : "untitled",
    content: body.content ?? null,
    createdBy,
    pipelineId: typeof body.pipelineId === "string" ? body.pipelineId : null,
  });

  return NextResponse.json({ doc }, { status: 201 });
}
