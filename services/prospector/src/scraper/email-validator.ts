import { createLogger } from '@embedo/utils';
import { promises as dns } from 'dns';

const log = createLogger('prospector:email-validator');

// Known free/personal email providers — these are acceptable for restaurants
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'live.com', 'msn.com', 'me.com',
  'protonmail.com', 'zoho.com', 'ymail.com', 'mail.com',
  'comcast.net', 'att.net', 'verizon.net', 'cox.net', 'sbcglobal.net',
  'optonline.net', 'earthlink.net', 'bellsouth.net', 'charter.net',
]);

// MX record cache (domain → has MX)
const mxCache = new Map<string, boolean>();

/**
 * Check if a domain has valid MX records (can receive email).
 * Results are cached for the lifetime of the process.
 */
export async function hasMxRecords(domain: string): Promise<boolean> {
  const cached = mxCache.get(domain);
  if (cached !== undefined) return cached;

  try {
    const records = await dns.resolveMx(domain);
    const valid = records.length > 0;
    mxCache.set(domain, valid);
    return valid;
  } catch {
    // ENOTFOUND, ENODATA = no MX records
    mxCache.set(domain, false);
    return false;
  }
}

/**
 * Extract the registrable domain from a URL or domain string.
 * "https://www.nuccissiny.com/menu" → "nuccissiny.com"
 * "www.gargiulos.com" → "gargiulos.com"
 */
export function extractDomain(urlOrDomain: string): string {
  try {
    const url = urlOrDomain.startsWith('http') ? urlOrDomain : `https://${urlOrDomain}`;
    const host = new URL(url).host;
    return host.replace(/^www\./, '');
  } catch {
    return urlOrDomain.replace(/^www\./, '');
  }
}

/**
 * Validate an email against the prospect's website domain.
 * Returns { valid, reason, confidence } where confidence is 0-100.
 *
 * Rules:
 * - Email domain matches website domain → high confidence (90-100)
 * - Email is from a free provider (Gmail etc) → medium confidence (40-70)
 * - Email domain is unrelated to website → REJECTED
 * - No website on prospect → accept anything with valid MX
 */
export async function validateEmail(
  email: string,
  websiteUrl: string | null | undefined,
  businessName: string,
): Promise<{ valid: boolean; confidence: number; reason: string }> {
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) return { valid: false, confidence: 0, reason: 'invalid email format' };

  const emailLocal = email.split('@')[0]?.toLowerCase() ?? '';

  // Check MX records
  const hasMx = await hasMxRecords(emailDomain);
  if (!hasMx) {
    log.debug({ email, reason: 'no MX records' }, 'Email rejected');
    return { valid: false, confidence: 0, reason: 'domain has no MX records' };
  }

  // If free email provider, validate by business name match
  if (FREE_EMAIL_DOMAINS.has(emailDomain)) {
    const nameWords = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const localNormalized = emailLocal.replace(/[^a-z0-9]/g, '');
    const hasNameMatch = nameWords.some(w => localNormalized.includes(w));

    if (hasNameMatch) {
      return { valid: true, confidence: 65, reason: `free provider, business name match` };
    }
    // Free email with no business name match — low confidence but not rejected
    // (could be the owner's personal email like "mikespizza@gmail.com" where Mike isn't in the business name)
    return { valid: true, confidence: 30, reason: 'free provider, no name match' };
  }

  // Custom domain — check against website
  if (websiteUrl) {
    const websiteDomain = extractDomain(websiteUrl);

    // Exact domain match (best case)
    if (emailDomain === websiteDomain) {
      return { valid: true, confidence: 95, reason: 'domain matches website' };
    }

    // Subdomain or related domain (e.g. email from orders.gargiulos.com, website is gargiulos.com)
    if (emailDomain.endsWith(`.${websiteDomain}`) || websiteDomain.endsWith(`.${emailDomain}`)) {
      return { valid: true, confidence: 85, reason: 'subdomain of website' };
    }

    // Check if email domain contains significant words from the business name
    const nameWords = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const domainBase = emailDomain.split('.')[0] ?? '';
    const domainMatchesName = nameWords.some(w => domainBase.includes(w));

    if (domainMatchesName) {
      return { valid: true, confidence: 70, reason: 'domain contains business name word' };
    }

    // Email domain is completely unrelated to the website — REJECT
    log.debug({ email, emailDomain, websiteDomain, businessName }, 'Email rejected: domain unrelated to website');
    return { valid: false, confidence: 0, reason: `domain "${emailDomain}" unrelated to website "${websiteDomain}"` };
  }

  // No website to compare against — accept with medium confidence
  const nameWords = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const domainBase = emailDomain.split('.')[0] ?? '';
  const domainMatchesName = nameWords.some(w => domainBase.includes(w));

  return {
    valid: true,
    confidence: domainMatchesName ? 70 : 40,
    reason: domainMatchesName ? 'no website, domain matches name' : 'no website to compare',
  };
}

/**
 * Detect if a webpage has a contact form.
 * Looks for <form> elements with email/message/name input fields.
 */
export function detectContactForm(html: string): boolean {
  // Look for forms with typical contact form fields
  const formRegex = /<form[\s\S]*?<\/form>/gi;
  const forms = html.match(formRegex) ?? [];

  for (const form of forms) {
    const lower = form.toLowerCase();
    // Must have at least an email-like input and a message-like input
    const hasEmailField = /type\s*=\s*["']email["']|name\s*=\s*["'](email|e-mail)["']/i.test(lower);
    const hasMessageField = /textarea|name\s*=\s*["'](message|comments?|body|inquiry)["']/i.test(lower);
    const hasNameField = /name\s*=\s*["'](name|full.?name|first.?name)["']/i.test(lower);

    if (hasEmailField && (hasMessageField || hasNameField)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate common email patterns for a domain and verify which ones have valid MX.
 * Used as a last resort when no email is found via scraping.
 *
 * Returns the first pattern that passes MX check, or null.
 */
export async function guessEmailPattern(
  domain: string,
): Promise<{ email: string; confidence: number } | null> {
  // Only try pattern guessing for custom domains (not free providers)
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;

  // Check MX first — if domain can't receive email, skip all patterns
  const hasMx = await hasMxRecords(domain);
  if (!hasMx) return null;

  // Return the most likely pattern — we can't actually verify the mailbox exists
  // without sending a message, so we go with the most common one
  const email = `info@${domain}`;
  return { email, confidence: 25 };
}
