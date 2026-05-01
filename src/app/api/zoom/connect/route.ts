import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function appUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || "http://localhost:3000";
}

export async function GET() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const redirectUri = `${appUrl()}/api/zoom/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: "ZOOM_NOT_CONFIGURED",
        message: "Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET, then register the callback URL in Zoom.",
        callbackUrl: redirectUri,
      },
      { status: 400 },
    );
  }

  const url = new URL("https://zoom.us/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(url);
}
