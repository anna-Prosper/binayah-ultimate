import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongo";
import AuthUser from "@/lib/AuthUser";

// ─── Admin email → fixedUserId whitelist ──────────────────────────────────────
// Hardcoded (not solely env-var driven) per spec — multiple emails map to same user.
export const ADMIN_EMAIL_MAP: Record<string, string> = {
  "anna@prosper-fi.com": "anna",
  "aakarshit@prosper-fi.com": "aakarshit",
  "uk@prosper-fi.com": "usama",
  "mamr@binayah.com": "ahsan",
  "pm@binayah.com": "prajeesh",
  "ak@binayah.com": "abdallah",
};

// Reverse map: fixedUserId → primary email for notifications
export const USER_PRIMARY_EMAIL: Record<string, string> = {
  anna: "anna@prosper-fi.com",
  aakarshit: "aakarshit@prosper-fi.com",
  usama: "uk@prosper-fi.com",
  ahsan: "mamr@binayah.com",
  prajeesh: "pm@binayah.com",
  abdallah: "ak@binayah.com",
};

export function getEmailForUser(fixedUserId: string): string | undefined {
  return USER_PRIMARY_EMAIL[fixedUserId];
}

export function getFixedUserIdForEmail(email: string): string | undefined {
  return ADMIN_EMAIL_MAP[email.toLowerCase()];
}

/**
 * Centralized root-admin check. Resolves a session to a fixedUserId via
 * (1) session.user.fixedUserId, (2) session.user.email → ADMIN_EMAIL_MAP,
 * then checks against ADMIN_IDS. Returns true ONLY for global root admins.
 *
 * Use this anywhere a root user must always pass through a permission gate.
 */
import { ADMIN_IDS } from "@/lib/data";
export function isRootAdminFromSession(
  session: { user?: { fixedUserId?: string; email?: string | null } } | null | undefined
): boolean {
  if (!session?.user) return false;
  const fid = session.user.fixedUserId;
  if (fid && ADMIN_IDS.includes(fid)) return true;
  const email = (session.user.email || "").toLowerCase();
  if (!email) return false;
  const derived = ADMIN_EMAIL_MAP[email];
  return !!derived && ADMIN_IDS.includes(derived);
}

// ─── NextAuth options ─────────────────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();
        const fixedUserId = ADMIN_EMAIL_MAP[email];
        if (!fixedUserId) {
          // Not on whitelist — signal with specific error
          throw new Error(`NOT_WHITELISTED:${email}`);
        }

        await connectMongo();
        const user = await AuthUser.findOne({ email });
        if (!user) {
          throw new Error("NO_ACCOUNT");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error("WRONG_PASSWORD");
        }

        return { id: fixedUserId, email, fixedUserId, name: fixedUserId };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ account, profile }) {
      // For Google OAuth: enforce whitelist
      if (account?.provider === "google") {
        const email = profile?.email?.toLowerCase() ?? "";
        const fixedUserId = ADMIN_EMAIL_MAP[email];
        if (!fixedUserId) {
          // Redirect to login with error param
          return `/login?error=NOT_WHITELISTED&email=${encodeURIComponent(email)}`;
        }
      }
      return true;
    },

    async jwt({ token, user, account, profile }) {
      // First sign-in: add fixedUserId
      if (user && (user as { fixedUserId?: string }).fixedUserId) {
        token.fixedUserId = (user as { fixedUserId?: string }).fixedUserId;
      }
      // Google OAuth: look up fixedUserId from email
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email.toLowerCase();
        token.fixedUserId = ADMIN_EMAIL_MAP[email];
        token.email = email;
      }
      // Fallback: stale tokens without fixedUserId — derive from email so the
      // server always knows the actor identity (especially for ADMIN_IDS root).
      if (!token.fixedUserId && token.email) {
        const derived = ADMIN_EMAIL_MAP[(token.email as string).toLowerCase()];
        if (derived) token.fixedUserId = derived;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.fixedUserId) {
        session.user.fixedUserId = token.fixedUserId;
      } else if (session.user?.email) {
        // Defense in depth: derive at session-build time if token didn't have it.
        const derived = ADMIN_EMAIL_MAP[session.user.email.toLowerCase()];
        if (derived) session.user.fixedUserId = derived;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
