import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import BinayahDocument from "@/lib/BinayahDocument";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength } from "@/lib/validate";

export const dynamic = "force-dynamic";

const ROUTE = "/api/documents";

// ── TipTap JSON → plaintext extractor ─────────────────────────────────────────
// Recursively walks TipTap's doc JSON and collects all text node values.
function tiptapToPlaintext(node: Record<string, unknown> | null | undefined): string {
  if (!node || typeof node !== "object") return "";
  const parts: string[] = [];
  if (node.type === "text" && typeof node.text === "string") {
    parts.push(node.text);
  }
  const content = node.content;
  if (Array.isArray(content)) {
    for (const child of content) {
      parts.push(tiptapToPlaintext(child as Record<string, unknown>));
    }
  }
  return parts.join(" ");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipelineId = req.nextUrl.searchParams.get("pipelineId");
  const includeContent = req.nextUrl.searchParams.get("includeContent") === "true";

  await connectMongo();

  const query = pipelineId ? { pipelineId } : {};

  if (includeContent) {
    // Include the content field so we can extract plaintext server-side
    const docs = await BinayahDocument.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    const docsWithPlaintext = docs.map(d => ({
      _id: (d._id as { toString(): string }).toString(),
      title: d.title ?? "",
      pipelineId: d.pipelineId ?? null,
      plaintext: tiptapToPlaintext(d.content as Record<string, unknown> | null),
    }));

    return NextResponse.json({ docs: docsWithPlaintext });
  }

  // Default: exclude content from list for payload efficiency
  const docs = await BinayahDocument.find(query)
    .sort({ updatedAt: -1 })
    .select("-content")
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
