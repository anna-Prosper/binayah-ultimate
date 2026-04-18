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
  const { stage, comment } = (await req.json()) as { stage: string; comment: Record<string, unknown> };
  if (!stage || !comment) {
    return NextResponse.json({ error: "stage and comment required" }, { status: 400 });
  }
  await ensureDoc();
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    {
      $push: { [`state.comments.${stage}`]: comment },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );
  return NextResponse.json({ ok: true });
}
