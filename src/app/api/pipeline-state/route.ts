import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validatePatchKeys, validateSubtasks } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { pipelineData, stageDefaults } from "@/lib/data";
import { sendNotifications } from "@/lib/sendNotifications";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { chatBus } from "@/lib/chatBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const WORKSPACE = { workspaceId: "main" };
const ROUTE = "/api/pipeline-state";

// Keys that are NOT blocked by a pipeline lock (only the lock list itself can be changed)
const LOCK_EXEMPT_KEYS = new Set(["lockedPipelines", "users", "customPipelines", "updatedAt"]);

// Keys that can be targeted at pipeline-specific stages/state
const PIPELINE_SCOPED_KEYS = new Set(["stageStatusOverrides", "claims", "reactions", "subtasks", "stageDescOverrides", "customStages", "pipeDescOverrides", "pipeMetaOverrides"]);

async function ensureDoc() {
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $setOnInsert: { state: {}, updatedAt: new Date() } },
    { upsert: true }
  );
}

/** Given a patch and the current locked pipeline IDs, check if the patch mutates a locked pipeline.
 *  Strategy: if _pipelineId is provided in the patch and it IS locked, return it immediately.
 *  If _pipelineId is present but NOT locked, fall through to the stage-key scan (don't trust
 *  the client hint as an exemption — always verify against the full stage map).
 *  stageToP must include both static stages and any custom stages from the DB.
 */
