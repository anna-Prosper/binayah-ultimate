import nodemailer from "nodemailer";

// Lazily create the transporter so missing env vars produce a warning,
// not a module-load crash.
function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT ?? "465", 10);
  const secure = process.env.SMTP_SECURE !== "false"; // default true

  if (!user || !pass) {
    console.warn("[email] SMTP_USER or SMTP_PASS not configured — emails disabled");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
}

/**
 * Fire-and-forget safe email send.
 * Callers must `.catch()` on the returned promise.
 * Returns silently (no throw) if SMTP is not configured.
 */
export async function sendStageEmail(opts: SendEmailOpts): Promise<void> {
  const transport = createTransporter();
  if (!transport) return; // misconfigured — skip silently

  const from = `"Binayah Dashboard" <${process.env.SMTP_USER}>`;
  await transport.sendMail({ from, ...opts });
}
