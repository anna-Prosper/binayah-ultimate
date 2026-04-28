/**
 * Shared mention parsing and notification helpers.
 * Used by both the chat messages route and the stage comments route.
 */
import { USERS_DEFAULT } from "@/lib/data";
import { getEmailForUser } from "@/lib/auth";
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
 * Fire-and-forget email notification to all mentioned users (excluding sender).
 * Call without await — errors are swallowed.
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
  const html = `<div style="font-family:system-ui,sans-serif;color:#222;max-width:520px;margin:0 auto;padding:24px;">
    <div style="font-size:12px;color:#999;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">// Binayah Dashboard</div>
    <h2 style="margin:0 0 16px;font-size:18px;">${escapeHtml(senderName)} mentioned you ${contextLine}</h2>
    <blockquote style="margin:0;padding:14px 18px;background:#f5f5f5;border-left:3px solid #bf5af2;border-radius:6px;font-size:14px;line-height:1.5;color:#333;">${safeText}</blockquote>
    <p style="margin-top:24px;"><a href="${APP_URL}" style="display:inline-block;background:#bf5af2;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">${linkLabel}</a></p>
    <p style="margin-top:24px;font-size:11px;color:#999;">You're receiving this because you were mentioned.</p>
  </div>`;

  const subject = context === "comment" && stageName
    ? `${senderName} mentioned you in a comment on "${stageName}"`
    : `${senderName} mentioned you in chat`;

  await Promise.allSettled(
    mentioned.filter(id => id !== senderUserId).map(uid => {
      const to = getEmailForUser(uid);
      if (!to) return Promise.resolve();
      return sendStageEmail({ to, subject, html }).catch(e => {
        console.warn(`[mention] failed to email ${uid}:`, e);
      });
    })
  );
}
