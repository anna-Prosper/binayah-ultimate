import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
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
     * - /api/cron/* and /api/zoom/meetings (they enforce their own secret/session auth)
     * - /_next/* (Next.js internals)
     * - /favicon*, /avatars*, /public static assets
     */
    "/((?!login|api/auth|api/cron|api/zoom/meetings|api/unsubscribe|api/admin|_next/static|_next/image|favicon|avatars|icons|images).*)",
  ],
};
