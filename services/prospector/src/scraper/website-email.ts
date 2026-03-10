import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:website-email');

// Domains to filter out (personal email providers — not business emails)
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'live.com', 'msn.com', 'me.com',
  'sentry.io', 'sentry-next.wixpress.com',
]);

// File extensions that appear in image/asset filenames containing @ (e.g. logo@2x.png)
const ASSET_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico',
  'pdf', 'js', 'css', 'html', 'htm', 'mp4', 'mov', 'woff', 'woff2',
]);

// Placeholder / example emails that are never real
const PLACEHOLDER_PATTERNS = [
  'example', 'placeholder', 'youremail', 'user@domain', 'email@email',
  'test@test', 'name@', 'info@example', 'admin@example',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// US phone patterns: (555) 123-4567 / 555-123-4567 / 555.123.4567 / +15551234567
const PHONE_REGEX = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g;

function isBusinessEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const parts = lower.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1] ?? '';
  const tld = domain.split('.').pop() ?? '';

  // Reject image/asset filenames (logo@2x.png, icon@3x.svg)
  if (ASSET_EXTENSIONS.has(tld)) return false;

  // Reject personal providers and known noise domains
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) return false;

  // Reject placeholder patterns
  if (PLACEHOLDER_PATTERNS.some((p) => lower.includes(p))) return false;

  // Must have a real-looking domain (at least one dot)
  if (!domain.includes('.')) return false;

  return true;
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmbedoBot/1.0)' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

export async function extractEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  // Normalize URL
  let base: string;
  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    base = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }

  const pagesToCheck = [base, `${base}/contact`, `${base}/contact-us`, `${base}/about`];

  for (const pageUrl of pagesToCheck) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;

    // Extract mailto: links first (most reliable)
    const mailtoMatches = html.match(/mailto:([^"'?>\s]+)/gi) ?? [];
    for (const m of mailtoMatches) {
      const email = m.replace(/^mailto:/i, '').split('?')[0];
      if (email && isBusinessEmail(email)) {
        log.debug({ email, url: pageUrl }, 'Found email via mailto');
        return email.toLowerCase();
      }
    }

    // Fall back to regex scan
    const emailMatches = html.match(EMAIL_REGEX) ?? [];
    for (const email of emailMatches) {
      if (isBusinessEmail(email)) {
        log.debug({ email, url: pageUrl }, 'Found email via regex');
        return email.toLowerCase();
      }
    }
  }

  return null;
}

/**
 * Scrape a website for a phone number.
 * Checks homepage, /contact, /contact-us, /about.
 * Returns the first well-formed US phone number found, or null.
 */
export async function extractPhoneFromWebsite(websiteUrl: string): Promise<string | null> {
  let base: string;
  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    base = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }

  const pagesToCheck = [base, `${base}/contact`, `${base}/contact-us`, `${base}/about`];

  for (const pageUrl of pagesToCheck) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;

    // tel: links are the most reliable
    const telMatches = html.match(/tel:([+\d\s().\-]{7,20})/gi) ?? [];
    for (const m of telMatches) {
      const raw = m.replace(/^tel:/i, '').trim();
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 10) {
        log.debug({ phone: raw, url: pageUrl }, 'Found phone via tel:');
        return raw;
      }
    }

    // Fall back to regex scan
    const phoneMatches = html.match(PHONE_REGEX) ?? [];
    for (const p of phoneMatches) {
      const digits = p.replace(/\D/g, '');
      if (digits.length >= 10) {
        log.debug({ phone: p, url: pageUrl }, 'Found phone via regex');
        return p.trim();
      }
    }
  }

  return null;
}
