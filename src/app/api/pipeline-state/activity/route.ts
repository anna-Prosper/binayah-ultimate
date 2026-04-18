import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";

export const dynamic = "force-dynamic";
const WORKSPACE = { workspaceId: "main" };

async function ensureDoc() {
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $setOnInsert: { state: {}, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function POST(req: NextRequest) {
  await connectMongo();
  const entry = (await req.json()) as Record<string, unknown>;
  await ensureDoc();
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    {
      $push: { "state.activityLog": { $each: [entry], $position: 0, $slice: 100 } },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );
  return NextResponse.json({ ok: true });
}
