/**
 * Shared mention parsing and notification helpers.
 * Used by both the chat messages route and the stage comments route.
 */
import { USERS_DEFAULT } from "@/lib/data";
import { getEmailsForUser } from "@/lib/auth";
import { sendStageEmail } from "@/lib/email";

/** Resolve @handles in text → array of user IDs. */
export function parseMentions(text: string): string[] {
  // Matches @word — alphanumeric, dash, underscore. Case-insensitive.
  const matches = text.match(/@([a-z0-9_-]+)/gi) || [];
  const ids = new Set<string>();
  for (const m of matches) {
    const handle = m.slice(1).toLowerCase();
    const user = USERS_DEFAULT.find(
      u => u.id === handle || u.name.toLowerCase() === handle || u.name.split(" ")[0].toLowerCase() === handle
    );
    if (user) ids.add(user.id);
  }
  return Array.from(ids);
}

const APP_URL = process.env.NEXTAUTH_URL || "https://dashboard.binayahhub.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Fire-and-forget email notification to all mentioned users.
 * Explicit self-mentions are delivered too; ordinary self-actions are filtered
 * by the routed notification layer instead.
 */
export async function notifyMentions(
  text: string,
  senderUserId: string,
  context: "chat" | "comment" = "chat",
  stageName?: string,
) {
  const mentioned = parseMentions(text);
  if (mentioned.length === 0) return;
  const sender = USERS_DEFAULT.find(u => u.id === senderUserId);
  const senderName = sender?.name || senderUserId;
  const safeText = escapeHtml(text).slice(0, 600);
  const contextLine = context === "comment" && stageName
    ? `in a comment on <strong>${escapeHtml(stageName)}</strong>`
    : "in the team chat";
  const linkLabel = context === "comment" ? "Open dashboard →" : "Open chat →";
  const html = `<!DOCTYPE html>
  <html lang="en">
  <body style="margin:0;padding:0;background:#f6f3fb;font-family:Arial,Helvetica,sans-serif;color:#211236;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f3fb;min-height:100vh;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr><td style="padding:0 4px 14px;font-size:13px;font-weight:800;color:#c00072;letter-spacing:.08em;text-transform:uppercase;">Binayah Ultimate</td></tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #eadff4;border-radius:18px;padding:30px 28px;box-shadow:0 18px 45px rgba(50,30,70,0.08);">
                <p style="font-size:12px;color:#b45309;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px 0;">You were mentioned</p>
                <h1 style="font-size:24px;line-height:1.22;color:#211236;font-weight:800;margin:0 0 16px 0;">${escapeHtml(senderName)} mentioned you</h1>
                <p style="font-size:15px;line-height:1.6;color:#6f5b86;margin:0 0 12px 0;">${contextLine}</p>
                <div style="margin:0 0 24px;padding:14px 16px;background:#faf7ff;border:1px solid #eadff4;border-left:4px solid #b45309;border-radius:12px;font-size:14px;color:#211236;line-height:1.55;">${safeText}</div>
                <table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#b45309;border-radius:10px;padding:12px 20px;"><a href="${APP_URL}" style="font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">${linkLabel}</a></td></tr></table>
                <p style="margin:30px 0 0;padding-top:16px;border-top:1px solid #eadff4;font-size:12px;color:#9a8aaa;">You're receiving this because you were mentioned.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const subject = context === "comment" && stageName
    ? `${senderName} mentioned you in a comment on "${stageName}"`
    : `${senderName} mentioned you in chat`;

  await Promise.allSettled(
    mentioned.flatMap(uid => {
      const emails = getEmailsForUser(uid);
      return emails.map(to =>
        sendStageEmail({ to, subject, html }).catch(e => {
          console.warn(`[mention] failed to email ${uid} at ${to}:`, e);
        })
      );
    })
  );
}
