import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Keep large icon packages tree-shaken and route chunks smaller.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Bake the deploy's git SHA into the client bundle so an already-open tab can
  // detect when the server is running a newer build and auto-reload (kills the
  // stale-tab clobber problem — a tab running old code can't linger). Vercel
  // provides VERCEL_GIT_COMMIT_SHA at build time; empty in local dev (→ no-op).
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "",
  },
};

// Sentry is gated on the DSN env var being set — safe to include the plugin
// unconditionally since it's a no-op without a DSN.
export default withSentryConfig(nextConfig, {
  // Suppresses Sentry CLI output during build if no DSN / auth token.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Disable source map upload if no auth token (dev or no-token prod builds).
  widenClientFileUpload: false,
  webpack: {
    treeshake: { removeDebugLogging: true },
    autoInstrumentServerFunctions: true,
  },
});
