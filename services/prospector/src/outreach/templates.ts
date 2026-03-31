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
const nameCache = new Map<string, { displayName: string; shortName: string; type: string }>();

/**
 * Map Geoapify categories to human-readable business type.
 * Returns null if category is too generic to be useful.
 */
export function typeFromCategories(categories: string[]): string | null {
  // Find the most specific restaurant subcategory
  const sub = categories
    .filter(c => c.startsWith('catering.'))
    .sort((a, b) => b.split('.').length - a.split('.').length)[0];

  if (!sub) return null;

  const map: Record<string, string> = {
    'catering.restaurant.pizza': 'pizzeria',
    'catering.restaurant.italian': 'Italian restaurant',
    'catering.restaurant.chinese': 'Chinese restaurant',
    'catering.restaurant.japanese': 'Japanese restaurant',
    'catering.restaurant.sushi': 'sushi bar',
    'catering.restaurant.thai': 'Thai restaurant',
    'catering.restaurant.indian': 'Indian restaurant',
    'catering.restaurant.mexican': 'Mexican restaurant',
    'catering.restaurant.burger': 'burger spot',
    'catering.restaurant.steak': 'steakhouse',
    'catering.restaurant.seafood': 'seafood restaurant',
    'catering.restaurant.barbecue': 'BBQ spot',
    'catering.restaurant.vietnamese': 'Vietnamese restaurant',
    'catering.restaurant.korean': 'Korean restaurant',
    'catering.restaurant.greek': 'Greek restaurant',
    'catering.restaurant.french': 'French restaurant',
    'catering.restaurant.mediterranean': 'Mediterranean restaurant',
    'catering.restaurant.american': 'American restaurant',
    'catering.restaurant.noodle': 'noodle shop',
    'catering.restaurant.ramen': 'ramen shop',
    'catering.restaurant.wings': 'wings spot',
    'catering.restaurant.vegan': 'vegan restaurant',
    'catering.restaurant.vegetarian': 'vegetarian restaurant',
    'catering.restaurant.tapas': 'tapas bar',
    'catering.restaurant.diner': 'diner',
    'catering.restaurant.breakfast': 'breakfast spot',
    'catering.restaurant.brunch': 'brunch spot',
    'catering.fast_food': 'fast food spot',
    'catering.fast_food.pizza': 'pizza spot',
    'catering.fast_food.burger': 'burger spot',
    'catering.fast_food.sandwich': 'sandwich shop',
    'catering.cafe': 'cafe',
    'catering.pub': 'pub',
    'catering.bar': 'bar',
    'catering.ice_cream': 'ice cream shop',
    'catering.food_court': 'food court',
  };

  return map[sub] ?? null;
}

/**
 * Use Claude Haiku to generate proper display name, short name, and business type.
 * AI handles ALL casing, shortening, and type inference — no hardcoded rules.
 *
 * @param categoryHint - Optional Geoapify category-derived type to confirm/override
 */
export async function aiBusinessName(
  name: string,
  apiKey: string,
  categoryHint?: string | null,
): Promise<{ displayName: string; shortName: string; type: string }> {
  const cacheKey = name.toLowerCase();
  const cached = nameCache.get(cacheKey);
  if (cached) return cached;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const hintLine = categoryHint
      ? `\nCategory hint from structured data: "${categoryHint}". Use this if it makes sense, but override if the name strongly suggests otherwise.`
      : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [{
        role: 'user',
        content: `Given this business name, return JSON with: the properly cased display name, the short casual name, and the business type (what kind of food place it is). No explanation, ONLY valid JSON.

Name rules:
- Preserve acronyms: IHOP stays IHOP, BLT stays BLT
- Fix bad casing: "OLIVIA TAMPA" → "Olivia", "wagamama us" → "Wagamama"
- Strip location suffixes and generic words for the short name
- Keep brand names intact

Type rules:
- The type is a lowercase label like: "pizzeria", "diner", "sushi bar", "steakhouse", "Chinese restaurant", "Italian restaurant", "BBQ spot", "cafe", "bar", "taco shop", "bakery", "seafood restaurant", "burger spot", "brunch spot", "ramen shop", "Thai restaurant", etc.
- Use the most specific type that fits. "Mario's Pizzeria" → "pizzeria", not "restaurant"
- If the name doesn't clearly indicate a type, default to "restaurant"
${hintLine}

Examples:
"MARIO'S PIZZERIA" → {"displayName":"Mario's Pizzeria","shortName":"Mario's","type":"pizzeria"}
"IHOP" → {"displayName":"IHOP","shortName":"IHOP","type":"diner"}
"Golden Dragon Kitchen" → {"displayName":"Golden Dragon Kitchen","shortName":"Golden Dragon","type":"Chinese restaurant"}
"Shake Shack" → {"displayName":"Shake Shack","shortName":"Shake Shack","type":"burger spot"}
"The Capital Grille" → {"displayName":"The Capital Grille","shortName":"Capital Grille","type":"steakhouse"}
"Pho Saigon" → {"displayName":"Pho Saigon","shortName":"Pho Saigon","type":"Vietnamese restaurant"}
"Blue Ribbon Sushi" → {"displayName":"Blue Ribbon Sushi","shortName":"Blue Ribbon","type":"sushi bar"}
"Olive Garden" → {"displayName":"Olive Garden","shortName":"Olive Garden","type":"Italian restaurant"}
"Bridgeview Diner" → {"displayName":"Bridgeview Diner","shortName":"Bridgeview","type":"diner"}
"Fushimi" → {"displayName":"Fushimi","shortName":"Fushimi","type":"Japanese restaurant"}

"${name}" →`,
      }],
    });

    const raw = (response.content[0]?.type === 'text' ? response.content[0].text : '').trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(jsonStr) as { displayName: string; shortName: string; type: string };

    if (parsed.displayName?.length >= 2 && parsed.shortName?.length >= 2) {
      const result = {
        displayName: parsed.displayName,
        shortName: parsed.shortName,
        type: parsed.type || categoryHint || 'restaurant',
      };
      nameCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // Fall through to raw name
  }

  const fallback = { displayName: name, shortName: name, type: categoryHint || 'restaurant' };
  nameCache.set(cacheKey, fallback);
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
  // Use stored fields if available (generated at prospect creation time)
  const storedShortName = (prospect as { shortName?: string | null }).shortName;
  const storedType = (prospect as { businessType?: string | null }).businessType;

  let company: string;
  let shortName: string;
  let type: string;

  if (extras.anthropicKey) {
    // AI handles display name, short name, and type — no hardcoded rules
    const names = await aiBusinessName(prospect.name, extras.anthropicKey);
    company = names.displayName;
    shortName = storedShortName ?? names.shortName;
    type = storedType ?? names.type;
  } else {
    // No API key — use cached or raw name
    const cached = nameCache.get(prospect.name.toLowerCase());
    company = cached?.displayName ?? prospect.name;
    shortName = storedShortName ?? cached?.shortName ?? prospect.name;
    type = storedType ?? cached?.type ?? 'restaurant';
  }

  const city = (prospect.address as Record<string, string> | null)?.['city'] ?? extras.city ?? '';
  return {
    firstName: prospect.contactFirstName ?? 'there',
    lastName: prospect.contactLastName ?? '',
    company,
    shortName,
    type,                   // sub-industry: "pizzeria", "diner", "sushi bar", etc.
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
