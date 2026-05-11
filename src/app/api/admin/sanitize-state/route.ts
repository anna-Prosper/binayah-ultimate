import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/admin/sanitize-state";
const WORKSPACE = { workspaceId: "main" };

// Slices that are Record<string, X> where the X is the value the user cares
// about. Renaming the key here means "preserve the data, just change its label".
const MAP_SLICES = [
  "owners",
  "claims",       // legacy alias of owners but might still be present
  "assignments",  // legacy
  "stageStatusOverrides",
  "stageDescOverrides",
  "stageDueDates",
  "stageNameOverrides",
  "stagePriorities",
  "stagePointsOverride",
  "subtasks",
  "subtaskStages",
  "subtaskDescOverrides",
  "subtaskDueDates",
  "reactions",
  "comments",
  "commentReactions",
  "stageImages",
] as const;

// Slices that are Record<pipelineId, string[]> where the strings are stage names.
// Renaming a stage name means rewriting these arrays.
const ARRAY_VALUE_MAP_SLICES = ["customStages"] as const;

// Slices that are string[] of stage names. Renaming = rewriting the array.
const STRING_SET_SLICES = ["approvedStages", "archivedStages"] as const;

// Two regexes — test() with `g` flag has stateful lastIndex which produces
// flaky results across iterations. Use non-global for tests, global for replace.
const HAS_FORBIDDEN = /[.$]/;
const sanitize = (key: string): string => key.replace(/[.$]/g, "_");
const isBad = (s: string) => HAS_FORBIDDEN.test(s);

type State = Record<string, unknown>;

// GET = dry run, returns what would be renamed.
// POST = apply the rename and save.
export async function GET(req: NextRequest) {
  return await run(req, /*apply=*/ false);
}

export async function POST(req: NextRequest) {
  return await run(req, /*apply=*/ true);
}

async function run(req: NextRequest, apply: boolean): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRootAdminFromSession(session)) return NextResponse.json({ error: "FORBIDDEN: root admin only" }, { status: 403 });

  await connectMongo();
  const doc = await PipelineState.findOne(WORKSPACE).lean() as { state?: State } | null;
  const state: State = (doc?.state as State) ?? {};

  // Phase 1: walk every map slice, collect oldKey → newKey rename pairs.
  // Also collect bad keys inside `customStages` array values (stage names) and
  // `subtasks` keys (they're like "Some Stage Name" or "Some.Stage::1234").
  const renames: { slice: string; oldKey: string; newKey: string }[] = [];

  for (const slice of MAP_SLICES) {
    const v = state[slice];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    for (const k of Object.keys(v as Record<string, unknown>)) {
      if (isBad(k)) {
        renames.push({ slice, oldKey: k, newKey: sanitize(k) });
      }
    }
  }

  // Stage-name-rename map: every stage name we rewrite anywhere needs to be
  // reflected in customStages arrays / approved/archived sets.
  const stageRenameMap = new Map<string, string>();
  for (const r of renames) {
    // subtasks uses "stage::id" — careful: we want to rename the stage part only
    // when it's a top-level stage name (not nested via :: which is fine).
    // For simplicity, treat keys without "::" as stage names and add to rename map.
    if (!r.oldKey.includes("::")) {
      stageRenameMap.set(r.oldKey, r.newKey);
    }
  }
  // Also scan customStages values (stage names in arrays) for bad chars.
  for (const slice of ARRAY_VALUE_MAP_SLICES) {
    const v = state[slice];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    for (const [pid, arr] of Object.entries(v as Record<string, unknown>)) {
      if (!Array.isArray(arr)) continue;
      for (const name of arr as string[]) {
        if (typeof name !== "string") continue;
        if (isBad(name) && !stageRenameMap.has(name)) {
          stageRenameMap.set(name, sanitize(name));
          renames.push({ slice: `${slice}[${pid}]`, oldKey: name, newKey: sanitize(name) });
        }
      }
    }
  }
  // And string-set slices.
  for (const slice of STRING_SET_SLICES) {
    const v = state[slice];
    if (!Array.isArray(v)) continue;
    for (const name of v as string[]) {
      if (typeof name !== "string") continue;
      if (isBad(name) && !stageRenameMap.has(name)) {
        stageRenameMap.set(name, sanitize(name));
        renames.push({ slice, oldKey: name, newKey: sanitize(name) });
      }
    }
  }

  if (renames.length === 0) {
    return NextResponse.json({ ok: true, applied: false, message: "Nothing to sanitize — state is clean", renames: [] });
  }

  if (!apply) {
    return NextResponse.json({ ok: true, applied: false, dryRun: true, renames });
  }

  // Phase 2: apply renames.
  const newState: State = { ...state };

  // Rename map keys.
  for (const slice of MAP_SLICES) {
    const v = newState[slice];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const next: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const newK = isBad(k) ? sanitize(k) : k;
      // If the sanitized key already exists, merge — prefer the existing value
      // unless that's empty (it usually won't be, but we err on safety).
      if (newK !== k && next[newK] !== undefined) {
        // Merge based on shape: object → object, array → array, else keep existing
        const existing = next[newK];
        if (Array.isArray(existing) && Array.isArray(val)) {
          next[newK] = Array.from(new Set([...(existing as unknown[]), ...(val as unknown[])]));
        } else if (existing && typeof existing === "object" && val && typeof val === "object" && !Array.isArray(val)) {
          next[newK] = { ...existing, ...val };
        }
        // else keep existing
      } else {
        next[newK] = val;
      }
    }
    newState[slice] = next;
  }

  // Rewrite stage names inside customStages arrays.
  for (const slice of ARRAY_VALUE_MAP_SLICES) {
    const v = newState[slice];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const next: Record<string, unknown> = {};
    for (const [pid, arr] of Object.entries(v as Record<string, unknown>)) {
      if (!Array.isArray(arr)) { next[pid] = arr; continue; }
      const seen = new Set<string>();
      const out: string[] = [];
      for (const name of arr as string[]) {
        const newName = typeof name === "string" && stageRenameMap.has(name)
          ? stageRenameMap.get(name)!
          : name;
        if (typeof newName === "string" && !seen.has(newName)) {
          seen.add(newName);
          out.push(newName);
        }
      }
      next[pid] = out;
    }
    newState[slice] = next;
  }

  // Rewrite string-set slices.
  for (const slice of STRING_SET_SLICES) {
    const v = newState[slice];
    if (!Array.isArray(v)) continue;
    const out = new Set<string>();
    for (const name of v as string[]) {
      const newName = typeof name === "string" && stageRenameMap.has(name)
        ? stageRenameMap.get(name)!
        : name;
      if (typeof newName === "string") out.add(newName);
    }
    newState[slice] = Array.from(out);
  }

  // Save.
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $set: { state: newState, updatedAt: new Date() } },
    { upsert: true }
  );

  logApi(ROUTE, "sanitized", { count: renames.length, renames: renames.slice(0, 20) });
  return NextResponse.json({ ok: true, applied: true, count: renames.length, renames });
}
