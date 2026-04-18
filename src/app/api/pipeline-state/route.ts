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

export async function GET() {
  await connectMongo();
  await ensureDoc();
  const doc = await PipelineState.findOne(WORKSPACE).lean();
  return NextResponse.json((doc as { state?: unknown } | null)?.state || {});
}

export async function PATCH(req: NextRequest) {
  await connectMongo();
  const patch = (await req.json()) as Record<string, unknown>;
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    $set[`state.${k}`] = v;
  }
  await ensureDoc();
  const doc = await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $set },
    { new: true }
  ).lean();
  return NextResponse.json((doc as { state?: unknown } | null)?.state || {});
}