function findLockedConflict(
  patch: Record<string, unknown>,
  lockedPipelines: string[],
  stageToP: Map<string, string>
): string | null {
  if (!lockedPipelines.length) return null;

  // Fast path: explicit pipeline ID is locked — no need to scan stages
  if (patch._pipelineId && typeof patch._pipelineId === "string") {
    if (lockedPipelines.includes(patch._pipelineId)) {
      return patch._pipelineId;
    }
    // _pipelineId is present but not locked — fall through to stage-key scan
    // (the hint does NOT exempt the patch from further checks)
  }

  for (const [key, value] of Object.entries(patch)) {
    if (LOCK_EXEMPT_KEYS.has(key)) continue;
    if (!PIPELINE_SCOPED_KEYS.has(key)) continue;
    if (typeof value !== "object" || value === null) continue;

    // Check each stage key in the value map
    for (const stageKey of Object.keys(value as Record<string, unknown>)) {
      // Handle pipeline reaction key (_pipe_<id>)
      if (stageKey.startsWith("_pipe_")) {
        const pid = stageKey.slice(6);
        if (lockedPipelines.includes(pid)) return pid;
        continue;
      }
      const pid = stageToP.get(stageKey);
      if (pid && lockedPipelines.includes(pid)) return pid;
    }

    // For pipeDescOverrides / pipeMetaOverrides — keys are pipeline IDs
    if (key === "pipeDescOverrides" || key === "pipeMetaOverrides" || key === "customStages") {
      for (const pid of Object.keys(value as Record<string, unknown>)) {
        if (lockedPipelines.includes(pid)) return pid;
      }
    }
  }
  return null;
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

  // Remove internal _pipelineId hint before whitelist check (not a persisted key)
  const { _pipelineId, ...cleanPatch } = patch;

  // Whitelist check — reject unknown keys and keys containing . $ __proto__ etc.
  const keyErr = validatePatchKeys(cleanPatch);
  if (keyErr) {
    logApi(ROUTE, "key_injection_blocked", { reason: keyErr });
    return NextResponse.json({ error: keyErr }, { status: 400 });
  }

  // Subtask bounds validation
  if ("subtasks" in cleanPatch) {
    const subtaskErr = validateSubtasks(cleanPatch.subtasks);
    if (subtaskErr) {
      logApi(ROUTE, "validation_fail", { reason: subtaskErr });
      return NextResponse.json({ error: subtaskErr }, { status: 400 });
    }
  }

  await connectMongo();
  await ensureDoc();

  // Pipeline lock enforcement — fetch current lockedPipelines from DB
  // Only check if the patch touches pipeline-scoped fields
  const hasPipelineScopedKeys = Object.keys(cleanPatch).some(k => PIPELINE_SCOPED_KEYS.has(k));
  if (hasPipelineScopedKeys) {
    const currentDoc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
    const lockedPipelines = (currentDoc?.state?.lockedPipelines as string[] | undefined) || [];

    // Build stage->pipeline map from static data
    const stageToP = new Map<string, string>();
    for (const p of pipelineData) {
      for (const s of p.stages) stageToP.set(s, p.id);
    }
    // Extend with custom stages persisted in the DB (so locked custom stages are also protected)
    const dbCustomStages = (currentDoc?.state?.customStages as Record<string, string[]> | undefined) ?? {};
    for (const [pid, stages] of Object.entries(dbCustomStages)) {
      for (const stageName of stages) stageToP.set(stageName, pid);
    }

    const patchForLockCheck = _pipelineId ? { ...cleanPatch, _pipelineId } : cleanPatch;
    const conflictPipelineId = findLockedConflict(patchForLockCheck as Record<string, unknown>, lockedPipelines, stageToP);
    if (conflictPipelineId) {
      logApi(ROUTE, "pipeline_locked", { pipelineId: conflictPipelineId });
      return NextResponse.json(
        { error: "PIPELINE_LOCKED", message: "Pipeline is locked", pipelineId: conflictPipelineId },
        { status: 423 }
      );
    }
  }

  // Get session user for activity attribution (best-effort; not required for state write)
  const session = await getServerSession(authOptions);
  const actorUserId = session?.user?.fixedUserId ?? "unknown";

  // Capture pre-patch state for notification diffing (claims + statuses only)
  let prePatchClaims: Record<string, string[]> = {};
  let prePatchStatuses: Record<string, string> = {};
  const needsNotify = "claims" in cleanPatch || "stageStatusOverrides" in cleanPatch;
  if (needsNotify) {
    const preDoc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
    prePatchClaims = (preDoc?.state?.claims as Record<string, string[]> | undefined) ?? {};
    prePatchStatuses = (preDoc?.state?.stageStatusOverrides as Record<string, string> | undefined) ?? {};
  }

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(cleanPatch)) {
    $set[`state.${k}`] = v;
  }
  const doc = await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $set },
    { new: true }
  ).lean();
  logApi(ROUTE, "PATCH_success");

  // Emit status_change activity entries for any stageStatusOverrides changes
  if ("stageStatusOverrides" in cleanPatch) {
    const patchedStatuses = cleanPatch.stageStatusOverrides as Record<string, string>;

    // Build stage→pipeline map for this emit (may differ from lock-check map above)
    const stageToP2 = new Map<string, string>();
    for (const p of pipelineData) {
      for (const s of p.stages) stageToP2.set(s, p.id);
    }
    const postStateDoc = (doc as { state?: Record<string, unknown> } | null)?.state ?? {};
    const dbCustomStages2 = (postStateDoc.customStages as Record<string, string[]> | undefined) ?? {};
    for (const [pid, stages] of Object.entries(dbCustomStages2)) {
      for (const stageName of stages) stageToP2.set(stageName, pid);
    }

    const statusChangeEntries: Record<string, unknown>[] = [];
    for (const [stageName, newStatus] of Object.entries(patchedStatuses)) {
      const fromStatus = prePatchStatuses[stageName] ?? "concept";
      if (fromStatus === newStatus) continue; // no actual change
      const pipelineId = stageToP2.get(stageName) ?? "";
      const entry = {
        type: "status_change",
        user: actorUserId,
        target: stageName,
        detail: `${fromStatus} → ${newStatus}`,
        pipeline: pipelineId,
        time: Date.now(),
      };
      statusChangeEntries.push(entry);
    }

    if (statusChangeEntries.length > 0) {
      // Bulk prepend all status_change entries, keep newest-first, cap at 200
      await PipelineState.findOneAndUpdate(
        WORKSPACE,
        {
          $push: {
            "state.activityLog": {
              $each: statusChangeEntries,
              $position: 0,
              $slice: 200,
            },
          },
        }
      );
      // Fan out to SSE subscribers (bell filter excludes status_change — correct by design)
      for (const entry of statusChangeEntries) {
        chatBus.emit("activity", entry);
      }
    }
  }

  // Fire notifications fire-and-forget — never await, never block the response
  if (needsNotify) {
    const postState = (doc as { state?: Record<string, unknown> } | null)?.state ?? {};
    const postClaims = (postState.claims as Record<string, string[]> | undefined) ?? {};
    const postStatuses = (postState.stageStatusOverrides as Record<string, string> | undefined) ?? {};

    // Build stage→pipeline map
    const stageToP = new Map<string, string>();
    for (const p of pipelineData) {
      for (const s of p.stages) stageToP.set(s, p.id);
    }
    const dbCustomStages = (postState.customStages as Record<string, string[]> | undefined) ?? {};
    for (const [pid, stages] of Object.entries(dbCustomStages)) {
      for (const stageName of stages) stageToP.set(stageName, pid);
    }

    // Detect newly-added claimers (claim event)
    if ("claims" in cleanPatch) {
      const patchedClaims = cleanPatch.claims as Record<string, string[]>;
      for (const [stageKey, newClaimers] of Object.entries(patchedClaims)) {
        const prevClaimers = prePatchClaims[stageKey] ?? [];
        const addedClaimers = newClaimers.filter(id => !prevClaimers.includes(id));
        if (addedClaimers.length === 0) continue;

        const pipelineId = stageToP.get(stageKey);
        const pipeline = pipelineData.find(p => p.id === pipelineId);
        const pipelineName = pipeline?.name ?? pipelineId ?? stageKey;

        void sendNotifications({
          eventType: "claimed",
          stageKey,
          pipelineName,
          recipientIds: addedClaimers,
          actorName: addedClaimers[0], // best-effort; actor name resolved in helper
          points: stageDefaults[stageKey]?.points ?? 10,
        });
      }
    }

    // Detect stages newly transitioned to "active" (active event)
    if ("stageStatusOverrides" in cleanPatch) {
      const patchedStatuses = cleanPatch.stageStatusOverrides as Record<string, string>;
      for (const [stageKey, newStatus] of Object.entries(patchedStatuses)) {
        if (newStatus !== "active") continue;
        if (prePatchStatuses[stageKey] === "active") continue; // was already active

        const claimers = postClaims[stageKey] ?? [];
        if (claimers.length === 0) continue;

        const pipelineId = stageToP.get(stageKey);
        const pipeline = pipelineData.find(p => p.id === pipelineId);
        const pipelineName = pipeline?.name ?? pipelineId ?? stageKey;

        void sendNotifications({
          eventType: "active",
          stageKey,
          pipelineName,
          recipientIds: claimers,
          actorName: "",
          points: stageDefaults[stageKey]?.points ?? 10,
        });
      }
    }
  }

  return NextResponse.json((doc as { state?: unknown } | null)?.state || {});
}
