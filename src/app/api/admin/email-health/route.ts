import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isRootAdminFromSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = process.env.SMTP_PORT || "465";
  const smtpSecure = process.env.SMTP_SECURE !== "false";

  return NextResponse.json({
    ok: true,
    smtp: {
      configured: Boolean(smtpUser && smtpPass),
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      from: smtpUser ? smtpUser.replace(/^(.{2}).+(@.+)$/, "$1***$2") : null,
    },
    cron: {
      configured: Boolean(process.env.CRON_SECRET),
      nextauthUrl: process.env.NEXTAUTH_URL || null,
    },
    storage: {
      s3Configured: Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET),
      bucket: process.env.AWS_S3_BUCKET || null,
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null,
    },
  });
}
