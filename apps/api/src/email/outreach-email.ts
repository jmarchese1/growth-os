/**
 * Outreach email HTML builder — used for sequences and one-off emails.
 * Follows the same branded template pattern as reward-email.ts.
 */

const FONT_STACKS: Record<string, string> = {
  helvetica: "'Helvetica Neue', Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  verdana: "Verdana, Geneva, sans-serif",
  trebuchet: "'Trebuchet MS', Helvetica, sans-serif",
  courier: "'Courier New', Courier, monospace",
};

interface OutreachEmailParams {
  businessName: string;
  recipientName?: string | undefined;
  subject: string;
  body: string; // HTML body content
  accentColor?: string | undefined;
  logoUrl?: string | undefined;
  fontFamily?: string | undefined;
  ctaText?: string | undefined;
  ctaUrl?: string | undefined;
}

export function buildOutreachHtml(params: OutreachEmailParams): string {
  const accent = params.accentColor || '#7C3AED';
  const fontStack = FONT_STACKS[params.fontFamily || 'helvetica'] || FONT_STACKS['helvetica']!;
  const name = params.recipientName?.split(' ')[0] || '';
  const logo = params.logoUrl;

  // Replace template variables in body
  const body = params.body
    .replace(/\{\{firstName\}\}/g, name || 'there')
    .replace(/\{\{business\}\}/g, params.businessName);

  const ctaBlock = params.ctaText && params.ctaUrl
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${params.ctaUrl}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;font-family:${fontStack};">${params.ctaText}</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:${fontStack};">
  <div style="background:#f4f2ee;padding:40px 20px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6;">

      <!-- Header -->
      <div style="background:${accent};padding:24px 36px;text-align:left;">
        ${logo
          ? `<img src="${logo}" width="36" height="36" alt="${params.businessName}" style="display:inline-block;vertical-align:middle;margin-right:10px;border-radius:8px;" />`
          : ''
        }
        <span style="color:#fff;font-size:18px;font-weight:700;font-family:${fontStack};letter-spacing:-0.3px;vertical-align:middle;">${params.businessName}</span>
      </div>

      <!-- Body -->
      <div style="padding:36px 36px 28px;">
        <div style="font-size:15px;color:#333;line-height:1.7;font-family:${fontStack};">
          ${body}
        </div>
        ${ctaBlock}
      </div>

      <!-- Footer -->
      <div style="background:#f9f8f6;padding:20px 36px;border-top:1px solid #f0ede8;">
        <p style="font-size:12px;color:#aaa;margin:0;">&copy; ${new Date().getFullYear()} ${params.businessName} &middot; Powered by Embedo</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build a plain preview HTML (for iframe rendering) with no wrapping email chrome.
 */
export function buildOutreachPreview(params: OutreachEmailParams): string {
  return buildOutreachHtml(params);
}
