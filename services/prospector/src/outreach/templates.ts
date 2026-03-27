export const DEFAULT_EMAIL_SUBJECT = `quick question about {{company}}`;

// Plain text body — no HTML. Signature + unsubscribe appended at send time.
export const DEFAULT_EMAIL_BODY = `Hey {{firstName}},

I run an AI automation agency built specifically for restaurants. We build three things for our clients: a custom AI phone receptionist, a custom AI chatbot and a professional website.

Here is how it works. When a customer calls and you are busy or closed, the call automatically routes to your AI phone agent. It answers questions, takes orders and books reservations just like a real staff member would. On top of that, we embed an AI chatbot into your website that does the same thing for online visitors.

I would love to jump on a quick call and demo what this would look like for {{company}}. No pressure, just want to show you what is possible.`;

// Legacy HTML default kept for old campaigns — new ones use DEFAULT_EMAIL_BODY
export const DEFAULT_EMAIL_BODY_HTML = DEFAULT_EMAIL_BODY;

const SIGNATURE_HTML = `<table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0"><tr><td style="padding-right: 12px; vertical-align: middle; width: 56px;"><img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" /></td><td style="vertical-align: middle;"><p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p><p style="margin: 2px 0 0; font-size: 13px; color: #666;">Founder · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p></td></tr></table>`;

function buildUnsubscribe(replyEmail: string): string {
  return `<p style="margin-top: 32px; font-size: 11px; color: #bbb;">Not interested? <a href="mailto:${replyEmail}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a></p>`;
}

/** Convert a business name to Title Case */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Build the full variable map from prospect data.
 * Variables: {{firstName}}, {{lastName}}, {{company}}, {{city}}, {{calLink}}, {{replyEmail}}, {{businessName}} (alias)
 */
export function buildTemplateVars(prospect: {
  name: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  address?: unknown;
}, extras: { city?: string; calLink?: string; replyEmail?: string }): Record<string, string> {
  const company = toTitleCase(prospect.name);
  const city = (prospect.address as Record<string, string> | null)?.['city'] ?? extras.city ?? '';
  return {
    firstName: prospect.contactFirstName ?? 'there',
    lastName: prospect.contactLastName ?? '',
    company,
    businessName: company, // backward compat
    city,
    calLink: extras.calLink ?? '',
    replyEmail: extras.replyEmail ?? '',
  };
}

/**
 * Render an email template — substitutes {{variables}} and wraps plain text in HTML.
 * If the template is already HTML (contains tags), just does variable substitution.
 * If it's plain text, converts to styled HTML paragraphs.
 */
export function renderEmailHtml(
  template: string,
  vars: Record<string, string>,
  options?: { appendSignature?: boolean; replyEmail?: string },
): string {
  // Substitute variables
  let content = Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template,
  );

  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (!isHtml) {
    // Plain text → convert to HTML paragraphs
    const paragraphs = content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p style="margin: 0 0 16px; color: #222;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n  ');

    const sig = options?.appendSignature !== false ? SIGNATURE_HTML : '';
    const unsub = options?.replyEmail ? buildUnsubscribe(options.replyEmail) : (vars['replyEmail'] ? buildUnsubscribe(vars['replyEmail']) : '');

    content = `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; color: #222; line-height: 1.7; font-size: 14px;">
  ${paragraphs}
  ${sig}
  ${unsub}
</div>`;
  }

  return content;
}
