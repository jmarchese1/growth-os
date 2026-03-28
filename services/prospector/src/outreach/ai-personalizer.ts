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
  contactFirstName?: string | null;
}

function buildContext(p: ProspectContext): string {
  const lines: string[] = [
    `Business name: ${p.name}`,
    `City: ${p.city}`,
  ];
  if (p.contactFirstName) lines.push(`Contact first name: ${p.contactFirstName}`);
  if (p.website) lines.push(`Website: ${p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`);
  if (p.googleRating && p.googleRating >= 4.0) lines.push(`Well regarded on Google (imply they have built something solid, never quote stars)`);
  else if (p.googleRating && p.googleRating < 4.0) lines.push(`Mixed Google reviews (do NOT mention this)`);
  if (!p.phone) lines.push(`Phone not found on website or Google (this is a real gap you can reference naturally)`);
  return lines.join('\n');
}

/**
 * Generate a personalized cold email body using Claude.
 * Returns plain text only (no HTML, no greeting, no sign-off).
 * The caller wraps it in HTML and adds signature/unsubscribe.
 * Falls back to null if generation fails.
 */
export async function generatePersonalizedEmail(
  prospect: ProspectContext,
  _replyEmail: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey });
    const firstName = prospect.contactFirstName ?? 'there';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are Jason, a data scientist who built a side project that helps restaurants handle phone calls and website inquiries. You are writing a personal cold email to a restaurant owner. This must feel genuine, like you actually looked at their place and decided to reach out.

Business context (use to make it personal, do NOT recite like a report):
${buildContext(prospect)}

Here is the exact style and tone you must match:

---
Hey ${firstName},

My name is Jason. I am a data scientist and have been building a tool on the side that helps restaurants handle phone calls and website inquiries automatically when the team is too busy to pick up. Thought it might be useful for ${prospect.name}.

Basically when a customer calls and no one can answer, the system picks up, takes orders, books reservations, and answers questions about the menu. It sounds like a real person, not a robot. I also built a chatbot that does the same thing for people visiting your website.

Would love to set one up for ${prospect.name} for free if you are open to seeing how it works. No strings attached.
---

Write 2 to 3 short paragraphs matching that exact voice. Rules:
- 60 to 90 words total. No longer.
- Start with "Hey ${firstName}," on its own line.
- Do NOT include any sign off (no "Best", no "Jason", no signature). That is added separately.
- First paragraph: introduce yourself genuinely and mention what you built. Reference their business naturally.
- Second paragraph: explain how it works in simple terms. Focus on the phone system and chatbot.
- Third paragraph (optional, keep short): offer to set it up for free. No pressure.
- Sound like a real person texting a friend, not a salesperson.
- Do NOT use dashes, em dashes, en dashes, hyphens used as dashes, or colons anywhere.
- Do NOT use the word "AI" anywhere in the email.
- Output ONLY the paragraphs. Plain text only. No HTML.`,
        },
      ],
    });

    const firstBlock = response.content[0];
    const rawText = (firstBlock?.type === 'text' ? firstBlock.text.trim() : '')
      .replace(/\u2014/g, ', ')   // em dash
      .replace(/\u2013/g, ', ')   // en dash
      .replace(/ - /g, ' ')      // spaced hyphen as dash
      .replace(/---+/g, '')      // horizontal rules
      .trim();

    if (!rawText || rawText.length < 30) return null;

    log.info({ business: prospect.name, length: rawText.length }, 'AI email generated');
    return rawText;
  } catch (err) {
    log.warn({ err, business: prospect.name }, 'AI personalization failed');
    return null;
  }
}
