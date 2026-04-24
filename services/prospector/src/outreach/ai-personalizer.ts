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

    // Rotate opener + CTA styles so emails don't all read identical.
    // Claude sees a hash-seeded choice; output varies across prospects even with same pitch.
    const seed = Math.abs(
      [...prospect.name].reduce((a, c) => a + c.charCodeAt(0), 0),
    );

    const OPENER_STYLES = ['observation', 'question', 'direct-context'] as const;
    const CTA_STYLES = ['loom', 'mockup', 'reply', 'short-zoom'] as const;
    type OpenerStyle = typeof OPENER_STYLES[number];
    type CtaStyle = typeof CTA_STYLES[number];

    const openerStyle: OpenerStyle = OPENER_STYLES[seed % OPENER_STYLES.length] ?? 'observation';
    const ctaStyle: CtaStyle = CTA_STYLES[seed % CTA_STYLES.length] ?? 'reply';

    const OPENER_GUIDES: Record<OpenerStyle, string> = {
      'observation':    `Open with ONE specific thing you noticed about their business — a dish, a service, a vibe, a detail from the website or their type. Skip the "I was checking out X" cliché. Just drop the observation.`,
      'question':       `Open with a sharp question relevant to a business like theirs (e.g. "who handles the phone when you're cooking a full Saturday rush?"). Don't answer your own question in the email, let it breathe.`,
      'direct-context': `Open by naming what you do (one short line) and immediately connect it to their type of business with a concrete hook. Skip any "how are you" or "hope this finds you well" warm-up.`,
    };

    const CTA_GUIDES: Record<CtaStyle, string> = {
      'loom':        `End by offering a 90-second Loom walkthrough showing what a system like this would actually do for a business like theirs. Make it clear no call is needed to see it.`,
      'mockup':      `End by offering to mock something up and send it over, no call needed. Frame it as zero commitment.`,
      'reply':       `End with a simple "want me to send more?", invite a one-word reply.`,
      'short-zoom':  `End by proposing a 10-min Zoom if they're curious. Explicitly say 10 minutes, nothing more.`,
    };

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are ${senderName}. Writing a SHORT, specific cold email introducing yourself to a local business owner. This is not a sales pitch — it's a real person reaching out.

BACKGROUND — who you are and what you actually build:
${pitch}

BUSINESS YOU'RE EMAILING:
${buildContext(prospect)}${siteBlock}

STRUCTURE YOU MUST USE:
1. "Hey ${firstName},"
2. OPENER — ${OPENER_GUIDES[openerStyle]}
3. MIDDLE — briefly mention you build AI agents / chatbots / voice agents / automation. Then name ONE concrete outcome a system like this would deliver for THIS business (based on their type + anything from the website). Example outcomes, not to copy: "answers the phone at 11pm when you're closing", "takes reservations in English and Spanish", "handles Sunday brunch questions without your team touching it". Make yours specific to them.
4. CTA — ${CTA_GUIDES[ctaStyle]}
5. NO sign-off. No "Best". No name at the bottom. It gets appended separately.

HARD VOICE RULES:
- 50 to 90 words total.
- Sound like a real human texting a smart friend. Warm, direct.
- Natural to say "AI agents", "chatbots", "voice agents", "automation" — those are the actual products.
- DO NOT use these banned phrases:
    * "killing it", "crushing it", "doing great on Google"
    * "I was checking out", "I came across", "I stumbled on"
    * "smooth things out", "worth a chat", "worth a quick chat", "worth a conversation"
    * "No pressure", "no strings attached", "no pressure at all"
    * "figured I'd say hi", "figured I'd reach out", "just wanted to introduce myself"
    * "I hope this finds you well"
- DO NOT use dashes, em dashes, en dashes, or colons anywhere. Use periods and commas.
- DO NOT paraphrase the website content verbatim. Reference it naturally, like you're someone who glanced at it.
- DO NOT say "AI agents, chatbots, voice agents, and automation" as a list. Weave it into natural speech.

Output ONLY the email paragraphs. Plain text. No HTML. No markdown. No headers.`,
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
