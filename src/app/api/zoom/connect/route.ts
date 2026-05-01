import { NextResponse } from "next/server";
import { getZoomEnv, getZoomServerToken } from "@/lib/zoom";

export const dynamic = "force-dynamic";

export async function GET() {
  const { missing } = getZoomEnv();

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "ZOOM_NOT_CONFIGURED",
        message: "Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET for the Server-to-Server OAuth app.",
        missing,
      },
      { status: 400 },
    );
  }

  const token = await getZoomServerToken();
  if (!token.ok) {
    return NextResponse.json(
      {
        error: "ZOOM_TOKEN_FAILED",
        message: token.message,
      },
      { status: token.status || 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "server_to_server",
    expiresIn: token.expiresIn,
    scopes: token.scope,
  });
}
