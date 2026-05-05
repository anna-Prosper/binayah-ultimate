import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TARGETS = ["abdallah", "aakarshit", "usama"];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_PATH_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const doc = await PipelineState.findOne({ workspaceId: "main" }).lean() as { state?: { users?: { id: string; aiAvatar?: string; avatar?: string }[] } } | null;
  const users = doc?.state?.users || [];

  const updatedUsers = users.map(u =>
    TARGETS.includes(u.id) ? { ...u, aiAvatar: "", avatar: "" } : u
  );

  await PipelineState.findOneAndUpdate(
    { workspaceId: "main" },
    { $set: { "state.users": updatedUsers, updatedAt: new Date() } }
  );

  return NextResponse.json({ ok: true, cleared: TARGETS });
}
