import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';
import { reviewEmail } from './ai-reviewer.js';

const log = createLogger('prospector:ai-personalizer');

const MAX_REGENERATION_ATTEMPTS = 2;

export interface ProspectContext {
  name: string;
  city: string;
  website?: string | null;
  phone?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  contactFirstName?: string | null;
  shortName?: string | null;            // AI-generated casual short name ("Mario's", "Hofbrauhaus")
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

function buildContext(p: ProspectContext, greetingTarget: string): string {
  const lines: string[] = [
    `Business: ${p.name}`,
    `City: ${p.city}`,
  ];
  if (p.businessType) lines.push(`Type: ${p.businessType}`);
  // Always tell the model exactly what to put after "Hey" — no inference allowed.
  lines.push(`Greet with: "${greetingTarget}"  (use this exactly after "Hey ", do not substitute or invent)`);
  if (p.website) lines.push(`Website: ${p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`);
  return lines.join('\n');
}

/** Single Claude generation attempt — returns plain text or null. */
async function attemptGeneration(
  prospect: ProspectContext,
  apiKey: string,
  options: PersonalizerOptions,
  retryFeedback?: string,
): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey });
    const senderName = options.senderName ?? 'Jason';

    // Compute the greeting target.
    // - With contact name: "Hey {firstName},"
    // - Without (common for Geoapify-discovered prospects): rotate between
    //   "Hey there," and "Hey {shortName}," for warmth without being weird.
    //   Hash-seeded by business name so the same prospect always gets the
    //   same greeting on retries.
    const seedForGreeting = Math.abs(
      [...prospect.name].reduce((a, c) => a + c.charCodeAt(0), 0),
    );
    const greetingTarget: string = (() => {
      if (prospect.contactFirstName && prospect.contactFirstName.trim().length > 0) {
        return prospect.contactFirstName.trim();
      }
      // No contact name. Use shortName if it exists and is short enough to feel
      // natural in a greeting (3-20 chars, no special chars).
      const sn = prospect.shortName?.trim();
      const usable = !!sn && sn.length >= 3 && sn.length <= 20 && /^[A-Za-z][A-Za-z0-9' .]*$/.test(sn);
      if (usable && seedForGreeting % 2 === 0) return sn!;
      return 'there';
    })();
    const firstName = greetingTarget;

    const pitch = (options.systemPrompt && options.systemPrompt.trim().length >= 20)
      ? options.systemPrompt.trim()
      : DEFAULT_PITCH;

    const siteBlock = prospect.websiteContent
      ? `\n\nQuick glance at their website (use ONLY if something stands out naturally; otherwise ignore):\n"""\n${prospect.websiteContent}\n"""`
      : '';

    // Rotate opener + CTA styles per prospect (deterministic by name)
    const seed = Math.abs([...prospect.name].reduce((a, c) => a + c.charCodeAt(0), 0));
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

    // If a previous attempt failed review, prepend the feedback so Claude knows what to fix.
    const feedbackBlock = retryFeedback
      ? `\n===== PREVIOUS ATTEMPT FAILED REVIEW =====\nReason: ${retryFeedback}\nFix it on this attempt. Same structure, but eliminate the issue.\n`
      : '';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are ${senderName}. Write a SHORT, specific cold email to a local business owner. Real person voice, not salesy.
${feedbackBlock}
===== AUTO-REJECT PHRASES =====
The email will be rejected and rewritten if it contains ANY of these. Treat them as radioactive:
- "I was checking out" / "I came across" / "I stumbled on" / "I noticed you"
- "worth a chat" / "worth a quick chat" / "worth a conversation" / "worth exploring"
- "No pressure" / "no pressure at all" / "no strings attached"
- "figured I'd say hi" / "figured I'd reach out" / "just wanted to introduce myself" / "wanted to say hi"
- "I hope this finds you well" / "hope you're doing well"
- "killing it" / "crushing it" / "doing great on Google"
- "smooth things out" / "help you out" / "take things to the next level"
- Listing "AI agents, chatbots, voice agents, and automation" as a series — weave naturally

===== STYLE EXAMPLES =====
These are the KIND of email to write. Study the specificity, length, and energy. Do NOT copy the wording.

EXAMPLE A (observation-first, Loom CTA):
Hey Dana,
You've got a Sunday brunch waitlist wrapped around the block in the photos, which tells me your host is probably drowning at 10:30am on weekends.
I build voice agents that pick up calls during rushes like that. They quote the wait, take walk-in numbers, and don't sound robotic. Nothing for you to install.
If you want, I can record a 90 second Loom showing what it'd do with Casa Bella's actual menu. Would that be useful?
Best,
Jason

EXAMPLE B (question-first, mockup CTA):
Hey Mike,
Quick question. Who takes the call at 8:47pm when someone asks if the kitchen is still open?
If the answer is "my manager, if he can hear the phone over the speaker", I might be able to help. I build AI voice agents that handle after hours orders and common questions in the owner's tone. Works in English and Spanish.
Happy to build a mockup on your actual menu and send it over. No call needed.
Best,
Jason

EXAMPLE C (direct-context, one-word-reply CTA):
Hey Elena,
I build website chatbots and phone AI for restaurants. Ran one for a spot in Queens last month that started booking parties of 10+ at 2am without anyone there.
The Trattoria page looks like it'd fit the same setup. Want me to send the details? One word is fine.
Best,
Jason

===== CONTEXT =====

Your background (who you are, what you actually sell):
${pitch}

The business you're emailing:
${buildContext(prospect, firstName)}${siteBlock}

===== WRITING INSTRUCTIONS =====

Structure:
1. The first line must be exactly: "Hey ${firstName}," — do NOT substitute, modify, or replace the word after "Hey". Never use the business type, business name, city, or any other word as a stand-in for a name. If the variable above is "there", the line is "Hey there,". This is non-negotiable.
2. OPENER — ${OPENER_GUIDES[openerStyle]}
3. Middle — name AI agents / chatbots / voice agents / automation naturally (not as a list). State ONE concrete thing a system would do for this specific business. Specificity beats polish.
4. CTA — ${CTA_GUIDES[ctaStyle]}
5. End with a sign-off on TWO lines: "Best," then "${senderName}" on the next line. Nothing else after the name.

Rules:
- 55 to 95 words including the sign-off. Short.
- No dashes, em dashes, en dashes, colons. Use periods and commas.
- DO NOT INVENT details. Don't fabricate menu items, awards, news, locations, or quotes you don't see in the context. A generic-but-honest line ("running a busy spot in Brooklyn") beats a fake-specific one ("your famous truffle ravioli was mentioned on Eater").
- If scraped website text is provided, reference something specific from it (a dish, a service, a hook). Don't quote verbatim, and only use it if you're sure it's real on their site.
- If no website text, use industry + city to make it feel custom anyway. Don't reach for fake details.
- Plain text output only. No HTML, no markdown, no headers. Start with "Hey ${firstName},".`,
        },
      ],
    });

    const firstBlock = response.content[0];
    const expectedGreeting = `Hey ${firstName},`;
    const rawText = (firstBlock?.type === 'text' ? firstBlock.text.trim() : '')
      // Force the first line to the exact greeting we expect, no matter what
      // Claude returned. Defends against the model picking up a noun from
      // context (e.g. "Hey diner,") when contactFirstName is null.
      .replace(/^Hey[^\n]*,/, expectedGreeting)
      .replace(/—/g, ', ')
      .replace(/–/g, ', ')
      .replace(/ - /g, ' ')
      .replace(/---+/g, '')
      .trim();

    if (!rawText || rawText.length < 30) return null;
    return rawText;
  } catch (err) {
    log.warn({ err, business: prospect.name }, 'AI generation attempt failed');
    return null;
  }
}

/**
 * Generate + REVIEW + retry loop.
 *
 * 1. Generate with Sonnet 4.6
 * 2. Run through ai-reviewer (deterministic banned-phrase check + Haiku grader)
 * 3. If fail, regenerate up to MAX_REGENERATION_ATTEMPTS more times,
 *    feeding the failure reasons back into the prompt so Claude can fix them.
 * 4. After max attempts, return null — caller falls back to template substitution.
 */
export async function generatePersonalizedEmail(
  prospect: ProspectContext,
  _replyEmail: string,
  apiKey: string,
  options: PersonalizerOptions = {},
): Promise<string | null> {
  let lastFailureReason: string | undefined;

  for (let attempt = 0; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
    const draft = await attemptGeneration(prospect, apiKey, options, lastFailureReason);
    if (!draft) {
      log.warn({ business: prospect.name, attempt }, 'Generation returned null');
      continue;
    }

    const review = await reviewEmail(draft, prospect.name, apiKey);

    if (review.pass) {
      log.info(
        {
          business: prospect.name,
          attempt: attempt + 1,
          score: review.score,
          length: draft.length,
          hasSite: !!prospect.websiteContent,
          customPitch: !!options.systemPrompt,
        },
        'AI email generated and approved',
      );
      return draft;
    }

    lastFailureReason = review.reasons.join('; ') || `Score ${review.score}/10 below threshold`;
    log.warn(
      { business: prospect.name, attempt: attempt + 1, score: review.score, reasons: review.reasons },
      'Email failed review, regenerating',
    );
  }

  log.warn(
    { business: prospect.name, lastFailureReason },
    `All ${MAX_REGENERATION_ATTEMPTS + 1} generation attempts failed review — returning null`,
  );
  return null;
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
