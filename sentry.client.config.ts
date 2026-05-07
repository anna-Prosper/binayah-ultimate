import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Capture 10% of transactions in prod; 100% in dev for easier debugging.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Replay 0.1% of sessions in prod; include 100% with errors.
    replaysSessionSampleRate: 0.001,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
  });
}
