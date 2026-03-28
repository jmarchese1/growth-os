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
const BUSINESS_SUFFIXES = [
  'restaurant', 'restaurants', 'pizzeria', 'pizzerias', 'pizza',
  'kitchen', 'grill', 'grille', 'cafe', 'café', 'bistro', 'bar',
  'tavern', 'pub', 'diner', 'eatery', 'bakery', 'steakhouse',
  'trattoria', 'osteria', 'brasserie', 'cantina', 'taqueria',
  'sushi', 'bbq', 'barbecue', 'smokehouse', 'seafood', 'brewing',
  'brewery', 'taproom', 'lounge', 'catering', 'food', 'foods',
  'dining', 'hospitality', 'group', 'co', 'co.', 'inc', 'llc',
  'ltd', 'corporation', 'corp', 'company',
];

// City names that appear as location qualifiers in business names
const CITY_SUFFIXES = [
  'tampa', 'miami', 'orlando', 'jacksonville', 'naples',
  'nyc', 'brooklyn', 'manhattan', 'queens', 'bronx',
  'chicago', 'houston', 'dallas', 'austin', 'denver',
  'seattle', 'portland', 'phoenix', 'atlanta', 'boston',
  'philadelphia', 'detroit', 'minneapolis', 'nashville',
  'las vegas', 'vegas', 'san francisco', 'sf', 'la',
  'los angeles', 'san diego', 'scottsdale', 'savannah',
  'charleston', 'new orleans', 'nola', 'dc', 'usa',
];

function toShortName(name: string): string {
  const titleCased = toTitleCase(name);
  const words = titleCased.split(/\s+/);

  // Don't strip if only 1 word
  if (words.length <= 1) return titleCased;

  // Strip trailing city names first (check multi-word cities like "Las Vegas")
  const lowerJoined = words.map((w) => w.toLowerCase()).join(' ');
  for (const city of CITY_SUFFIXES) {
    if (lowerJoined.endsWith(` ${city}`) && lowerJoined.length > city.length + 2) {
      const cityWordCount = city.split(' ').length;
      words.splice(words.length - cityWordCount, cityWordCount);
      break;
    }
  }

  // Don't strip business suffixes if only 1-2 words remain
  if (words.length > 2) {
    // Strip trailing business suffix words
    while (words.length > 1) {
      const last = words[words.length - 1]!.toLowerCase().replace(/[^a-z]/g, '');
      if (BUSINESS_SUFFIXES.includes(last)) {
        words.pop();
      } else {
        break;
      }
    }
  }

  // Strip trailing "& " artifacts
  const result = words.join(' ').replace(/\s*[&+]\s*$/, '').trim();

  // If we stripped too much, return original
  if (result.length < 3) return titleCased;

  return result;
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
  const shortName = toShortName(prospect.name);
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
