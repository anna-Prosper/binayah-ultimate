// Email templates — inline styles only (email clients strip <style> and CSS vars).
// Brand palette hardcoded as hex. All user-supplied strings pass through escHtml.
import { cleanHumanText, compactSubject, humanList, quoteText } from "@/lib/notificationFormat";

const PAGE_BG = "#f6f3fb";
const CARD_BG = "#ffffff";
const SOFT_BG = "#faf7ff";
const TEXT = "#211236";
const TEXT_MUTED = "#6f5b86";
const TEXT_DIM = "#9a8aaa";
const ACCENT = "#c00072";
const ACCENT2 = "#2563eb";
const BORDER = "#eadff4";
const GREEN = "#17803d";
const AMBER = "#b45309";

function cleanLabel(input?: string): string {
  return cleanHumanText(input);
}

function baseLayout(bodyContent: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Binayah Dashboard</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG};min-height:100vh;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 4px 14px;">
              <span style="font-size:13px;font-weight:800;color:${ACCENT};letter-spacing:.08em;text-transform:uppercase;">
                Binayah Ultimate
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:18px;padding:30px 28px;box-shadow:0 18px 45px rgba(50,30,70,0.08);">
              ${bodyContent}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;border-top:1px solid ${BORDER};">
                <tr>
                  <td style="padding-top:16px;">
                    <a href="${unsubscribeUrl}"
                       style="font-size:12px;color:${TEXT_MUTED};text-decoration:underline;">
                      manage notifications
                    </a>
                    <span style="font-size:12px;color:${TEXT_DIM};margin-left:8px;">
                      &middot; binayah ultimate
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaLink(url: string, label: string, color: string = ACCENT): string {
  return `<table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:${color};border-radius:10px;padding:12px 20px;">
        <a href="${url}" style="font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function stageUrl(appUrl: string, pipelineName: string, stageName: string): string {
  return `${appUrl}/?pipeline=${encodeURIComponent(pipelineName)}&stage=${encodeURIComponent(stageName)}`;
}

function eyebrow(label: string, color: string = ACCENT): string {
  return `<p style="font-size:12px;color:${color};font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px 0;">${label}</p>`;
}

function title(text: string): string {
  return `<h1 style="font-size:24px;line-height:1.22;color:${TEXT};font-weight:800;margin:0 0 6px 0;word-break:break-word;">${escHtml(cleanLabel(text))}</h1>`;
}

function meta(pipelineName: string): string {
  const pipeline = cleanLabel(pipelineName);
  return pipeline ? `<p style="font-size:13px;color:${TEXT_MUTED};margin:0 0 22px 0;">Pipeline: <strong style="color:${TEXT};">${escHtml(pipeline)}</strong></p>` : "";
}

function paragraph(text: string): string {
  return `<p style="font-size:15px;line-height:1.6;color:${TEXT_MUTED};margin:0 0 24px 0;">${text}</p>`;
}

function quote(text: string, color: string = ACCENT): string {
  return `<div style="margin:0 0 24px;padding:14px 16px;background:${SOFT_BG};border:1px solid ${BORDER};border-left:4px solid ${color};border-radius:12px;font-size:14px;color:${TEXT};line-height:1.55;">${text}</div>`;
}

interface BaseOpts {
  stageName: string;
  urlStageName?: string;
  pipelineName: string;
  actorName: string;
  appUrl: string;
  unsubscribeUrl: string;
  detail?: string;
  commentText?: string;
}

function taskUrl(opts: BaseOpts): string {
  return stageUrl(opts.appUrl, opts.pipelineName, opts.urlStageName || opts.stageName);
}

export function claimEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const body = `
    ${eyebrow("Stage claimed")}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> claimed this stage.`)}
    ${ctaLink(taskUrl(opts), "View stage")}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] ${stageName} is claimed by ${actorName}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

interface ActiveOpts extends BaseOpts { points: number; }
export function activeEmailTemplate(opts: ActiveOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const body = `
    ${eyebrow("Stage is live", GREEN)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    <p style="font-size:22px;font-weight:900;color:${GREEN};margin:0 0 8px 0;">+${opts.points} points earned</p>
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> moved this work to live.`)}
    ${ctaLink(taskUrl(opts), "Open dashboard", GREEN)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] ${stageName} is now live`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

interface ApprovedOpts extends BaseOpts { points: number; }
export function approvedEmailTemplate(opts: ApprovedOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const body = `
    ${eyebrow("Approved", GREEN)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    <p style="font-size:22px;font-weight:900;color:${GREEN};margin:0 0 8px 0;">+${opts.points} points confirmed</p>
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> approved this work.`)}
    ${ctaLink(taskUrl(opts), "View stage", GREEN)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] ${stageName} approved (+${opts.points}pts)`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

interface SubtaskApprovedOpts extends BaseOpts {
  detail?: string;
  points?: number;
}
export function subtaskApprovedEmailTemplate(opts: SubtaskApprovedOpts): { subject: string; html: string } {
  const readableTitle = cleanLabel(opts.detail?.replace(/^subtask\s+/i, "") || opts.stageName);
  const pipelineName = cleanLabel(opts.pipelineName);
  const actorName = cleanLabel(opts.actorName);
  const body = `
    ${eyebrow("Subtask approved", GREEN)}
    ${title(readableTitle)}
    ${meta(pipelineName)}
    ${opts.points ? `<p style="font-size:22px;font-weight:900;color:${GREEN};margin:0 0 8px 0;">+${opts.points} points earned</p>` : ""}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> approved this subtask.`)}
    ${ctaLink(taskUrl(opts), "Open dashboard", GREEN)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] subtask approved in ${pipelineName}${opts.points ? ` (+${opts.points}pts)` : ""}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

interface PipelineCompletedOpts {
  pipelineName: string;
  bonusPoints: number;
  appUrl: string;
  unsubscribeUrl: string;
}
export function pipelineCompletedEmailTemplate(opts: PipelineCompletedOpts): { subject: string; html: string } {
  const pipelineName = cleanLabel(opts.pipelineName);
  const body = `
    ${eyebrow("Pipeline complete", ACCENT2)}
    ${title(pipelineName)}
    <p style="font-size:22px;font-weight:900;color:${ACCENT2};margin:0 0 12px 0;">+${opts.bonusPoints} bonus points shared</p>
    ${paragraph("Every stage in this pipeline has been approved. The completion bonus is split among the owners.")}
    ${ctaLink(opts.appUrl, "Open dashboard", ACCENT2)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] ${pipelineName} complete (+${opts.bonusPoints}pts bonus)`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

export function assignedEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const body = `
    ${eyebrow("Assigned to you", ACCENT2)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> assigned this task to you. It is now on your board and will count as your work until it is reassigned or completed.`)}
    ${opts.detail ? quote(escHtml(opts.detail), ACCENT2) : ""}
    ${ctaLink(taskUrl(opts), "View assignment", ACCENT2)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] assigned to you: ${stageName}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

export function bugEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const body = `
    ${eyebrow("Bug assigned", AMBER)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> assigned this bug/test item to you.`)}
    ${opts.detail ? quote(escHtml(opts.detail), AMBER) : ""}
    ${ctaLink(`${opts.appUrl}/bugs`, "Open bug tracker", AMBER)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] bug assigned: ${stageName}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

export function commentEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const text = escHtml(quoteText(opts.commentText || opts.detail || "New comment"));
  const body = `
    ${eyebrow("New comment", ACCENT)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> commented on a task you own.`)}
    ${quote(text, ACCENT)}
    ${ctaLink(taskUrl(opts), "Open task")}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] new comment on ${stageName}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

export function statusEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const detail = escHtml(quoteText(opts.detail || "Status changed"));
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const isBlocked = /blocked/i.test(detail);
  const color = isBlocked ? AMBER : ACCENT2;
  const body = `
    ${eyebrow(isBlocked ? "Task blocked" : "Task updated", color)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> updated a task you own.`)}
    ${quote(detail, color)}
    ${ctaLink(taskUrl(opts), "Review update", color)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] ${stageName} updated`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

export function messageEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const text = escHtml(quoteText(opts.commentText || opts.detail || "New message"));
  const body = `
    ${eyebrow("New message", ACCENT2)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> sent you a message.`)}
    ${quote(text, ACCENT2)}
    ${ctaLink(`${opts.appUrl}/chat`, "Open chat", ACCENT2)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] new message from ${actorName}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}


interface MentionOpts extends BaseOpts {
  commentText: string;
}
export function mentionEmailTemplate(opts: MentionOpts): { subject: string; html: string } {
  const stageName = cleanLabel(opts.stageName);
  const actorName = cleanLabel(opts.actorName);
  const safeText = escHtml(quoteText(opts.commentText, 400));
  const body = `
    ${eyebrow("You were mentioned", AMBER)}
    ${title(stageName)}
    ${meta(opts.pipelineName)}
    ${paragraph(`<strong style="color:${TEXT};">${escHtml(actorName)}</strong> mentioned you:`)}
    ${quote(safeText, AMBER)}
    ${ctaLink(taskUrl(opts), "Reply in dashboard", AMBER)}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] ${actorName} mentioned you in ${stageName}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

interface DigestRow {
  eventType: string;
  detail: string;
  stageName: string;
  pipelineName: string;
  workspaceName: string;
  actorName: string;
  points?: number;
}
interface DigestOpts {
  rows: DigestRow[];
  appUrl: string;
  unsubscribeUrl: string;
}
export function digestEmailTemplate(opts: DigestOpts): { subject: string; html: string } {
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const rowsHtml = opts.rows.map(r => {
    const lineColor = r.eventType === "approved" ? GREEN : r.eventType === "blocked" ? AMBER : TEXT;
    return `
      <tr>
        <td style="border-bottom:1px solid ${BORDER};padding:12px 0;">
          <p style="font-size:14px;color:${lineColor};margin:0;line-height:1.45;">
            ${escHtml(cleanLabel(r.detail))}
          </p>
          <p style="font-size:12px;color:${TEXT_DIM};margin:4px 0 0 0;">
            ${escHtml(humanList([r.workspaceName, r.pipelineName, r.points ? `+${r.points}pts` : ""]))}
          </p>
        </td>
      </tr>`;
  }).join("");

  const body = `
    ${eyebrow("Daily digest")}
    <h1 style="font-size:22px;line-height:1.25;color:${TEXT};font-weight:800;margin:0 0 4px 0;">${escHtml(dateStr)}</h1>
    <p style="font-size:13px;color:${TEXT_MUTED};margin:0 0 20px 0;">${opts.rows.length} update${opts.rows.length === 1 ? "" : "s"} since yesterday</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">${rowsHtml}</table>
    ${ctaLink(opts.appUrl, "Open dashboard")}
  `;
  return {
    subject: compactSubject(`[Binayah Dashboard] daily digest — ${opts.rows.length} update${opts.rows.length === 1 ? "" : "s"}`),
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

function escHtml(s: string): string {
  return cleanLabel(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
