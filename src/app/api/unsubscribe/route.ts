import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { connectMongo } from "@/lib/mongo";
import AuthUser from "@/lib/AuthUser";

export const dynamic = "force-dynamic";

/**
 * Build the HMAC signature for an unsubscribe token.
 * Uses NEXTAUTH_SECRET (already required for auth).
 */
function hmacSign(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-unsub-secret";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Build an unsubscribe URL token for a given fixedUserId.
 * Token format (base64url): `${fixedUserId}.${hmac(fixedUserId)}`
 */
export function buildUnsubscribeToken(fixedUserId: string): string {
  const sig = hmacSign(fixedUserId);
  const payload = `${fixedUserId}.${sig}`;
  return Buffer.from(payload).toString("base64url");
}

/**
 * GET /api/unsubscribe?t=<token>
 * Verifies the HMAC, sets emailNotifications=false, renders a confirmation page.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");

  if (!token) {
    return htmlResponse(errorPage("// missing token — invalid unsubscribe link."), 400);
  }

  let fixedUserId: string;
  let providedSig: string;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const dotIdx = decoded.lastIndexOf(".");
    if (dotIdx === -1) throw new Error("malformed");
    fixedUserId = decoded.slice(0, dotIdx);
    providedSig = decoded.slice(dotIdx + 1);
  } catch {
    return htmlResponse(errorPage("// invalid token format."), 400);
  }

  // Timing-safe HMAC comparison
  const expectedSig = hmacSign(fixedUserId);
  let valid = false;
  try {
    valid = timingSafeEqual(
      Buffer.from(providedSig, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    return htmlResponse(errorPage("// token verification failed — link may be expired or tampered."), 400);
  }

  // Update DB
  try {
    await connectMongo();
    await AuthUser.findOneAndUpdate(
      { fixedUserId },
      { emailNotifications: false }
    );
  } catch (err) {
    console.error("[unsubscribe] DB error:", err);
    return htmlResponse(errorPage("// something went wrong. try again later."), 500);
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://dashboard-gamification.vercel.app";
  return htmlResponse(successPage(appUrl), 200);
}

const BG = "#08050f";
const TEXT = "#f0ecff";
const TEXT_DIM = "#9b92b8";
const ACCENT = "#bf5af2";

function successPage(appUrl: string): string {
  return page(`
    <p style="font-size:13px;color:${TEXT_DIM};margin:0 0 8px 0;">// notifications disabled</p>
    <p style="font-size:18px;font-weight:700;color:${TEXT};margin:0 0 16px 0;">
      you&rsquo;re unsubscribed.
    </p>
    <p style="font-size:11px;color:${TEXT_DIM};margin:0 0 24px 0;">
      you won&rsquo;t receive email notifications for claimed or active stages.
      you can re-enable them in your profile on the dashboard.
    </p>
    <a href="${appUrl}" style="display:inline-block;background:${ACCENT};color:${BG};font-size:11px;font-weight:700;text-decoration:none;padding:9px 20px;border-radius:6px;letter-spacing:1px;">
      back to dashboard &rarr;
    </a>
  `);
}

function errorPage(msg: string): string {
  return page(`
    <p style="font-size:13px;color:${TEXT_DIM};margin:0 0 8px 0;">// error</p>
    <p style="font-size:16px;font-weight:700;color:#ff453a;margin:0 0 16px 0;">${escHtml(msg)}</p>
    <p style="font-size:11px;color:${TEXT_DIM};margin:0;">
      if this keeps happening, contact your admin.
    </p>
  `);
}

function page(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Binayah Dashboard — Notifications</title>
</head>
<body style="margin:0;padding:0;background:${BG};min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Courier New',Courier,monospace;">
  <div style="max-width:420px;width:100%;padding:40px 24px;">
    <div style="font-size:11px;font-weight:700;color:${ACCENT};letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">
      binayah dashboard
    </div>
    ${content}
  </div>
</body>
</html>`;
}

function htmlResponse(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
