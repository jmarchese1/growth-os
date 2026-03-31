export const DEFAULT_EMAIL_SUBJECT = `quick question about {{company}}`;

// Plain text body. Signature + unsubscribe appended at send time.
export const DEFAULT_EMAIL_BODY = `Hey {{firstName}},

My name is Jason. I am a data scientist and have been building a tool on the side that helps restaurants handle phone calls and website inquiries automatically when the team is too busy to pick up. Thought it might be useful for {{shortName}}.

Basically when a customer calls and no one can answer, the system picks up, takes orders, books reservations, and answers questions about the menu. It sounds like a real person, not a robot. I also built a chatbot that does the same thing for people visiting your website.

Would love to set one up for {{shortName}} for free if you are open to seeing how it works. No strings attached.

Best,
Jason`;

// Legacy HTML default kept for old campaigns — new ones use DEFAULT_EMAIL_BODY
export const DEFAULT_EMAIL_BODY_HTML = DEFAULT_EMAIL_BODY;

const SIGNATURE_HTML = `<table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0"><tr><td style="padding-right: 12px; vertical-align: middle; width: 56px;"><img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" /></td><td style="vertical-align: middle;"><p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p><p style="margin: 2px 0 0; font-size: 13px; color: #666;">Founder · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p></td></tr></table>`;

function buildUnsubscribe(replyEmail: string): string {
  return `<p style="margin-top: 32px; font-size: 11px; color: #bbb;">Not interested? <a href="mailto:${replyEmail}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a></p>`;
}

/** Convert a business name to Title Case (handles ALL CAPS gracefully) */
function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map((w) => {
      // Preserve known short acronyms (2-3 chars, all letters)
      if (w.length <= 3 && /^[A-Z]+$/.test(w)) return w;
      // If word is all caps and longer than 3 chars, title case it
      // "OLIVIA" → "Olivia", "MARKET" → "Market"
      if (w === w.toUpperCase() && w.length > 3) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }
      // Mixed case words stay as-is (already properly cased)
      return w;
    })
    .join(' ');
}

/**
 * Extract the short/casual name from a business name.
 * "Mario's Pizzeria" → "Mario's"
 * "Golden Dragon Kitchen" → "Golden Dragon"
 * "Shake Shack" → "Shake Shack" (no suffix to strip)
 */
// Business/city suffix lists kept for reference but no longer used in code
// AI short name generation (aiShortName) handles all cases now

// Cache for AI-generated short names (survives for the lifetime of the process)
const shortNameCache = new Map<string, string>();

/**
 * Use Claude Haiku to generate a natural short name for a business.
 * Falls back to title-cased full name if AI is unavailable.
 */
export async function aiShortName(name: string, apiKey: string): Promise<string> {
  const titleCased = toTitleCase(name);
  if (titleCased.split(/\s+/).length <= 1) return titleCased;

  // Check cache
  const cached = shortNameCache.get(name.toLowerCase());
  if (cached) return cached;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Given this business name, return ONLY the short casual name you'd use in conversation. No quotes, no explanation, just the name.

Examples:
"Mario's Pizzeria" → Mario's
"wagamama us" → Wagamama
"Legacy Hospitality Companies" → Legacy
"Golden Dragon Kitchen" → Golden Dragon
"Shake Shack" → Shake Shack
"BLT Restaurant Group" → BLT
"OLIVIA Tampa" → Olivia
"Salt Shack On The Bay" → Salt Shack
"The Capital Grille" → Capital Grille
"Pineapple Hospitality Group" → Pineapple

"${titleCased}" →`,
      }],
    });

    const result = (response.content[0]?.type === 'text' ? response.content[0].text : '').trim().replace(/^["']|["']$/g, '');
    const shortName = result.length >= 2 && result.length <= titleCased.length ? result : titleCased;

    shortNameCache.set(name.toLowerCase(), shortName);
    return shortName;
  } catch {
    return titleCased;
  }
}

// Sync fallback for when AI is not available (used in non-async contexts)
function toShortNameSync(name: string): string {
  const titleCased = toTitleCase(name);
  const cached = shortNameCache.get(name.toLowerCase());
  if (cached) return cached;
  return titleCased;
}

/**
 * Build the full variable map from prospect data.
 * Variables: {{firstName}}, {{lastName}}, {{company}}, {{city}}, {{calLink}}, {{replyEmail}}, {{businessName}} (alias)
 */
export async function buildTemplateVars(prospect: {
  name: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  address?: unknown;
}, extras: { city?: string; calLink?: string; replyEmail?: string; anthropicKey?: string | undefined }): Promise<Record<string, string>> {
  const company = toTitleCase(prospect.name);
  // Use stored shortName if available (generated at prospect creation time)
  // Fall back to AI generation or sync fallback
  const shortName = (prospect as { shortName?: string | null }).shortName
    ?? (extras.anthropicKey ? await aiShortName(prospect.name, extras.anthropicKey) : toShortNameSync(prospect.name));
  const city = (prospect.address as Record<string, string> | null)?.['city'] ?? extras.city ?? '';
  return {
    firstName: prospect.contactFirstName ?? 'there',
    lastName: prospect.contactLastName ?? '',
    company,
    shortName,              // casual name: "Mario's" instead of "Mario's Pizzeria"
    businessName: company,  // backward compat
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
