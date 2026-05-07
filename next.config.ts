import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry is gated on the DSN env var being set — safe to include the plugin
// unconditionally since it's a no-op without a DSN.
export default withSentryConfig(nextConfig, {
  // Suppresses Sentry CLI output during build if no DSN / auth token.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Disable source map upload if no auth token (dev or no-token prod builds).
  widenClientFileUpload: false,
  disableLogger: true,
  // Automatically instrument Next.js data-fetching methods and API routes.
  autoInstrumentServerFunctions: true,
});
