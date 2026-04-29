// Email templates — inline styles only (email clients strip <style> and CSS vars).
// Brand palette hardcoded as hex. All user-supplied strings pass through escHtml.

const BG = "#0a0118";
const TEXT = "#f0e0ff";
const TEXT_DIM = "#9870c0";
const ACCENT = "#ff0080";
const ACCENT2 = "#00ffff";
const BORDER = "#3d1668";
const GREEN = "#39ff14";
const AMBER = "#fff200";

function baseLayout(bodyContent: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Binayah Dashboard</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="background:${ACCENT};padding:12px 24px;border-radius:8px 8px 0 0;">
              <span style="color:${BG};font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                binayah dashboard
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:${BG};border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;padding:28px 24px;">
              ${bodyContent}
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;border-top:1px solid ${BORDER};">
                <tr>
                  <td style="padding-top:16px;">
                    <a href="${unsubscribeUrl}"
                       style="font-family:'Courier New',Courier,monospace;font-size:10px;color:${TEXT_DIM};text-decoration:underline;">
                      manage notifications
                    </a>
                    <span style="font-family:'Courier New',Courier,monospace;font-size:10px;color:${TEXT_DIM};margin-left:8px;">
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
      <td style="background:${color};border-radius:6px;padding:10px 22px;">
        <a href="${url}" style="font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;color:${BG};text-decoration:none;letter-spacing:1px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function stageUrl(appUrl: string, pipelineName: string, stageName: string): string {
  return `${appUrl}/?pipeline=${encodeURIComponent(pipelineName)}&stage=${encodeURIComponent(stageName)}`;
}

interface BaseOpts {
  stageName: string;
  pipelineName: string;
  actorName: string;
  appUrl: string;
  unsubscribeUrl: string;
}

export function claimEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const body = `
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT_DIM};margin:0 0 6px 0;">
      <span style="color:${TEXT_DIM}">//</span><span style="color:${ACCENT};font-weight:700;"> stage claimed</span>
    </p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:${TEXT};margin:0 0 4px 0;word-break:break-word;">${escHtml(opts.stageName)}</p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${TEXT_DIM};margin:0 0 20px 0;">pipeline: <span style="color:${TEXT}">${escHtml(opts.pipelineName)}</span></p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT};margin:0 0 24px 0;"><span style="color:${TEXT_DIM}">// </span>${escHtml(opts.actorName)} claimed this stage.<br/><span style="color:${TEXT_DIM}">// </span>you&rsquo;re on this. make it count.</p>
    ${ctaLink(stageUrl(opts.appUrl, opts.pipelineName, opts.stageName), "view stage &rarr;")}
  `;
  return {
    subject: `[Binayah Dashboard] ${opts.stageName} is claimed by ${opts.actorName}`,
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

interface ActiveOpts extends BaseOpts { points: number; }
export function activeEmailTemplate(opts: ActiveOpts): { subject: string; html: string } {
  const body = `
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT_DIM};margin:0 0 6px 0;">
      <span style="color:${TEXT_DIM}">//</span><span style="color:${GREEN};font-weight:700;"> stage is live</span>
    </p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:${TEXT};margin:0 0 4px 0;word-break:break-word;">${escHtml(opts.stageName)}<span style="font-size:18px;"> &rarr; active</span></p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${TEXT_DIM};margin:0 0 20px 0;">pipeline: <span style="color:${TEXT}">${escHtml(opts.pipelineName)}</span></p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:900;color:${GREEN};margin:0 0 8px 0;">+${opts.points} pts earned</p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT};margin:0 0 24px 0;"><span style="color:${TEXT_DIM}">// </span>${escHtml(opts.actorName)} shipped it.</p>
    ${ctaLink(stageUrl(opts.appUrl, opts.pipelineName, opts.stageName), "see it live &rarr;", GREEN)}
  `;
  return {
    subject: `[Binayah Dashboard] ${opts.stageName} is now live`,
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

interface ApprovedOpts extends BaseOpts { points: number; }
export function approvedEmailTemplate(opts: ApprovedOpts): { subject: string; html: string } {
  const body = `
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT_DIM};margin:0 0 6px 0;">
      <span style="color:${TEXT_DIM}">//</span><span style="color:${GREEN};font-weight:700;"> approved</span>
    </p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:${TEXT};margin:0 0 4px 0;word-break:break-word;">${escHtml(opts.stageName)}</p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${TEXT_DIM};margin:0 0 20px 0;">pipeline: <span style="color:${TEXT}">${escHtml(opts.pipelineName)}</span></p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:900;color:${GREEN};margin:0 0 8px 0;">+${opts.points} pts confirmed</p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT};margin:0 0 24px 0;"><span style="color:${TEXT_DIM}">// </span>${escHtml(opts.actorName)} approved your work. points are yours.</p>
    ${ctaLink(stageUrl(opts.appUrl, opts.pipelineName, opts.stageName), "view stage &rarr;", GREEN)}
  `;
  return {
    subject: `[Binayah Dashboard] ${opts.stageName} approved (+${opts.points}pts)`,
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

export function assignedEmailTemplate(opts: BaseOpts): { subject: string; html: string } {
  const body = `
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT_DIM};margin:0 0 6px 0;">
      <span style="color:${TEXT_DIM}">//</span><span style="color:${ACCENT2};font-weight:700;"> assigned to you</span>
    </p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:${TEXT};margin:0 0 4px 0;word-break:break-word;">${escHtml(opts.stageName)}</p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${TEXT_DIM};margin:0 0 20px 0;">pipeline: <span style="color:${TEXT}">${escHtml(opts.pipelineName)}</span></p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT};margin:0 0 24px 0;"><span style="color:${TEXT_DIM}">// </span>${escHtml(opts.actorName)} assigned this to you.</p>
    ${ctaLink(stageUrl(opts.appUrl, opts.pipelineName, opts.stageName), "view stage &rarr;", ACCENT2)}
  `;
  return {
    subject: `[Binayah Dashboard] you were assigned: ${opts.stageName}`,
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
        <td style="border-bottom:1px solid ${BORDER};padding:10px 0;">
          <p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:${lineColor};margin:0;line-height:1.4;">
            <span style="color:${TEXT_DIM}">// </span>${escHtml(r.detail)}
          </p>
          <p style="font-family:'Courier New',Courier,monospace;font-size:10px;color:${TEXT_DIM};margin:2px 0 0 0;">
            ${escHtml(r.workspaceName)} · ${escHtml(r.pipelineName)}${r.points ? ` · +${r.points}pts` : ""}
          </p>
        </td>
      </tr>`;
  }).join("");

  const body = `
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT_DIM};margin:0 0 6px 0;">
      <span style="color:${TEXT_DIM}">//</span><span style="color:${ACCENT};font-weight:700;"> daily digest</span>
    </p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;color:${TEXT};margin:0 0 4px 0;">${escHtml(dateStr)}</p>
    <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${TEXT_DIM};margin:0 0 20px 0;">${opts.rows.length} event${opts.rows.length === 1 ? "" : "s"} since yesterday</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">${rowsHtml}</table>
    ${ctaLink(opts.appUrl, "open dashboard &rarr;")}
  `;
  return {
    subject: `[Binayah Dashboard] daily digest — ${opts.rows.length} update${opts.rows.length === 1 ? "" : "s"}`,
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
