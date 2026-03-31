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

// Cache for AI-generated names (survives for the lifetime of the process)
const nameCache = new Map<string, { displayName: string; shortName: string }>();

/**
 * Use Claude Haiku to generate proper display name + short name for a business.
 * AI handles ALL casing and shortening — no hardcoded rules.
 *
 * Returns { displayName, shortName } where:
 * - displayName: properly cased full name ("IHOP", "Olive Garden", "L&B Spumoni Gardens")
 * - shortName: casual name for emails ("IHOP", "Olive Garden", "L&B")
 */
export async function aiBusinessName(name: string, apiKey: string): Promise<{ displayName: string; shortName: string }> {
  const cached = nameCache.get(name.toLowerCase());
  if (cached) return cached;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: `Given this business name, return two things as JSON: the properly cased display name, and the short casual name you'd use in a friendly email. No explanation, ONLY valid JSON.

Rules:
- Preserve acronyms: IHOP stays IHOP, BLT stays BLT, NYC stays NYC
- Fix bad casing: "OLIVIA TAMPA" → "Olivia", "wagamama us" → "Wagamama"
- Strip location suffixes: "Fushimi Staten Island" → "Fushimi"
- Strip generic suffixes: "Restaurant", "Kitchen", "Hospitality Group", "& Lounge", etc.
- Keep brand names intact: "Olive Garden" stays "Olive Garden", "Dave & Buster's" stays "Dave & Buster's"
- The short name is what you'd say casually: "Hey, have you tried [shortName]?"

Examples:
"MARIO'S PIZZERIA" → {"displayName":"Mario's Pizzeria","shortName":"Mario's"}
"IHOP" → {"displayName":"IHOP","shortName":"IHOP"}
"L&B Spumoni Gardens" → {"displayName":"L&B Spumoni Gardens","shortName":"L&B"}
"wagamama us" → {"displayName":"Wagamama","shortName":"Wagamama"}
"Dave & Buster's" → {"displayName":"Dave & Buster's","shortName":"Dave & Buster's"}
"The Capital Grille" → {"displayName":"The Capital Grille","shortName":"Capital Grille"}
"OLIVIA Tampa" → {"displayName":"Olivia","shortName":"Olivia"}
"Salt Shack On The Bay" → {"displayName":"Salt Shack On The Bay","shortName":"Salt Shack"}
"Pineapple Hospitality Group" → {"displayName":"Pineapple Hospitality Group","shortName":"Pineapple"}
"il a forno a legna" → {"displayName":"Il a Forno a Legna","shortName":"Il Forno"}

"${name}" →`,
      }],
    });

    const raw = (response.content[0]?.type === 'text' ? response.content[0].text : '').trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(jsonStr) as { displayName: string; shortName: string };

    if (parsed.displayName && parsed.shortName && parsed.displayName.length >= 2 && parsed.shortName.length >= 2) {
      nameCache.set(name.toLowerCase(), parsed);
      return parsed;
    }
  } catch {
    // Fall through to raw name
  }

  const fallback = { displayName: name, shortName: name };
  nameCache.set(name.toLowerCase(), fallback);
  return fallback;
}

/**
 * Convenience wrapper that returns just the short name (backward compat).
 */
export async function aiShortName(name: string, apiKey: string): Promise<string> {
  const result = await aiBusinessName(name, apiKey);
  return result.shortName;
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
  // Use stored shortName if available (generated at prospect creation time)
  const storedShortName = (prospect as { shortName?: string | null }).shortName;

  let company: string;
  let shortName: string;

  if (extras.anthropicKey) {
    // AI handles both display name and short name — no hardcoded casing
    const names = await aiBusinessName(prospect.name, extras.anthropicKey);
    company = names.displayName;
    shortName = storedShortName ?? names.shortName;
  } else {
    // No API key — use cached or raw name
    const cached = nameCache.get(prospect.name.toLowerCase());
    company = cached?.displayName ?? prospect.name;
    shortName = storedShortName ?? cached?.shortName ?? prospect.name;
  }

  const city = (prospect.address as Record<string, string> | null)?.['city'] ?? extras.city ?? '';
  return {
    firstName: prospect.contactFirstName ?? 'there',
    lastName: prospect.contactLastName ?? '',
    company,
    shortName,
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
