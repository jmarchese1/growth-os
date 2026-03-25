import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:ai-personalizer');

export interface ProspectContext {
  name: string;
  city: string;
  website?: string | null;
  phone?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
}

const SIGNATURE_HTML = `
<table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-right: 12px; vertical-align: middle; width: 56px;">
      <img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" />
    </td>
    <td style="vertical-align: middle;">
      <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p>
      <p style="margin: 2px 0 0; font-size: 13px; color: #666;">Founder · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p>
    </td>
  </tr>
</table>`;

function buildUnsubscribe(replyEmail: string): string {
  return `<p style="margin-top: 32px; font-size: 11px; color: #bbb;">Saw your restaurant in a local search. Not interested? <a href="mailto:${replyEmail}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a></p>`;
}

/**
 * Produce a natural greeting for the business name.
 * - Strips generic suffixes (Restaurant, Tavern, Bar & Grill, etc.)
 * - If the remaining name is short enough: "Hey [Name]," or "Hey [Name] team,"
 * - If the full name is very long or has many words: "Hi there,"
 */
function buildGreeting(name: string): string {
  // Strip one generic suffix at a time, loop until nothing more is removed
  const STRIP_SUFFIX = /[\s,&]+(?:restaurant|tavern|bar\s*&?\s*grill|grill|bistro|café|cafe|eatery|diner|kitchen|dining|lounge|pub|brasserie|gastropub|steakhouse|pizzeria|taqueria|sushi|ramen|bbq|barbeque)[\s,]*$/i;
  let stripped = name.trim();
  let prev = '';
  while (stripped !== prev) {
    prev = stripped;
    stripped = stripped.replace(STRIP_SUFFIX, '').trim();
  }

  const words = stripped.split(/\s+/);
  const tooLong = stripped.length > 26 || words.length > 4;
  if (tooLong) return 'Hi there,';

  const didStrip = stripped.toLowerCase() !== name.toLowerCase();
  if (didStrip) return `Hey ${stripped} team,`;

  return `Hey ${stripped},`;
}

function buildContext(p: ProspectContext): string {
  const lines: string[] = [
    `Business name: ${p.name}`,
    `City: ${p.city}`,
  ];
  if (p.website) lines.push(`Website: ${p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`);
  // Pass rating as context only (Claude should never quote numbers to the prospect)
  if (p.googleRating && p.googleRating >= 4.0) lines.push(`Well-regarded on Google (use this to imply they've built something solid - never quote stars or review count)`);
  else if (p.googleRating && p.googleRating < 4.0) lines.push(`Mixed Google reviews (do NOT mention this - only highlight positives or stay neutral)`);
  // Only flag missing phone if it was genuinely not found after website scraping
  if (!p.phone) lines.push(`Phone not found on their website or Google listing (this is a real gap you can reference naturally)`);
  return lines.join('\n');
}

/**
 * Generate a personalized cold email body using Claude.
 * Returns the full HTML email (body + signature + unsubscribe).
 * Falls back to null if generation fails — caller uses static template.
 */
export async function generatePersonalizedEmail(
  prospect: ProspectContext,
  replyEmail: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are Jason, founder of Embedo, an AI automation agency built specifically for restaurants. You are personally reaching out to a restaurant owner. This is NOT a mass email. It needs to feel like you genuinely came across their place and decided to write.

Business context (use to make it feel personal, do NOT recite like a report):
${buildContext(prospect)}

What Embedo does (work into the pitch naturally, do NOT list robotically):
We build three things for restaurants: a custom AI phone receptionist that answers every call when they are busy or closed (takes orders, books reservations, answers questions), a custom AI chatbot embedded into their website for online visitors, and a professional website if they need one. The whole thing runs on autopilot.

Here is the exact style and tone you must match:

---
I run an AI automation agency built specifically for restaurants. We build three things for our clients: a custom AI phone receptionist, a custom AI chatbot and a professional website.

Here is how it works. When a customer calls and you are busy or closed, the call automatically routes to your AI phone agent. It answers questions, takes orders and books reservations just like a real staff member would. On top of that, we embed an AI chatbot into your website that does the same thing for online visitors.

I would love to jump on a quick call and demo what this would look like for your restaurant. No pressure, just want to show you what is possible.
---

Write 2 to 3 short paragraphs in that same voice. Rules:
- Roughly 60 to 90 words total. No longer.
- DO NOT include greeting, sign-off, or signature. Those are added separately.
- First paragraph: introduce what you do and what you build. Keep it direct and clear.
- Second paragraph: explain how it works in plain terms. Focus on the AI phone agent and chatbot. Make it concrete.
- Third paragraph (optional, keep short): soft ask to demo it for their specific restaurant. Use business name if natural.
- Sound like a real person, not a salesperson. Professional but approachable.
- Do NOT use dashes, hyphens used as dashes, em dashes, or en dashes anywhere in the text.
- Do NOT use colons to introduce lists or explanations.
- Output ONLY the paragraphs, separated by a blank line. Plain text only. No HTML.`,
        },
      ],
    });

    const firstBlock = response.content[0];
    // Strip em dashes and en dashes — replace with nothing or a comma where natural
    const rawText = (firstBlock?.type === 'text' ? firstBlock.text.trim() : '')
      .replace(/\u2014/g, ',')   // em dash → comma
      .replace(/\u2013/g, ',')   // en dash → comma
      .replace(/ - /g, ' ')      // spaced hyphen used as dash → space
      .trim();

    if (!rawText) return null;

    // Split into paragraphs and wrap in HTML
    const paragraphs = rawText
      .split(/\n{2,}/)
      .map((p: string) => p.trim())
      .filter(Boolean)
      .map((p: string) => `<p style="margin: 0 0 16px; color: #1a1a1a;">${p}</p>`)
      .join('\n  ');

    const html = `<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px;">
  <p style="margin: 0 0 16px;">${buildGreeting(prospect.name)}</p>
  ${paragraphs}
  ${SIGNATURE_HTML}
  ${buildUnsubscribe(replyEmail)}
</div>`;

    log.info({ business: prospect.name }, 'AI email generated');
    return html;
  } catch (err) {
    log.warn({ err, business: prospect.name }, 'AI personalization failed — falling back to template');
    return null;
  }
}
