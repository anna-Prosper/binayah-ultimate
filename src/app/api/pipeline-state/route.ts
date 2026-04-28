import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validatePatchKeys, validateSubtasks, validateNestedKeys } from "@/lib/validate";
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

async function ensureDoc() {
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $setOnInsert: { state: {}, updatedAt: new Date() } },
    { upsert: true }
  );
}

/** Compute consecutive-day streaks for each user in the activity log. */
function computeStreakByUser(activityLog: { type: string; user: string; time: number }[]): Record<string, number> {
  const QUALIFYING = new Set(["claim", "comment", "status_change"]);

  // Build: userId → Set<"YYYY-MM-DD">
  const userDays = new Map<string, Set<string>>();
  for (const entry of activityLog) {
    if (!QUALIFYING.has(entry.type)) continue;
    const day = new Date(entry.time).toISOString().slice(0, 10);
    if (!userDays.has(entry.user)) userDays.set(entry.user, new Set());
    userDays.get(entry.user)!.add(day);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const result: Record<string, number> = {};

  for (const [userId, days] of userDays.entries()) {
    // Walk backward from today
    let streak = 0;
    const cursor = new Date(todayStr + "T00:00:00Z");
    while (true) {
      const dayKey = cursor.toISOString().slice(0, 10);
      if (days.has(dayKey)) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
    result[userId] = streak;
  }

  return result;
}

// Hard-coded admin seed list — these users are guaranteed captain of the default workspace.
// Mirror of ADMIN_IDS in src/lib/data.ts; replicated here so the server doesn't import client lib.
const SEED_ADMIN_IDS = ["anna"];
const SEED_DEFAULT_WORKSPACE_ID = "war-room";
// Mirror of USERS_DEFAULT[*].id from src/lib/data.ts — used only for default-workspace bootstrap.
const SEED_DEFAULT_USER_IDS = ["usama", "anna", "aakarshit", "ahsan", "abdallah", "prajeesh"];

export async function GET(req: NextRequest) {
  logApi(ROUTE, "GET");
  const since = req.nextUrl.searchParams.get("since");
  await connectMongo();
  await ensureDoc();
  const doc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string,unknown>; updatedAt?: Date } | null;
  let state = doc?.state || {};

  // Self-heal: ensure (a) the default workspace exists and (b) ADMIN_IDS users are in
  // its captains array. Without (a) the destructive-keys gate creates a chicken-and-egg
  // bootstrap deadlock — Anna can't write the seed workspace because the gate requires
  // her to already be an officer somewhere, which requires the seed workspace to exist.
  const wsArr = Array.isArray((state as Record<string, unknown>).workspaces)
    ? ((state as Record<string, unknown>).workspaces as Array<{ id: string; name?: string; icon?: string; colorKey?: string; captains: string[]; firstMates: string[]; members: string[]; pipelineIds?: string[] }>)
    : [];
  const defaultWs = wsArr.find(w => w.id === SEED_DEFAULT_WORKSPACE_ID);
  let healedWorkspaces: typeof wsArr | null = null;

  // Build the canonical pipeline-id list once: static pipelineData + any custom pipelines
  // already stored. Used to seed AND to fix existing war-room with empty pipelineIds.
  const customPipelines = Array.isArray((state as Record<string, unknown>).customPipelines)
    ? ((state as Record<string, unknown>).customPipelines as Array<{ id: string }>)
    : [];
  const allKnownPipelineIds = Array.from(new Set([
    ...pipelineData.map(p => p.id),
    ...customPipelines.map(p => p.id),
  ]));

  if (!defaultWs) {
    // (a) Bootstrap: create war-room with all default users as members, ADMIN_IDS as captains,
    // and all known pipelines wired up. Without pipelineIds the workspace is functionally empty
    // (0 pipelines / 0 stages on home), even though it exists.
    const seeded = {
      id: SEED_DEFAULT_WORKSPACE_ID,
      name: "Binayah AI",
      icon: "🤖",
      colorKey: "purple",
      captains: [...SEED_ADMIN_IDS],
      firstMates: [],
      members: [...SEED_DEFAULT_USER_IDS],
      pipelineIds: allKnownPipelineIds,
    };
    healedWorkspaces = [...wsArr, seeded];
    logApi(ROUTE, "self_heal_seed_workspace", { id: SEED_DEFAULT_WORKSPACE_ID, pipelines: allKnownPipelineIds.length });
  } else {
    // (b) Existing default workspace — ensure ADMIN_IDS are in captains and pipelineIds is populated.
    const missingCaptains = SEED_ADMIN_IDS.filter(uid => !defaultWs.captains?.includes(uid));
    const existingPids = defaultWs.pipelineIds || [];
    const missingPids = allKnownPipelineIds.filter(pid => !existingPids.includes(pid));
    const needsHeal = missingCaptains.length > 0 || (existingPids.length === 0 && allKnownPipelineIds.length > 0);
    if (needsHeal) {
      healedWorkspaces = wsArr.map(w =>
        w.id === SEED_DEFAULT_WORKSPACE_ID
          ? {
              ...w,
              captains: [...(w.captains || []), ...missingCaptains],
              members: Array.from(new Set([...(w.members || []), ...missingCaptains])),
              // Only repopulate pipelineIds when it's empty — don't override an intentionally-curated list.
              pipelineIds: existingPids.length === 0 ? allKnownPipelineIds : [...existingPids, ...missingPids.filter(() => false)],
            }
          : w
      );
      logApi(ROUTE, "self_heal_workspace", { addedCaptains: missingCaptains, repopulatedPipelines: existingPids.length === 0 });
    }
  }

  if (healedWorkspaces) {
    await PipelineState.findOneAndUpdate(
      WORKSPACE,
      { $set: { "state.workspaces": healedWorkspaces, updatedAt: new Date() } }
    );
    state = { ...state, workspaces: healedWorkspaces };
  }

  // If client is up-to-date, return 304
  if (since && doc?.updatedAt) {
    const sinceMs = parseInt(since, 10);
    const updatedMs = new Date(doc.updatedAt).getTime();
    if (!isNaN(sinceMs) && updatedMs <= sinceMs) {
      return new NextResponse(null, { status: 304 });
    }
  }
  // Compute server-derived streaks (not stored — always fresh)
  const activityLog = Array.isArray(state.activityLog)
    ? (state.activityLog as { type: string; user: string; time: number }[])
    : [];
  const streakByUser = computeStreakByUser(activityLog);
  return NextResponse.json({ ...state, streakByUser });
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

  // Remove internal _pipelineId hint before whitelist check (not a persisted key — lock system removed in v3)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _pipelineId, ...cleanPatch } = patch;

  // Whitelist check — reject unknown keys and keys containing . $ __proto__ etc.
  const keyErr = validatePatchKeys(cleanPatch);
  if (keyErr) {
    logApi(ROUTE, "key_injection_blocked", { reason: keyErr });
    return NextResponse.json({ error: keyErr }, { status: 400 });
  }

  // Recursive nested-key validation — runs before DB connection to avoid wasted round-trip
  if (!validateNestedKeys(cleanPatch)) {
    logApi(ROUTE, "key_injection_blocked", { reason: "nested key contains forbidden characters" });
    return NextResponse.json({ error: "INVALID_KEY" }, { status: 400 });
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

  // Get session user for activity attribution (best-effort; not required for state write)
  const session = await getServerSession(authOptions);
  const actorUserId = session?.user?.fixedUserId ?? "unknown";

  // ── Role-based permission gate for destructive structural operations ────────
  // Keys that require captain or firstMate role in at least one workspace.
  // IMPORTANT: only fires when the value actually CHANGES vs current state. The client
  // sends the entire state slice on each scheduleWrite (even unchanged ones), so a naive
  // "patch contains key" check rejects every routine save from a crew member, which
  // bricks subtask/archive/etc. writes via collateral damage.
  const DESTRUCTIVE_KEYS = new Set([
    "archivedStages", "archivedPipelines", "archivedSubtasks",
    "customPipelines", // pipeline deletions
    "workspaces",      // member changes
  ]);
  const candidateDestructiveKeys = Object.keys(cleanPatch).filter(k => DESTRUCTIVE_KEYS.has(k));
  if (candidateDestructiveKeys.length > 0) {
    // Compare each candidate key against current state; only count it as "destructive"
    // if the value differs.
    const stateDoc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
    const currentState = stateDoc?.state ?? {};
    const actuallyChanged = candidateDestructiveKeys.filter(k => {
      const incoming = JSON.stringify((cleanPatch as Record<string, unknown>)[k] ?? null);
      const existing = JSON.stringify((currentState as Record<string, unknown>)[k] ?? null);
      return incoming !== existing;
    });

    if (actuallyChanged.length > 0) {
      if (!session?.user?.fixedUserId) {
        logApi(ROUTE, "forbidden_unauthenticated", { changed: actuallyChanged });
        return NextResponse.json(
          { error: "FORBIDDEN", reason: "authentication required for destructive operations" },
          { status: 401 }
        );
      }
      const workspacesData = (currentState.workspaces as Array<{
        id: string; captains: string[]; firstMates: string[]; members: string[];
      }> | undefined) ?? [];
      const isOfficer = workspacesData.some(
        ws => ws.captains?.includes(actorUserId) || ws.firstMates?.includes(actorUserId)
      );
      if (!isOfficer) {
        logApi(ROUTE, "forbidden_insufficient_role", { userId: actorUserId, changed: actuallyChanged });
        return NextResponse.json(
          { error: "FORBIDDEN", reason: "captain or first-mate role required" },
          { status: 403 }
        );
      }
    }
  }

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
