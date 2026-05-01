import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function appUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || "http://localhost:3000";
}

export async function GET() {
  const missing = [
    ["ZOOM_CLIENT_ID", process.env.ZOOM_CLIENT_ID],
    ["ZOOM_CLIENT_SECRET", process.env.ZOOM_CLIENT_SECRET],
  ].filter(([, value]) => !value).map(([key]) => key);

  return NextResponse.json({
    configured: missing.length === 0,
    connected: Boolean(process.env.ZOOM_ACCOUNT_CONNECTED === "true"),
    missing,
    connectUrl: "/api/zoom/connect",
    callbackUrl: `${appUrl()}/api/zoom/callback`,
  });
}
