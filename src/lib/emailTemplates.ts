// Email templates — inline styles only (email clients strip <style> and CSS vars).
// Brand palette hardcoded as hex.

const BG = "#08050f";
const TEXT = "#f0ecff";
const TEXT_DIM = "#9b92b8";
const ACCENT = "#bf5af2";
const BORDER = "#2a1f3d";
const GREEN = "#30d158";

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

          <!-- Header bar -->
          <tr>
            <td style="background:${ACCENT};padding:12px 24px;border-radius:8px 8px 0 0;">
              <span style="color:${BG};font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                binayah dashboard
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:${BG};border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;padding:28px 24px;">
              ${bodyContent}

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;border-top:1px solid ${BORDER};">
                <tr>
                  <td style="padding-top:16px;">
                    <a href="${unsubscribeUrl}"
                       style="font-family:'Courier New',Courier,monospace;font-size:10px;color:${TEXT_DIM};text-decoration:underline;">
                      unsubscribe from these notifications
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

export interface ClaimTemplateOpts {
  stageName: string;
  pipelineName: string;
  actorName: string;
  appUrl: string;
  unsubscribeUrl: string;
}

export function claimEmailTemplate(opts: ClaimTemplateOpts): { subject: string; html: string } {
  const ctaUrl = `${opts.appUrl}/?pipeline=${encodeURIComponent(opts.pipelineName)}&stage=${encodeURIComponent(opts.stageName)}`;

  const body = `
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT_DIM};margin:0 0 6px 0;">
      <span style="color:${TEXT_DIM}">//</span>
      <span style="color:${ACCENT};font-weight:700;"> stage claimed</span>
    </p>

    <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:${TEXT};margin:0 0 4px 0;word-break:break-word;">
      ${escHtml(opts.stageName)}
    </p>

    <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${TEXT_DIM};margin:0 0 20px 0;">
      pipeline: <span style="color:${TEXT}">${escHtml(opts.pipelineName)}</span>
    </p>

    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT};margin:0 0 24px 0;">
      <span style="color:${TEXT_DIM}">// </span>${escHtml(opts.actorName)} claimed this stage.
      <br/>
      <span style="color:${TEXT_DIM}">// </span>you&rsquo;re on this. make it count.
    </p>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:${ACCENT};border-radius:6px;padding:10px 22px;">
          <a href="${ctaUrl}"
             style="font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;color:${BG};text-decoration:none;letter-spacing:1px;">
            view stage &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `[Binayah Dashboard] ${opts.stageName} is claimed by ${opts.actorName}`,
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

export interface ActiveTemplateOpts {
  stageName: string;
  pipelineName: string;
  actorName: string;
  points: number;
  appUrl: string;
  unsubscribeUrl: string;
}

export function activeEmailTemplate(opts: ActiveTemplateOpts): { subject: string; html: string } {
  const ctaUrl = `${opts.appUrl}/?pipeline=${encodeURIComponent(opts.pipelineName)}&stage=${encodeURIComponent(opts.stageName)}`;

  const body = `
    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT_DIM};margin:0 0 6px 0;">
      <span style="color:${TEXT_DIM}">//</span>
      <span style="color:${GREEN};font-weight:700;"> stage is live</span>
    </p>

    <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:${TEXT};margin:0 0 4px 0;word-break:break-word;">
      ${escHtml(opts.stageName)}
      <span style="font-size:18px;"> &rarr; active</span>
    </p>

    <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${TEXT_DIM};margin:0 0 20px 0;">
      pipeline: <span style="color:${TEXT}">${escHtml(opts.pipelineName)}</span>
    </p>

    <p style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:900;color:${GREEN};margin:0 0 8px 0;">
      +${opts.points} pts earned
    </p>

    <p style="font-family:'Courier New',Courier,monospace;font-size:13px;color:${TEXT};margin:0 0 24px 0;">
      <span style="color:${TEXT_DIM}">// </span>${escHtml(opts.actorName)} shipped it.
    </p>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:${GREEN};border-radius:6px;padding:10px 22px;">
          <a href="${ctaUrl}"
             style="font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:700;color:${BG};text-decoration:none;letter-spacing:1px;">
            see it live &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `[Binayah Dashboard] ${opts.stageName} is now live`,
    html: baseLayout(body, opts.unsubscribeUrl),
  };
}

/** Minimal HTML-escape for user-supplied strings in email bodies */
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
