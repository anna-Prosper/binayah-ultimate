/**
 * Temporary debug route — sends a test email via the same sendStageEmail
 * helper that production notifications use. Verifies SMTP env vars are
 * wired up on Vercel and the nodemailer transport actually delivers.
 *
 * Usage: GET /api/test-email?to=foo@bar.com
 *
 * Delete this file after debugging.
 */
import { NextRequest, NextResponse } from "next/server";
import { sendStageEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  if (!to || !/^[^@]+@[^@]+\.[^@]+$/.test(to)) {
    return NextResponse.json({ error: "missing or invalid ?to= param" }, { status: 400 });
  }

  const hasUser = !!process.env.SMTP_USER;
  const hasPass = !!process.env.SMTP_PASS;
  if (!hasUser || !hasPass) {
    return NextResponse.json({
      error: "SMTP env vars missing on this deployment",
      hasUser,
      hasPass,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
    }, { status: 500 });
  }

  try {
    await sendStageEmail({
      to,
      subject: "[binayah-ultimate] production SMTP test",
      html: `<div style="font-family:sans-serif;padding:20px">
        <h2 style="color:#7c3aed">Production SMTP works ✓</h2>
        <p>If you got this email, the Vercel function can reach Gmail SMTP and deliver.</p>
        <p>This means notification emails should also work — if you're not getting them, the issue is in the notification trigger logic (actor self-exclusion, opt-out, rate limit, etc.), not the email sending itself.</p>
      </div>`,
    });
    return NextResponse.json({ ok: true, sentTo: to });
  } catch (err) {
    return NextResponse.json({
      error: "send failed",
      message: (err as Error).message,
    }, { status: 500 });
  }
}
