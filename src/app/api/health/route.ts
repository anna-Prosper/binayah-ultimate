import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight health check for the shared state document.
 *
 * Returns 200 when the write path is healthy, 503 with a `warnings` list when it
 * isn't. Its main job is to surface the exact failure that froze all writes once:
 * a top-level `updatedAt` stored as a non-Date breaks the optimistic-concurrency
 * CAS in /api/pipeline-state, so every write 409s forever. A monitor polling this
 * endpoint would have caught that within a minute instead of hours later.
 */
export async function GET() {
  try {
    await connectMongo();
    const doc = (await PipelineState.findOne({ workspaceId: "main" }).lean()) as
      | { state?: Record<string, unknown>; updatedAt?: unknown }
      | null;

    if (!doc) {
      return NextResponse.json(
        { ok: false, warnings: ["no state document for workspace 'main'"] },
        { status: 503 }
      );
    }

    const updatedAt = doc.updatedAt;
    const updatedAtIsDate = updatedAt instanceof Date;
    const state = (doc.state ?? {}) as Record<string, unknown>;

    const subtasksMap =
      state.subtasks && typeof state.subtasks === "object" && !Array.isArray(state.subtasks)
        ? (state.subtasks as Record<string, unknown[]>)
        : {};
    const totalSubtasks = Object.values(subtasksMap).reduce(
      (a, l) => a + (Array.isArray(l) ? l.length : 0),
      0
    );
    const count = (k: string) => (Array.isArray(state[k]) ? (state[k] as unknown[]).length : 0);

    const warnings: string[] = [];
    if (!updatedAtIsDate) {
      warnings.push(
        `updatedAt is a ${typeof updatedAt}, not a Date — the write CAS will 409-freeze until healed`
      );
    }
    const ok = warnings.length === 0;

    return NextResponse.json(
      {
        ok,
        buildSha: process.env.VERCEL_GIT_COMMIT_SHA || "",
        updatedAt: updatedAtIsDate ? (updatedAt as Date).toISOString() : String(updatedAt),
        updatedAtType: updatedAtIsDate ? "date" : typeof updatedAt,
        lastWriteAgeSeconds: updatedAtIsDate
          ? Math.round((Date.now() - (updatedAt as Date).getTime()) / 1000)
          : null,
        totals: {
          subtasks: totalSubtasks,
          workspaces: count("workspaces"),
          users: count("users"),
          databases: count("databases"),
          customPipelines: count("customPipelines"),
        },
        warnings,
      },
      { status: ok ? 200 : 503 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, warnings: [`health check failed: ${(e as Error).message}`] },
      { status: 503 }
    );
  }
}
