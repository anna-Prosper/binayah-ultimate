import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validatePatchKeys, validateSubtasks, validateNestedKeys, findForbiddenNestedKey } from "@/lib/validate";
import { mergeStateWithPatch, type DeletesEnvelope } from "@/lib/pipelineStateMerge";
import { PatchBodySchema } from "@/lib/patchSchema";
import { logApi } from "@/lib/log";
import { pipelineData, stageDefaults } from "@/lib/data";
import { sendNotifications } from "@/lib/sendNotifications";
import { getServerSession } from "next-auth/next";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";
import { chatBus } from "@/lib/chatBus";
import { SubtaskKey } from "@/lib/subtaskKey";

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
const SEED_DEFAULT_USER_IDS = ["usama", "anna", "aakarshit", "ahsan", "abdallah", "prajeesh", "abhishek"];

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
    const missingMembers = SEED_DEFAULT_USER_IDS.filter(uid => !defaultWs.members?.includes(uid));
    const existingPids = defaultWs.pipelineIds || [];
    const missingPids = allKnownPipelineIds.filter(pid => !existingPids.includes(pid));
    const needsHeal = missingCaptains.length > 0 || missingMembers.length > 0 || (existingPids.length === 0 && allKnownPipelineIds.length > 0);
    if (needsHeal) {
      healedWorkspaces = wsArr.map(w =>
        w.id === SEED_DEFAULT_WORKSPACE_ID
          ? {
              ...w,
              captains: [...(w.captains || []), ...missingCaptains],
              members: Array.from(new Set([...(w.members || []), ...missingCaptains, ...missingMembers])),
              // Only repopulate pipelineIds when it's empty — don't override an intentionally-curated list.
              pipelineIds: existingPids.length === 0 ? allKnownPipelineIds : [...existingPids, ...missingPids.filter(() => false)],
            }
          : w
      );
      logApi(ROUTE, "self_heal_workspace", { addedCaptains: missingCaptains, addedMembers: missingMembers, repopulatedPipelines: existingPids.length === 0 });
    }
  }

  // Self-heal (c): re-home orphaned default-parent subtask stages. A subtask's
  // parentStageId of the form "default-parent-<pipelineId>-N" only renders if that
  // key is registered in customStages[pipelineId] (TasksView silently drops any
  // subtask whose parent stage isn't found in a pipeline). Stage renumbering or a
  // lost customStages write can leave a real task pointing at an unregistered slot,
  // making it vanish from the board. Re-register the slot so the task always shows.
  const subtasksMap = (state.subtasks && typeof state.subtasks === "object" && !Array.isArray(state.subtasks))
    ? (state.subtasks as Record<string, unknown[]>)
    : {};
  const customStagesMap = (state.customStages && typeof state.customStages === "object" && !Array.isArray(state.customStages))
    ? (state.customStages as Record<string, string[]>)
    : {};
  const customPipes = Array.isArray(state.customPipelines)
    ? (state.customPipelines as Array<{ id: string }>)
    : [];
  // Longest id first so e.g. "notion-landing-pages" wins over a shorter "notion".
  const knownPipeIds = [...pipelineData.map(p => p.id), ...customPipes.map(p => p.id)]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b.length - a.length);

  const stageAddToSet: Record<string, { $each: string[] }> = {};
  const stageOverrideSet: Record<string, unknown> = {};
  const nameOv = (state.stageNameOverrides && typeof state.stageNameOverrides === "object")
    ? (state.stageNameOverrides as Record<string, string>) : {};
  const statusOv = (state.stageStatusOverrides && typeof state.stageStatusOverrides === "object")
    ? (state.stageStatusOverrides as Record<string, string>) : {};
  const healedStages: string[] = [];

  for (const parentStageId of Object.keys(subtasksMap)) {
    const list = subtasksMap[parentStageId];
    if (!Array.isArray(list) || list.length === 0) continue;
    if (!parentStageId.startsWith("default-parent-")) continue;
    const pid = knownPipeIds.find(id =>
      parentStageId === `default-parent-${id}` || parentStageId.startsWith(`default-parent-${id}-`));
    if (!pid) continue;
    if ((customStagesMap[pid] || []).includes(parentStageId)) continue; // already registered
    const path = `state.customStages.${pid}`;
    (stageAddToSet[path] ??= { $each: [] }).$each.push(parentStageId);
    // Match how the "add task" flow configures a fresh default-parent stage.
    if (!nameOv[parentStageId]) stageOverrideSet[`state.stageNameOverrides.${parentStageId}`] = "All";
    if (!statusOv[parentStageId]) stageOverrideSet[`state.stageStatusOverrides.${parentStageId}`] = "planned";
    healedStages.push(parentStageId);
  }
  const stagesHealed = healedStages.length > 0;
  if (stagesHealed) logApi(ROUTE, "self_heal_orphan_stages", { stages: healedStages.slice(0, 20), count: healedStages.length });

  if (healedWorkspaces || stagesHealed) {
    const setObj: Record<string, unknown> = { updatedAt: new Date(), ...stageOverrideSet };
    if (healedWorkspaces) setObj["state.workspaces"] = healedWorkspaces;
    const update: Record<string, unknown> = { $set: setObj };
    if (stagesHealed) update.$addToSet = stageAddToSet;
    await PipelineState.findOneAndUpdate(WORKSPACE, update);
    if (healedWorkspaces) state = { ...state, workspaces: healedWorkspaces };
    if (stagesHealed) {
      const nextCustomStages: Record<string, string[]> = { ...customStagesMap };
      for (const s of healedStages) {
        const pid = knownPipeIds.find(id => s === `default-parent-${id}` || s.startsWith(`default-parent-${id}-`))!;
        nextCustomStages[pid] = [...(nextCustomStages[pid] || []), s];
      }
      state = {
        ...state,
        customStages: nextCustomStages,
        stageNameOverrides: { ...nameOv, ...Object.fromEntries(healedStages.filter(s => !nameOv[s]).map(s => [s, "All"])) },
        stageStatusOverrides: { ...statusOv, ...Object.fromEntries(healedStages.filter(s => !statusOv[s]).map(s => [s, "planned"])) },
      };
    }
  }

  // Deploy SHA of the function serving this request — clients compare it to the
  // SHA baked into their bundle and auto-reload when it changes (so a stale tab
  // running old code can't linger and clobber). Sent as a header so it's present
  // on 304s too (an idle client still needs to learn about a new deploy).
  const buildSha = process.env.VERCEL_GIT_COMMIT_SHA || "";

  // If client is up-to-date, return 304
  if (since && doc?.updatedAt) {
    const sinceMs = parseInt(since, 10);
    const updatedMs = new Date(doc.updatedAt).getTime();
    if (!isNaN(sinceMs) && updatedMs <= sinceMs) {
      return new NextResponse(null, { status: 304, headers: { "x-build-sha": buildSha } });
    }
  }
  // Compute server-derived streaks (not stored — always fresh)
  const activityLog = Array.isArray(state.activityLog)
    ? (state.activityLog as { type: string; user: string; time: number }[])
    : [];
  const streakByUser = computeStreakByUser(activityLog);
  return NextResponse.json({ ...state, streakByUser }, { headers: { "x-build-sha": buildSha } });
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

  // Status is high-contention and user-visible: stale tabs often send a broad
  // autosave envelope with an old `stageStatusOverrides`/`subtaskStages` map.
  // If we accept those inside bulk saves, a teammate's old tab can move a card
  // back to planned after another user already moved it. Only focused status
  // writes may mutate status; broad autosaves persist every other slice.
  const patchKeysWithoutMeta = Object.keys(cleanPatch).filter(k => k !== "updatedAt");
  const isFocusedStageStatusPatch =
    patchKeysWithoutMeta.length === 1 && patchKeysWithoutMeta[0] === "stageStatusOverrides";
  const isFocusedSubtaskStatusPatch =
    patchKeysWithoutMeta.length === 1 && patchKeysWithoutMeta[0] === "subtaskStages";
  if ("stageStatusOverrides" in cleanPatch && !isFocusedStageStatusPatch) {
    delete (cleanPatch as Record<string, unknown>).stageStatusOverrides;
    logApi(ROUTE, "ignored_bulk_stage_status_overrides");
  }
  if ("subtaskStages" in cleanPatch && !isFocusedSubtaskStatusPatch) {
    delete (cleanPatch as Record<string, unknown>).subtaskStages;
    logApi(ROUTE, "ignored_bulk_subtask_statuses");
  }
  const deletesEnvelope = (cleanPatch as { _deletes?: DeletesEnvelope })._deletes;
  if (deletesEnvelope && typeof deletesEnvelope === "object" && !Array.isArray(deletesEnvelope)) {
    if ("stageStatusOverrides" in deletesEnvelope) {
      delete deletesEnvelope.stageStatusOverrides;
      logApi(ROUTE, "ignored_stage_status_deletes");
    }
    if ("subtaskStages" in deletesEnvelope) {
      delete deletesEnvelope.subtaskStages;
      logApi(ROUTE, "ignored_subtask_status_deletes");
    }
    if (Object.keys(deletesEnvelope).length === 0) {
      delete (cleanPatch as Record<string, unknown>)._deletes;
    }
  }

  // Zod structural validation — catches wrong types, enum violations, length
  // overflows, and unknown top-level keys before any DB work.
  const zodResult = PatchBodySchema.safeParse(cleanPatch);
  if (!zodResult.success) {
    const reason = zodResult.error.issues.map(e => `${e.path.map(String).join(".")}: ${e.message}`).join("; ");
    logApi(ROUTE, "zod_validation_failed", { reason });
    return NextResponse.json({ error: "INVALID_PATCH", reason }, { status: 400 });
  }

  // Whitelist + forbidden-character check (defence-in-depth — Zod .strict() already
  // rejects unknown keys, but keep the manual check for belt-and-suspenders safety
  // since Zod doesn't block $ / . inside map key names).
  const keyErr = validatePatchKeys(cleanPatch);
  if (keyErr) {
    logApi(ROUTE, "key_injection_blocked", { reason: keyErr });
    return NextResponse.json({ error: keyErr }, { status: 400 });
  }

  // Recursive nested-key validation — blocks $ / . in map keys at any depth.
  if (!validateNestedKeys(cleanPatch)) {
    const badPath = findForbiddenNestedKey(cleanPatch) || "(unknown)";
    logApi(ROUTE, "key_injection_blocked", { badPath });
    // Return the specific path so the client console.error shows which slice
    // and which entry is invalid — without this every PATCH after a single bad
    // key fails silently and "tasks disappear on reload".
    return NextResponse.json({ error: "INVALID_KEY", reason: `forbidden character in key: ${badPath}` }, { status: 400 });
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
  // Genuinely destructive = an EXPLICIT deletion (the `_deletes` envelope with
  // _deleteMode:"explicit") of a structural item — currently a custom pipeline.
  // State slices are grow-merged, so a shorter incoming slice NEVER deletes on
  // merge; real removals only ever arrive in `_deletes`. The previous gate
  // compared whole-slice VALUES, which flagged a routine save as "destructive"
  // whenever the client's copy merely differed in array order or simply hadn't
  // synced a server-side change yet (e.g. a pipeline someone archived) — and then
  // 401/403-bricked EVERY subsequent write when the session raced on role lookup.
  // (The same fragility already forced `workspaces` out of this gate.) Gating on
  // the explicit-delete envelope instead means normal saves are never blocked.
  const dEnv = (cleanPatch as { _deletes?: DeletesEnvelope })._deletes;
  const dExplicit = (cleanPatch as { _deleteMode?: string })._deleteMode === "explicit";
  const DESTRUCTIVE_DELETE_KEYS = new Set(["customPipelines"]);
  const candidateDestructiveKeys = (dExplicit && dEnv && typeof dEnv === "object" && !Array.isArray(dEnv))
    ? Object.keys(dEnv).filter(k =>
        DESTRUCTIVE_DELETE_KEYS.has(k) &&
        Array.isArray((dEnv as Record<string, unknown>)[k]) &&
        (dEnv as Record<string, string[]>)[k].length > 0)
    : [];
  if (candidateDestructiveKeys.length > 0) {
    const stateDoc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
    const currentState = stateDoc?.state ?? {};
    // Every candidate here is already a real, explicit deletion.
    const actuallyChanged = candidateDestructiveKeys;

    // Root admins (ADMIN_IDS) bypass every gate, every time. Resolved via
    // session.user.fixedUserId OR session.user.email → ADMIN_EMAIL_MAP.
    const isRootAdmin = isRootAdminFromSession(session);

    if (actuallyChanged.length > 0 && !isRootAdmin) {
      logApi(ROUTE, "destructive_gate_check", {
        actorUserId,
        sessionEmail: session?.user?.email,
        hasFixedUserId: !!session?.user?.fixedUserId,
        changed: actuallyChanged,
      });
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

  // Capture pre-patch state for notification diffing.
  // We diff: claims, statuses, assignments, approvedStages, approvedSubtasks.
  const prePatchOwners: Record<string, string[]> = {};
  let prePatchStatuses: Record<string, string> = {};
  let prePatchApprovedStages: string[] = [];
  let prePatchApprovedSubtasks: string[] = [];
  let prePatchApprovedPipelines: string[] = [];
  let prePatchExecProposals: Array<{ id: number; status: string; by: string; title: string }> = [];
  const NOTIFY_KEYS = new Set([
    "owners", "claims", "assignments",
    "stageStatusOverrides",
    "approvedStages", "approvedSubtasks", "approvedPipelines",
    "execProposals",
  ]);
  const needsNotify = Object.keys(cleanPatch).some(k => NOTIFY_KEYS.has(k));
  if (needsNotify) {
    const preDoc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
    // Pre-patch owners = union of (legacy claims + legacy assignments + owners).
    // After this code path persists, all writes go through `owners` only.
    const mergeInto = (target: Record<string, string[]>, src: Record<string, string[]> | undefined) => {
      if (!src) return;
      for (const [k, v] of Object.entries(src)) {
        target[k] = Array.from(new Set([...(target[k] || []), ...(v || [])]));
      }
    };
    mergeInto(prePatchOwners, preDoc?.state?.owners as Record<string, string[]> | undefined);
    mergeInto(prePatchOwners, preDoc?.state?.claims as Record<string, string[]> | undefined);
    mergeInto(prePatchOwners, preDoc?.state?.assignments as Record<string, string[]> | undefined);
    prePatchStatuses = (preDoc?.state?.stageStatusOverrides as Record<string, string> | undefined) ?? {};
    prePatchApprovedStages = (preDoc?.state?.approvedStages as string[] | undefined) ?? [];
    prePatchApprovedSubtasks = (preDoc?.state?.approvedSubtasks as string[] | undefined) ?? [];
    prePatchApprovedPipelines = (preDoc?.state?.approvedPipelines as string[] | undefined) ?? [];
    prePatchExecProposals = ((preDoc?.state?.execProposals as Array<{ id: number; status: string; by: string; title: string }> | undefined) ?? [])
      .map(p => ({ id: p.id, status: p.status, by: p.by, title: p.title }));
  }

  // Read-modify-write with optimistic locking:
  // 1. Read current `state` + `updatedAt`.
  // 2. Merge patch into state in JS (per-key for maps, by-id for arrays-of-objects,
  //    set-union for set-like arrays — see pipelineStateMerge.ts).
  // 3. Write with filter that includes the original updatedAt. If another writer
  //    landed in between, matchedCount=0 and we retry (max 5 attempts). With low
  //    write volume this is effectively never contended; on a hot key the worst
  //    case is a few retries, no data loss.
  const { _deletes, _deleteMode, ...statePatch } = cleanPatch as Record<string, unknown> & {
    _deletes?: DeletesEnvelope;
    _deleteMode?: string;
  };
  // Only honour deletions from clients that compute them from EXPLICIT user intent
  // (they tag the patch). A legacy diff-based client omits the tag; ignoring its
  // `_deletes` prevents it from vanishing data it simply hasn't loaded yet.
  const honourDeletes = _deleteMode === "explicit";
  if (_deletes && !honourDeletes) {
    console.warn(`[pipeline-state] ignored _deletes from untagged (legacy) client: ${Object.keys(_deletes).join(", ")}`);
  }
  // Defense-in-depth: validateNestedKeys doesn't recurse into arrays, so we
  // sanitize each _deletes member here.
  let safeDeletes: DeletesEnvelope | undefined;
  if (honourDeletes && _deletes && typeof _deletes === "object" && !Array.isArray(_deletes)) {
    safeDeletes = {};
    for (const [field, keys] of Object.entries(_deletes)) {
      if (!Array.isArray(keys)) continue;
      const cleanKeys = keys.filter(
        k => typeof k === "string" && !/[.$]|__proto__|constructor|prototype/.test(k)
      );
      if (cleanKeys.length > 0) safeDeletes[field] = cleanKeys;
    }
  }

  let doc: { state?: Record<string, unknown>; updatedAt?: Date } | null = null;
  let mergeOk = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await PipelineState.findOne(WORKSPACE).lean() as
      | { state?: Record<string, unknown>; updatedAt?: Date }
      | null;
    const currentState = current?.state ?? {};
    const lockUpdatedAt = current?.updatedAt;
    // Guardrail: the optimistic-concurrency filter below matches on `updatedAt`,
    // which Mongoose types as a Date. If a direct DB write ever stored it as a raw
    // number (e.g. Date.now() from a repair script), the Date-cast filter never
    // matches and EVERY write 409-freezes. Detect the wrong type, self-heal it to a
    // Date (matched by workspace only, so it lands regardless of the bad type), and
    // retry the CAS. This makes the freeze that happened once self-correcting.
    if (lockUpdatedAt != null && !(lockUpdatedAt instanceof Date)) {
      await PipelineState.updateOne(WORKSPACE, { $set: { updatedAt: new Date(lockUpdatedAt as string | number) } });
      logApi(ROUTE, "healed_updatedAt_type", { was: typeof lockUpdatedAt });
      continue;
    }
    const nextState = mergeStateWithPatch(currentState, statePatch, safeDeletes);
    const newUpdatedAt = new Date();
    const writeFilter = lockUpdatedAt
      ? { ...WORKSPACE, updatedAt: lockUpdatedAt }
      : { ...WORKSPACE, updatedAt: { $exists: false } };
    const result = await PipelineState.findOneAndUpdate(
      writeFilter,
      { $set: { state: nextState, updatedAt: newUpdatedAt } },
      { new: true }
    ).lean() as { state?: Record<string, unknown>; updatedAt?: Date } | null;
    if (result) {
      doc = result;
      mergeOk = true;
      logApi(ROUTE, "PATCH_success", { attempt: attempt + 1 });
      break;
    }
    // CAS lost — another writer landed first. Brief jittered backoff and retry.
    await new Promise(r => setTimeout(r, 30 + Math.floor(Math.random() * 70)));
  }
  if (!mergeOk) {
    logApi(ROUTE, "PATCH_contention_exhausted");
    return NextResponse.json({ error: "WRITE_CONTENTION", reason: "merge contention exceeded retries" }, { status: 409 });
  }

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
    // Owners is the canonical post-patch ownership map (union of new owners + any
    // legacy claims/assignments fields the doc may still contain pre-migration).
    const postOwners: Record<string, string[]> = {};
    const mergeOwners = (src: Record<string, string[]> | undefined) => {
      if (!src) return;
      for (const [k, v] of Object.entries(src)) {
        postOwners[k] = Array.from(new Set([...(postOwners[k] || []), ...(v || [])]));
      }
    };
    mergeOwners(postState.owners as Record<string, string[]> | undefined);
    mergeOwners(postState.claims as Record<string, string[]> | undefined);
    mergeOwners(postState.assignments as Record<string, string[]> | undefined);
    const postWorkspaces = (postState.workspaces as Array<{
      id: string; name: string; captains: string[]; members: string[]; pipelineIds: string[];
    }> | undefined) ?? [];
    const postSubtasks = (postState.subtasks as Record<string, Array<{ id: number; text: string }>> | undefined) ?? {};
    const postCustomStages = (postState.customStages as Record<string, string[]> | undefined) ?? {};

    // Build stage → pipelineId map (covers static + custom stages)
    const stageToP = new Map<string, string>();
    for (const p of pipelineData) {
      for (const s of p.stages) stageToP.set(s, p.id);
    }
    const dbCustomStages = (postState.customStages as Record<string, string[]> | undefined) ?? {};
    for (const [pid, stages] of Object.entries(dbCustomStages)) {
      for (const stageName of stages) stageToP.set(stageName, pid);
    }
    // Pipeline → workspaceId map (so we can route a stage to its workspace)
    const pipelineToWs = new Map<string, { id: string; name: string }>();
    for (const w of postWorkspaces) {
      for (const pid of w.pipelineIds) pipelineToWs.set(pid, { id: w.id, name: w.name });
    }

    // Pipeline-level lookup helper
    function resolveStageContext(stageKey: string) {
      const parsedSubtask = SubtaskKey.parse(stageKey as Parameters<typeof SubtaskKey.parse>[0]);
      const parentStageKey = parsedSubtask?.parentStageId ?? stageKey;
      const pipelineId = stageToP.get(parentStageKey);
      const pipeline = pipelineData.find(p => p.id === pipelineId);
      const pipelineName = pipeline?.name ?? pipelineId ?? parentStageKey;
      const ws = pipelineId ? pipelineToWs.get(pipelineId) : undefined;
      const displayStageName = parsedSubtask
        ? (postSubtasks[parentStageKey] ?? []).find(s => s.id === parsedSubtask.subtaskId)?.text ?? stageKey
        : stageKey;
      return {
        displayStageName,
        parentStageKey,
        pipelineName,
        workspaceId: ws?.id ?? "",
        workspaceName: ws?.name ?? "",
      };
    }

    // ── claimed / assigned (owners gained members) ────────────────────────
    // Both old `claims` and `assignments` patches plus the new `owners` patch
    // funnel through here. We diff against the merged pre-state to detect new
    // owners; if the patch came via `assignments` we tag it as "assigned",
    // otherwise "claimed".
    const ownerDeltaSource =
      "owners" in cleanPatch ? "owners" :
      "assignments" in cleanPatch ? "assignments" :
      "claims" in cleanPatch ? "claims" : null;
    if (ownerDeltaSource) {
      const patched = cleanPatch[ownerDeltaSource] as Record<string, string[]>;
      const eventType: "claimed" | "assigned" =
        ownerDeltaSource === "assignments" ? "assigned" : "claimed";
      for (const [stageKey, newOwners] of Object.entries(patched)) {
        const prev = prePatchOwners[stageKey] ?? [];
        const added = newOwners.filter(id => !prev.includes(id));
        if (added.length === 0) continue;
        const ctx = resolveStageContext(stageKey);
        void sendNotifications({
          eventType,
          stageKey,
          displayStageName: ctx.displayStageName,
          pipelineName: ctx.pipelineName,
          workspaceId: ctx.workspaceId,
          workspaceName: ctx.workspaceName,
          workspaces: postWorkspaces,
          actorId: actorUserId,
          claimers: postOwners[stageKey] ?? [],
          assignees: postOwners[stageKey] ?? [],
          newlyAssigned: eventType === "assigned" ? added : undefined,
          points: stageDefaults[ctx.parentStageKey]?.points ?? 10,
          detail: eventType === "assigned"
            ? `${actorUserId} assigned ${added.join(", ")} to ${ctx.displayStageName}`
            : `${actorUserId} claimed ${ctx.displayStageName}`,
        });
      }
    }

    // ── status_change / active / blocked ──────────────────────────────────
    if ("stageStatusOverrides" in cleanPatch) {
      const patched = cleanPatch.stageStatusOverrides as Record<string, string>;
      for (const [stageKey, newStatus] of Object.entries(patched)) {
        const prev = prePatchStatuses[stageKey] ?? "concept";
        if (prev === newStatus) continue;
        const ctx = resolveStageContext(stageKey);
        const eventType =
          newStatus === "active" ? "active" :
          newStatus === "blocked" ? "blocked" : "status_change";
        void sendNotifications({
          eventType,
          stageKey,
          displayStageName: ctx.displayStageName,
          pipelineName: ctx.pipelineName,
          workspaceId: ctx.workspaceId,
          workspaceName: ctx.workspaceName,
          workspaces: postWorkspaces,
          actorId: actorUserId,
          claimers: postOwners[stageKey] ?? [],
          assignees: postOwners[stageKey] ?? [],
          points: stageDefaults[ctx.parentStageKey]?.points ?? 10,
          detail: `${ctx.displayStageName}: ${prev} → ${newStatus}`,
        });
      }
    }

    // ── approved (stage) ──────────────────────────────────────────────────
    if ("approvedStages" in cleanPatch) {
      const patched = cleanPatch.approvedStages as string[];
      const added = patched.filter(s => !prePatchApprovedStages.includes(s));
      for (const stageKey of added) {
        const ctx = resolveStageContext(stageKey);
        void sendNotifications({
          eventType: "approved",
          stageKey,
          displayStageName: ctx.displayStageName,
          pipelineName: ctx.pipelineName,
          workspaceId: ctx.workspaceId,
          workspaceName: ctx.workspaceName,
          workspaces: postWorkspaces,
          actorId: actorUserId,
          claimers: postOwners[stageKey] ?? [],
          assignees: postOwners[stageKey] ?? [],
          points: stageDefaults[ctx.parentStageKey]?.points ?? 10,
          detail: `${ctx.displayStageName} approved (+${stageDefaults[ctx.parentStageKey]?.points ?? 10}pts)`,
        });
      }
    }

    // ── pipeline_completed (last stage of pipeline approved) ──────────────
    if ("approvedPipelines" in cleanPatch) {
      const patched = cleanPatch.approvedPipelines as string[];
      const added = patched.filter(p => !prePatchApprovedPipelines.includes(p));
      for (const pipelineId of added) {
        const pipe = pipelineData.find(p => p.id === pipelineId);
        const allStages = [...(pipe?.stages ?? []), ...(postCustomStages[pipelineId] ?? [])];
        const ownersUnion = new Set<string>();
        for (const s of allStages) (postOwners[s] || []).forEach(o => ownersUnion.add(o));
        const total = allStages.reduce((sum, s) => sum + (stageDefaults[s]?.points ?? 10), 0);
        const bonus = Math.floor(total * 0.25);
        const ws = pipelineToWs.get(pipelineId);
        void sendNotifications({
          eventType: "pipeline_completed",
          stageKey: pipelineId,
          pipelineName: pipe?.name ?? pipelineId,
          workspaceId: ws?.id ?? "",
          workspaceName: ws?.name ?? "",
          workspaces: postWorkspaces,
          actorId: actorUserId,
          claimers: [...ownersUnion],
          assignees: [...ownersUnion],
          points: bonus,
          detail: `pipeline "${pipe?.name ?? pipelineId}" complete · +${bonus}pts shared`,
        });
      }
    }

    // ── subtask_approved ──────────────────────────────────────────────────
    if ("approvedSubtasks" in cleanPatch) {
      const patched = cleanPatch.approvedSubtasks as string[];
      const added = patched.filter(s => !prePatchApprovedSubtasks.includes(s));
      for (const subKey of added) {
        // subKey is "parentStageId::subtaskId"
        const [parentStage, subId] = subKey.split("::");
        const ctx = resolveStageContext(parentStage);
        const subText = (postSubtasks[parentStage] ?? []).find(s => String(s.id) === subId)?.text ?? subKey;
        void sendNotifications({
          eventType: "subtask_approved",
          stageKey: subKey,
          displayStageName: subText,
          pipelineName: ctx.pipelineName,
          workspaceId: ctx.workspaceId,
          workspaceName: ctx.workspaceName,
          workspaces: postWorkspaces,
          actorId: actorUserId,
          claimers: postOwners[subKey] ?? [],
          assignees: postOwners[subKey] ?? [],
          detail: `subtask "${subText}" approved`,
        });
      }
    }

    // ── exec request completed — notify the exec who submitted ────────────
    if ("execProposals" in cleanPatch) {
      const patched = cleanPatch.execProposals as Array<{ id: number; status: string; by: string; title: string }>;
      const prePatchMap = new Map(prePatchExecProposals.map(p => [p.id, p]));
      for (const p of patched) {
        const pre = prePatchMap.get(p.id);
        if (p.status === "completed" && pre && pre.status !== "completed") {
          void sendNotifications({
            eventType: "approved",
            stageKey: `exec-request-${p.id}`,
            pipelineName: "Executive Request",
            workspaceId: "",
            workspaceName: "",
            workspaces: postWorkspaces,
            actorId: actorUserId,
            claimers: [p.by],
            assignees: [p.by],
            points: 0,
            detail: `Your request "${p.title}" has been completed`,
          });
        }
      }
    }
  }

  return NextResponse.json((doc as { state?: unknown } | null)?.state || {});
}

// sendBeacon (used on beforeunload to flush pending writes) only supports POST,
// not PATCH. Accept POST here as an alias for PATCH so we don't lose user changes
// when the page unloads between debounce arm and debounce fire.
export const POST = PATCH;
