import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import ZoomCallCache from "@/lib/ZoomCallCache";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";

const ROUTE = "/api/zoom/proposals/dismiss";

// POST body: { ids: number[], keys?: string[] }
// Marks the given Zoom-proposal IDs as dismissed so /api/zoom/meetings filters
// them out of future reads. Used when a user approves a proposal into a task or
// rejects it — either way it should never reappear in the pending queue.
// Workspace-wide (not per-user): dismissal is a team decision; if Anna approves
// a proposal, Ahsan shouldn't see it sitting in his pending list either.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { ids?: unknown; keys?: unknown } | null;
  const raw = body?.ids;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "ids must be a number array" }, { status: 400 });
  }
  const ids = raw.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const keys = Array.isArray(body?.keys)
    ? body.keys.filter((k): k is string => typeof k === "string" && k.trim().length > 0).map(k => k.trim()).slice(0, 50)
    : [];
  if (ids.length === 0 && keys.length === 0) return NextResponse.json({ ok: true, dismissed: 0 });

  await connectMongo();
  const res = await ZoomCallCache.findOneAndUpdate(
    { key: "main" },
    { $addToSet: { dismissedProposalIds: { $each: ids }, dismissedProposalKeys: { $each: keys } } },
    { upsert: true, new: true }
  );

  logApi(ROUTE, "dismissed", { count: ids.length, keys: keys.length });
  return NextResponse.json({ ok: true, dismissed: ids.length + keys.length, total: res?.dismissedProposalIds?.length ?? 0 });
}
