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
      <p style="margin: 2px 0 0; font-size: 13px; color: #666;">Data Scientist · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p>
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
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are Jason Marchese, a data scientist. You're personally reaching out to a restaurant owner. This is NOT a mass email — it needs to feel like you genuinely came across their place and decided to write.

Business context (use this to make it feel personal — do NOT recite these facts like a report):
${buildContext(prospect)}

What Embedo actually is (work this into the pitch naturally, do NOT list features robotically):
Embedo embeds a full AI ecosystem directly into how the business already runs. It is not one tool. It includes: a 24/7 AI voice receptionist that answers calls and handles reservations, an AI chatbot on their website and social DMs, a lead engine that captures every inquiry from every channel and follows up automatically, social media content and scheduling running on autopilot, post-visit surveys that trigger personalized re-engagement, an AI-generated website with built-in booking and chat, appointment scheduling with automatic reminders, and automated SMS and email sequences triggered by every customer action. The whole thing is embedded into existing business processes and personalized to how that specific business operates — not a generic software subscription.

Here is the exact style and length you must match — this is a real email Jason sent that got replies:

---
Came across your place in New York and wanted to reach out directly. I help restaurants replace the gaps in their customer journey with an AI layer that runs quietly in the background — handling calls, follow-ups, bookings, and social without adding work for your team.

Takes about a week to get fully embedded and most places start recovering lost customers in the first week alone. Happy to show you what it would actually look like inside your operation.
---

Write 2 short paragraphs in that same voice. Rules:
- Roughly 50-70 words total. No longer.
- DO NOT include greeting, sign-off, or signature, those are added separately.
- First paragraph: naturally reference how you found them, then describe what Embedo does in ONE sentence that captures the full scope — not just "missed calls", but the whole AI ecosystem woven into their existing operation. Use business name or city if natural, not forced. If context says they are well-regarded, imply it casually. Never mention star ratings, review counts, or any numbers.
- Second paragraph: brief proof + soft open-ended ask. No call-to-action link. Reference that it gets embedded into how they already work, not bolted on top.
- Sound like a real person, not a salesperson. Conversational. Short sentences.
- Do NOT use dashes, hyphens used as dashes, or em dashes anywhere in the text.
- If context says their phone is not findable, weave that in as one example of a gap, not the whole pitch. It is just one piece of the ecosystem.
- Output ONLY the 2 paragraphs, separated by a blank line. Plain text only. No HTML.`,
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
