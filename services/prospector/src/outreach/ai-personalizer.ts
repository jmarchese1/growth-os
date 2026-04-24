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
const DEFAULT_PITCH = `You build AI agents, chatbots, voice agents, and automation for local businesses. You're reaching out to introduce yourself and open the door to a short conversation about how any of these could help them — whether that's a voice agent that answers phone calls, a chatbot for their website visitors, or simple automation around bookings, leads, and follow-ups. The tone is casual, low-pressure, friendly. Not pitchy.`;

function buildContext(p: ProspectContext): string {
  const lines: string[] = [
    `Business: ${p.name}`,
    `City: ${p.city}`,
  ];
  if (p.businessType) lines.push(`Type: ${p.businessType}`);
  if (p.contactFirstName) lines.push(`Contact first name: ${p.contactFirstName}`);
  if (p.website) lines.push(`Website: ${p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`);
  return lines.join('\n');
}

/**
 * Generate a personalized cold email body using Claude Haiku.
 * Voice: a friendly intro offering a chat about AI agents, chatbots,
 * voice agents, or automation that could help the business.
 *
 * Returns plain text only (no HTML, no sign-off).
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

    const pitch = (options.systemPrompt && options.systemPrompt.trim().length >= 20)
      ? options.systemPrompt.trim()
      : DEFAULT_PITCH;

    // Optional website context — used to sound like you actually looked at the business.
    // NEVER required to reference something specific; Claude may or may not use it.
    const siteBlock = prospect.websiteContent
      ? `\n\nQuick glance at their website (use ONLY if something stands out naturally; otherwise ignore):\n"""\n${prospect.websiteContent}\n"""`
      : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 450,
      messages: [
        {
          role: 'user',
          content: `You are ${senderName}. You're writing a short, friendly cold email introducing yourself to a local business owner. This is NOT a sales pitch — it's an introduction with an open-ended offer to chat.

WHO YOU ARE AND WHAT YOU OFFER:
${pitch}

ABOUT THE BUSINESS:
${buildContext(prospect)}${siteBlock}

THE EMAIL:
Write a friendly introduction email that:
1. Opens with a warm "Hey ${firstName}," on its own line
2. Briefly says who you are and that you build AI agents, chatbots, voice agents, and automation for businesses like theirs
3. Offers to hop on a quick call, chat, or send more info about how any of these could help them (pick ONE simple ask, don't list every option)
4. Closes with no sign-off — that gets added separately

TONE:
- Sound like a real person reaching out, not a company
- Warm, low-pressure, open-ended
- Feel like "hey, wanted to introduce myself" — NOT "here's what you're missing"
- Do NOT use cringe phrases like "killing it", "noticed you're crushing it", "saw you're doing great on Google", or anything that sounds like a sales opener
- It's fine to naturally say "AI agents", "chatbots", "voice agents", "automation" — that's what you actually build

HARD RULES:
- 50 to 90 words total. Short.
- Start with "Hey ${firstName},"
- No sign-off, no name, no "Best".
- Do NOT use dashes, em dashes, en dashes, or colons. Use periods and commas.
- Output ONLY the email paragraphs. Plain text. No HTML, no markdown.`,
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
 * Industry-aware default pitches — all share the same voice:
 * friendly intro, offer a chat, AI agents / chatbots / voice agents / automation.
 * The emphasis shifts slightly based on what the industry typically cares about.
 */
export const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  RESTAURANT: `You build AI agents, chatbots, voice agents, and automation for local restaurants. Reaching out to introduce yourself and offer a quick chat about how any of these could help — a voice agent that answers phone orders when the team is slammed, a chatbot for menu and hours questions, or automation for reservations and follow-ups. Friendly and casual, not pitchy.`,

  SALON: `You build AI agents, chatbots, voice agents, and automation for salons and barbershops. Reaching out to introduce yourself and offer a quick chat about how any of these could help — a voice agent or chatbot that handles appointment inquiries, automation around booking reminders and no-shows, or a simple AI tool that answers client questions 24/7. Friendly and casual, not pitchy.`,

  FITNESS: `You build AI agents, chatbots, voice agents, and automation for gyms, studios, and fitness businesses. Reaching out to introduce yourself and offer a quick chat about how any of these could help — a chatbot that answers class, pricing, and trial questions, a voice agent for inbound calls, or automation for member onboarding and retention. Friendly and casual, not pitchy.`,

  RETAIL: `You build AI agents, chatbots, voice agents, and automation for local retail. Reaching out to introduce yourself and offer a quick chat about how any of these could help — a chatbot for stock, hours, and product questions, a voice agent for customer calls, or automation around loyalty and follow-ups. Friendly and casual, not pitchy.`,

  MEDICAL: `You build AI agents, chatbots, voice agents, and automation for medical and dental practices. Reaching out to introduce yourself and offer a quick chat about how any of these could help — patient-intake chatbots, voice agents that route calls and schedule appointments, or automation for reminders and forms. Friendly and casual, not pitchy.`,

  OTHER: DEFAULT_PITCH,
};

export function defaultSystemPromptForIndustries(industries: string[]): string {
  if (industries.length === 0) return DEFAULT_PITCH;
  const primary = industries[0]!;
  return DEFAULT_SYSTEM_PROMPTS[primary] ?? DEFAULT_PITCH;
}
