/**
 * AI Email Reviewer — second-LLM quality gate.
 *
 * After the personalizer generates an email, this reviewer scores it on
 * specificity, voice, banned-phrase compliance, and length. If it fails,
 * we regenerate. If it fails twice, we skip the prospect.
 *
 * Uses Haiku (cheap, fast) — review is a simple grading task, doesn't need
 * Sonnet horsepower like generation does.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:ai-reviewer');

export interface ReviewResult {
  score: number;          // 0–10
  pass: boolean;          // true if score >= MIN_PASSING_SCORE
  reasons: string[];      // what's wrong, if anything
}

const MIN_PASSING_SCORE = 6;

const BANNED_REGEXES: { phrase: string; rx: RegExp }[] = [
  { phrase: 'I was checking out',         rx: /\bi\s+was\s+checking\s+out\b/i },
  { phrase: 'I came across',              rx: /\bi\s+came\s+across\b/i },
  { phrase: 'I stumbled on',              rx: /\bi\s+stumbled\b/i },
  { phrase: 'No pressure',                rx: /\bno\s+pressure\b/i },
  { phrase: 'no strings attached',        rx: /\bno\s+strings\s+attached\b/i },
  { phrase: 'worth a chat',               rx: /\bworth\s+a\s+(?:quick\s+)?chat\b/i },
  { phrase: 'worth a conversation',       rx: /\bworth\s+a\s+conversation\b/i },
  { phrase: 'figured I\'d say hi',        rx: /\bfigured\s+i'?d\s+say\s+hi\b/i },
  { phrase: 'figured I\'d reach out',     rx: /\bfigured\s+i'?d\s+reach\s+out\b/i },
  { phrase: 'just wanted to introduce',   rx: /\bjust\s+wanted\s+to\s+introduce\b/i },
  { phrase: 'I hope this finds you well', rx: /\bhope\s+this\s+finds\s+you\s+well\b/i },
  { phrase: 'killing it',                 rx: /\bkilling\s+it\b/i },
  { phrase: 'crushing it',                rx: /\bcrushing\s+it\b/i },
  { phrase: 'doing great on Google',      rx: /\bdoing\s+great\s+on\s+google\b/i },
  { phrase: 'smooth things out',          rx: /\bsmooth\s+things\s+out\b/i },
];

/**
 * Fast deterministic check — no LLM call needed.
 * If any banned phrase appears, the email fails immediately.
 */
function checkBannedPhrases(body: string): string[] {
  return BANNED_REGEXES
    .filter(({ rx }) => rx.test(body))
    .map(({ phrase }) => `Contains banned phrase: "${phrase}"`);
}

/**
 * LLM-graded specificity + voice review.
 * Returns a score 0-10 with reasons.
 */
async function llmReview(emailBody: string, businessName: string, apiKey: string): Promise<{ score: number; reasons: string[] }> {
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are reviewing a cold outreach email for quality. Score it 0-10 strictly.

CRITERIA:
- 10: Specific, warm, references something real about the business, has a clear soft CTA, sounds like a real person
- 7-8: Decent but somewhat generic, makes the cut
- 4-6: Templated-feeling, vague references, weak CTA
- 0-3: Pure spam, all clichés, could be sent to anyone

Auto-fail (score 0) if email:
- Repeats the business name more than 3 times
- Contains "I was checking out", "No pressure", "worth a chat", "just wanted to introduce myself"
- Has a sign-off ("Best, Jason" etc.) — those get appended separately
- Uses dashes, em dashes, en dashes, or colons
- Is over 110 words or under 35 words

BUSINESS BEING EMAILED: ${businessName}

EMAIL BODY:
"""
${emailBody}
"""

Respond ONLY with JSON: {"score": <0-10>, "reasons": ["short reason if score < 7"]}`,
      }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}';
    const json = text.match(/\{[\s\S]*\}/)?.[0] ?? '{}';
    const parsed = JSON.parse(json) as { score?: number; reasons?: string[] };
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
    };
  } catch (err) {
    log.warn({ err, businessName }, 'LLM review failed — passing email through');
    // If review fails, default to "pass" — never block sends due to reviewer error.
    return { score: 7, reasons: [] };
  }
}

/**
 * Full review: deterministic banned-phrase check + LLM grading.
 */
export async function reviewEmail(
  emailBody: string,
  businessName: string,
  apiKey: string,
): Promise<ReviewResult> {
  // Cheap deterministic check first
  const bannedFails = checkBannedPhrases(emailBody);
  if (bannedFails.length > 0) {
    return { score: 0, pass: false, reasons: bannedFails };
  }

  // Length sanity
  const wordCount = emailBody.trim().split(/\s+/).length;
  if (wordCount < 30 || wordCount > 120) {
    return { score: 2, pass: false, reasons: [`Word count ${wordCount} out of range (30-120)`] };
  }

  // LLM review
  const llm = await llmReview(emailBody, businessName, apiKey);
  return {
    score: llm.score,
    pass: llm.score >= MIN_PASSING_SCORE,
    reasons: llm.reasons,
  };
}
