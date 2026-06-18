import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (the auth page itself)
     * - /api/auth/* (next-auth internal routes)
     * - /api/admin/*, /api/cron/* and /api/zoom/meetings (they enforce their own secret/session auth)
     * - /_next/* (Next.js internals)
     * - /favicon*, manifest and generated app icons
     * - /avatars*, /public static assets
     */
    "/((?!login|api/auth|api/admin|api/cron|api/zoom/meetings|api/unsubscribe|_next/static|_next/image|favicon|icon.svg|apple-icon|opengraph-image|manifest.webmanifest|robots.txt|avatars|icons|images).*)",
  ],
};
