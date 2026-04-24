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
  businessType?: string | null;         // "pizzeria", "salon", "gym" — from aiBusinessName
  websiteContent?: string | null;       // scraped homepage text, for Claude to reference
}

export interface PersonalizerOptions {
  /** Custom agent-provided instructions. Overrides the default pitch entirely. */
  systemPrompt?: string | null;
  /** Sender name — defaults to "Jason". */
  senderName?: string;
}

/** Baseline fallback pitch when an agent hasn't supplied a systemPrompt. */
const DEFAULT_PITCH = `You build lightweight tools for local businesses — phone answering, website chatbots, lead capture — that help them handle inquiries without hiring extra staff. You offer to set one up free as a no-pressure test.`;

function buildContext(p: ProspectContext): string {
  const lines: string[] = [
    `Business name: ${p.name}`,
    `City: ${p.city}`,
  ];
  if (p.businessType) lines.push(`Type: ${p.businessType}`);
  if (p.contactFirstName) lines.push(`Contact first name: ${p.contactFirstName}`);
  if (p.website) lines.push(`Website: ${p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`);
  if (p.googleRating && p.googleRating >= 4.0)
    lines.push(`Well regarded on Google (you can imply they've built something solid — never quote stars)`);
  if (p.googleRating && p.googleRating < 4.0)
    lines.push(`Mixed Google reviews (do NOT mention this)`);
  if (!p.phone) lines.push(`Phone not found on website or Google (real gap you can reference naturally)`);
  return lines.join('\n');
}

/**
 * Generate a personalized cold email body using Claude Haiku.
 * Plain text only; caller wraps in HTML + appends signature/unsubscribe.
 * Returns null on failure — caller falls back to template substitution.
 */
export async function generatePersonalizedEmail(
  prospect: ProspectContext,
  _replyEmail: string,
  apiKey: string,
  options: PersonalizerOptions = {},
): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey });
    const firstName = prospect.contactFirstName ?? 'there';
    const senderName = options.senderName ?? 'Jason';

    // Pitch: agent's custom systemPrompt wins; otherwise use baseline
    const pitch = (options.systemPrompt && options.systemPrompt.trim().length >= 20)
      ? options.systemPrompt.trim()
      : DEFAULT_PITCH;

    // Scraped website context — if available, give Claude a slice to work with
    const siteBlock = prospect.websiteContent
      ? `\n\nScraped website text (use to reference something SPECIFIC — a menu item, service, vibe, award, etc. Never paraphrase verbatim):\n"""\n${prospect.websiteContent}\n"""`
      : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 450,
      messages: [
        {
          role: 'user',
          content: `You are ${senderName}, writing a cold email to a local business owner. The email must feel genuine — like you actually looked at their business and decided to reach out.

WHO YOU ARE AND WHAT YOU OFFER:
${pitch}

BUSINESS CONTEXT (use naturally; do not recite like a report):
${buildContext(prospect)}${siteBlock}

CORE VOICE (match this style, not the content):
- First-person, warm, direct. Like texting a smart friend, not a salesperson.
- Mention one SPECIFIC thing you noticed about their business (from website text if available, otherwise from type/city/Google).
- Explain what you offer in plain language relevant to THEIR type of business.
- End with a soft ask — offer to set it up free, or invite a reply.

HARD RULES:
- 60 to 95 words total. No longer.
- Start with "Hey ${firstName}," on its own line.
- Do NOT include any sign off. No "Best", no name, no signature. Appended separately.
- Do NOT use dashes, em dashes, en dashes, or colons. Use periods and commas.
- Do NOT use the word "AI" anywhere. Say "tool" or "system".
- Do NOT copy phrases verbatim from the scraped website. Paraphrase what you noticed.
- Output ONLY the paragraphs. Plain text. No HTML, no markdown, no headers.`,
        },
      ],
    });

    const firstBlock = response.content[0];
    const rawText = (firstBlock?.type === 'text' ? firstBlock.text.trim() : '')
      .replace(/—/g, ', ')   // em dash
      .replace(/–/g, ', ')   // en dash
      .replace(/ - /g, ' ')       // spaced hyphen
      .replace(/---+/g, '')       // horizontal rules
      .trim();

    if (!rawText || rawText.length < 30) return null;

    log.info(
      { business: prospect.name, length: rawText.length, hasSite: !!prospect.websiteContent, customPitch: !!options.systemPrompt },
      'AI email generated',
    );
    return rawText;
  } catch (err) {
    log.warn({ err, business: prospect.name }, 'AI personalization failed');
    return null;
  }
}

/**
 * Industry-aware default pitches — used when creating a new agent.
 * These populate the Agent.systemPrompt field so each agent has a
 * relevant baseline voice out of the box.
 */
export const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  RESTAURANT: `You build lightweight tools for restaurants — a phone-answering system that takes orders and reservations when the team is busy, plus a website chatbot that answers menu and hours questions. Emails should lead with the phone gap (most restaurants miss calls during rushes). Offer to set one up free.`,
  SALON: `You build simple tools for salons and barbershops — an automated booking system that handles appointment requests by phone or web chat, cuts no-shows with smart reminders. Emails should lead with missed booking calls or appointment coordination pain. Offer to set one up free.`,
  FITNESS: `You build lightweight tools for gyms and studios — a member inquiry handler that answers class times, pricing, trial questions without staff needing to pick up the phone. Helps with front-desk overflow during peak hours. Offer to set one up free.`,
  RETAIL: `You build tools for local retail — a customer-inquiry bot that handles stock questions, hours, product availability, and pickup coordination so owners aren't glued to the phone. Offer to set one up free.`,
  MEDICAL: `You build patient-intake tools for medical and dental practices — HIPAA-aware chat and phone screening that collects new-patient info, schedules, and routes urgent calls. Emails should focus on reducing front-desk load. Offer to set one up free.`,
  OTHER: DEFAULT_PITCH,
};

export function defaultSystemPromptForIndustries(industries: string[]): string {
  if (industries.length === 0) return DEFAULT_PITCH;
  // Use first industry's prompt as the primary pitch
  const primary = industries[0]!;
  return DEFAULT_SYSTEM_PROMPTS[primary] ?? DEFAULT_PITCH;
}
