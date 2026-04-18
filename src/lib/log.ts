/**
 * Structured JSON logger for API routes.
 * Output goes to stdout — Vercel log explorer parses JSON lines automatically.
 */

type Meta = Record<string, unknown>;

export function logApi(route: string, event: string, meta?: Meta) {
  const entry = {
    ts: new Date().toISOString(),
    route,
    event,
    meta: meta || undefined,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}
