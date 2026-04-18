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
  const msg = (await req.json()) as Record<string, unknown>;
  await ensureDoc();
  const doc = await PipelineState.findOneAndUpdate(
    WORKSPACE,
    {
      $push: { "state.chatMessages": msg },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  ).lean();
  const total = ((doc as { state?: { chatMessages?: unknown[] } } | null)?.state?.chatMessages || []).length;
  return NextResponse.json({ ok: true, total });
}
