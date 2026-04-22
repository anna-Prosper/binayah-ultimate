import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import AuthUser from "@/lib/AuthUser";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/auth/prefs
 * Body: { emailNotifications: boolean }
 * Requires a valid session. Updates the AuthUser record for session.fixedUserId.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.emailNotifications !== "boolean") {
    return NextResponse.json(
      { error: "emailNotifications must be a boolean" },
      { status: 400 }
    );
  }

  try {
    await connectMongo();
    await AuthUser.findOneAndUpdate(
      { fixedUserId: session.user.fixedUserId },
      { emailNotifications: body.emailNotifications },
      { upsert: false }
    );
  } catch (err) {
    console.error("[auth/prefs] DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, emailNotifications: body.emailNotifications });
}

/**
 * GET /api/auth/prefs
 * Returns the current email notification preference for the session user.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongo();
    const user = await AuthUser.findOne({ fixedUserId: session.user.fixedUserId }).lean();
    const emailNotifications = (user as { emailNotifications?: boolean } | null)?.emailNotifications ?? true;
    return NextResponse.json({ emailNotifications });
  } catch (err) {
    console.error("[auth/prefs] GET DB error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
