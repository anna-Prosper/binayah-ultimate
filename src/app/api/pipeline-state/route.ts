import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validatePatchKeys, validateSubtasks } from "@/lib/validate";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
const WORKSPACE = { workspaceId: "main" };
const ROUTE = "/api/pipeline-state";

async function ensureDoc() {
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $setOnInsert: { state: {}, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function GET() {
  logApi(ROUTE, "GET");
  await connectMongo();
  await ensureDoc();
  const doc = await PipelineState.findOne(WORKSPACE).lean();
  return NextResponse.json((doc as { state?: unknown } | null)?.state || {});
}

export async function PATCH(req: NextRequest) {
  logApi(ROUTE, "PATCH");

  // Rate limit: 60 req/min per IP
  const rl = rateLimit(req, `${ROUTE}:PATCH`, 60, 60_000);
  if (!rl.ok) {
    logApi(ROUTE, "rate_limited", { retryAfter: rl.retryAfter });
    return NextResponse.json(
      { error: "Too many requests — slow down" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Payload size check
  const sizeErr = checkContentLength(req);
  if (sizeErr) {
    logApi(ROUTE, "payload_too_large");
    return NextResponse.json({ error: sizeErr }, { status: 400 });
  }

  const patch = (await req.json()) as Record<string, unknown>;

  // Whitelist check — reject unknown keys and keys containing . $ __proto__ etc.
  const keyErr = validatePatchKeys(patch);
  if (keyErr) {
    logApi(ROUTE, "key_injection_blocked", { reason: keyErr });
    return NextResponse.json({ error: keyErr }, { status: 400 });
  }

  // Subtask bounds validation
  if ("subtasks" in patch) {
    const subtaskErr = validateSubtasks(patch.subtasks);
    if (subtaskErr) {
      logApi(ROUTE, "validation_fail", { reason: subtaskErr });
      return NextResponse.json({ error: subtaskErr }, { status: 400 });
    }
  }

  await connectMongo();
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
  logApi(ROUTE, "PATCH_success");
  return NextResponse.json((doc as { state?: unknown } | null)?.state || {});
}
