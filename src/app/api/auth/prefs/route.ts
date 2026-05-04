import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import AuthUser from "@/lib/AuthUser";
import { ADMIN_IDS, resolveEffectiveUserId } from "@/lib/data";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "emailNotifications",
  "inAppNotifications",
  "notifyMention",
  "notifyApproved",
  "notifyAssigned",
  "notifyClaim",
  "notifyStatus",
  "notifyComment",
  "notifySubtask",
  "notifyReminder",
  "notifyRequest",
  "notifyDue",
  "notifyChat",
  "notifyDm",
  "notifyBug",
  "notifyOther",
  "inAppMention",
  "inAppApproved",
  "inAppAssigned",
  "inAppClaim",
  "inAppStatus",
  "inAppComment",
  "inAppSubtask",
  "inAppReminder",
  "inAppRequest",
  "inAppDue",
  "inAppChat",
  "inAppDm",
  "inAppBug",
  "inAppOther",
]);

function targetUserFromRequest(req: NextRequest, fixedUserId: string): { ok: true; targetUserId: string } | { ok: false; status: number; error: string } {
  const actorId = resolveEffectiveUserId(fixedUserId) || fixedUserId;
  const requested = req.nextUrl.searchParams.get("userId")?.trim();
  if (!requested || requested === actorId) return { ok: true, targetUserId: actorId };
  if (!ADMIN_IDS.includes(actorId)) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, targetUserId: requested };
}

/**
 * PATCH /api/auth/prefs
 * Body: any subset of:
 *   { emailNotifications, notifyMention, notifyApproved, notifyAssigned,
 *     notifyClaim, notifyStatus, notifyComment, notifySubtask }
 * All values must be booleans. Updates only the keys provided.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const target = targetUserFromRequest(req, session.user.fixedUserId);
  if (!target.ok) return NextResponse.json({ error: target.error }, { status: target.status });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof val !== "boolean") {
      return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
    }
    update[key] = val;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no valid keys in body" }, { status: 400 });
  }

  try {
    await connectMongo();
    await AuthUser.findOneAndUpdate(
      { fixedUserId: target.targetUserId },
      { $set: update },
      { upsert: false }
    );
  } catch (err) {
    console.error("[auth/prefs] DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...update });
}

/**
 * GET /api/auth/prefs
 * Returns the full prefs object. Missing fields default to true.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const target = targetUserFromRequest(req, session.user.fixedUserId);
  if (!target.ok) return NextResponse.json({ error: target.error }, { status: target.status });

  try {
    await connectMongo();
    const user = await AuthUser.findOne({ fixedUserId: target.targetUserId }).lean() as
      | Record<string, unknown> | null;
    const result: Record<string, boolean> = {};
    for (const key of ALLOWED_KEYS) {
      const v = user?.[key];
      result[key] = typeof v === "boolean" ? v : true; // default true
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[auth/prefs] GET DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
