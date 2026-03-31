import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:website-email');

// ─── Constants ──────────────────────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g;

// File extensions that appear in image/asset filenames containing @ (e.g. logo@2x.png)
const ASSET_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico',
  'pdf', 'js', 'css', 'html', 'htm', 'mp4', 'mov', 'woff', 'woff2',
]);

// Placeholder / example emails that are never real
const PLACEHOLDER_PATTERNS = [
  'example.com', 'placeholder', 'youremail', 'user@domain', 'email@email',
  'test@test', 'name@company', 'info@example', 'admin@example', 'noreply',
  'no-reply', 'donotreply', 'mailer-daemon', 'postmaster@', 'webmaster@',
  'wordpress@', 'wix.com', 'squarespace.com', 'godaddy.com', 'sentry.io',
];

// Known free/personal email providers
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'live.com', 'msn.com', 'me.com',
  'protonmail.com', 'zoho.com', 'ymail.com', 'mail.com',
  'comcast.net', 'att.net', 'verizon.net', 'cox.net', 'sbcglobal.net',
]);

// SaaS / platform domains that appear in scraped HTML but are never business contact emails
const NOISE_DOMAINS = new Set([
  'sentry.io', 'sentry-next.wixpress.com', 'wixpress.com',
  'mailchimp.com', 'constantcontact.com', 'sendgrid.net',
  'hubspot.com', 'salesforce.com', 'intercom.io',
  'googleapis.com', 'google.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'yelp.com', 'tripadvisor.com', 'opentable.com',
  'grubhub.com', 'doordash.com', 'ubereats.com', 'toasttab.com',
  'squareup.com', 'clover.com', 'stripe.com', 'paypal.com',
]);

// Contact page paths to check (ordered by likelihood of having emails)
const CONTACT_PATHS = [
  '', // homepage
  '/contact',
  '/contact-us',
  '/about',
  '/about-us',
  '/connect',
  '/location',
  '/locations',
  '/info',
  '/our-story',
  '/team',
  '/our-team',
];

// ─── Email quality scoring ──────────────────────────────────────────────────

interface ScoredEmail {
  email: string;
  score: number;
  source: 'mailto' | 'regex' | 'contact_link';
  page: string;
}

/**
 * Score an email address for quality. Higher = better.
 * Considers: source (mailto vs regex), page context, domain type, role prefix.
 */
function scoreEmail(
  email: string,
  source: 'mailto' | 'regex' | 'contact_link',
  pageUrl: string,
  websiteDomain: string,
  businessName: string,
): number {
  const lower = email.toLowerCase();
  const [localPart, domain] = lower.split('@') as [string, string];
  const isContactPage = /\/(contact|about|connect|team|info|location)/i.test(pageUrl);
  const isFreeEmail = FREE_EMAIL_DOMAINS.has(domain);
  const isCustomDomain = domain === websiteDomain || domain.includes(websiteDomain.replace(/^www\./, ''));

  let score = 0;

  // Source quality
  if (source === 'mailto') score += 30;      // mailto: links are intentional
  else if (source === 'contact_link') score += 25;
  else score += 10;                           // raw regex match

  // Page context
  if (isContactPage) score += 20;             // found on contact/about page
  else score += 5;                            // found on homepage or other

  // Domain quality (biggest differentiator)
  if (isCustomDomain) {
    score += 40;                              // matches the website domain — best signal
  } else if (isFreeEmail) {
    // Gmail/Yahoo — acceptable for restaurants but needs business name match
    const nameParts = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const localNormalized = localPart.replace(/[^a-z0-9]/g, '');
    const hasBusinessWord = nameParts.some(word => localNormalized.includes(word));
    if (hasBusinessWord) {
      score += 25;                            // mariostrattoria@gmail.com for "Mario's Trattoria"
    } else {
      score += 5;                             // random gmail — low confidence but not zero
    }
  } else {
    score += 15;                              // other custom domain (could be owner's other business)
  }

  // Role prefix bonus — owner/manager/general contact emails are best
  if (/^(info|contact|hello|hi|inquir|book|reserv|order|catering|events)/.test(localPart)) {
    score += 10;                              // generic business inbox — likely monitored
  } else if (/^(owner|manager|gm|chef|admin)/.test(localPart)) {
    score += 15;                              // decision maker email
  }

  // Penalty for likely automated/system emails
  if (/^(support|help|billing|sales|marketing|newsletter|notifications?)/.test(localPart)) {
    score -= 10;
  }

  return score;
}

// ─── Validation ─────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const parts = lower.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1] ?? '';
  const tld = domain.split('.').pop() ?? '';

  // Reject image/asset filenames (logo@2x.png, icon@3x.svg)
  if (ASSET_EXTENSIONS.has(tld)) return false;

  // Reject noise/platform domains
  if (NOISE_DOMAINS.has(domain)) return false;

  // Reject placeholder patterns
  if (PLACEHOLDER_PATTERNS.some((p) => lower.includes(p))) return false;

  // Must have a real-looking domain (at least one dot)
  if (!domain.includes('.')) return false;

  // Local part sanity: 1-64 chars, domain: 3+ chars
  const localPart = parts[0] ?? '';
  if (localPart.length < 1 || localPart.length > 64) return false;
  if (domain.length < 3) return false;

  // Reject if local part is all numbers (tracking pixels, IDs)
  if (/^\d+$/.test(localPart)) return false;

  return true;
}

// ─── HTML fetching ──────────────────────────────────────────────────────────

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) return null;
    return res.text();
  } catch {
    return null;
  }
}

// ─── Email extraction from HTML ─────────────────────────────────────────────

function extractEmailsFromHtml(html: string, pageUrl: string, websiteDomain: string, businessName: string): ScoredEmail[] {
  const found: ScoredEmail[] = [];
  const seen = new Set<string>();

  // 1. mailto: links (highest confidence — intentionally placed by site owner)
  const mailtoMatches = html.match(/mailto:([^"'?>\s&]+)/gi) ?? [];
  for (const m of mailtoMatches) {
    const raw = m.replace(/^mailto:/i, '').split('?')[0]?.trim();
    if (!raw) continue;
    const email = decodeURIComponent(raw).toLowerCase();
    if (seen.has(email) || !isValidEmail(email)) continue;
    seen.add(email);
    found.push({ email, score: scoreEmail(email, 'mailto', pageUrl, websiteDomain, businessName), source: 'mailto', page: pageUrl });
  }

  // 2. Regex scan of full HTML
  const regexMatches = html.match(EMAIL_REGEX) ?? [];
  for (const raw of regexMatches) {
    const email = raw.toLowerCase();
    if (seen.has(email) || !isValidEmail(email)) continue;
    seen.add(email);
    found.push({ email, score: scoreEmail(email, 'regex', pageUrl, websiteDomain, businessName), source: 'regex', page: pageUrl });
  }

  return found;
}

/**
 * Find contact-related links in the HTML that we should also scrape.
 * Returns absolute URLs for pages like "/contact", "/about", custom paths.
 */
function findContactLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();

  // Match <a href="..."> where text or href contains contact-related keywords
  const anchorRegex = /<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1]?.trim();
    const text = (match[2] ?? '').replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (!href) continue;

    const isContactLink = /contact|about|connect|reach|email|location|find.?us|get.?in.?touch/i.test(href) ||
                          /contact|about|connect|reach us|email us|find us|get in touch|our team|our story/i.test(text);

    if (!isContactLink) continue;

    // Skip external links, anchors, mailto, tel
    if (/^(mailto:|tel:|https?:\/\/(?!.*\b))/i.test(href)) continue;

    try {
      const absolute = new URL(href, baseUrl).href;
      // Only follow links on the same domain
      if (!absolute.startsWith(baseUrl.replace(/\/$/, ''))) continue;
      if (seen.has(absolute)) continue;
      seen.add(absolute);
      links.push(absolute);
    } catch {
      continue;
    }
  }

  return links.slice(0, 5); // cap at 5 extra pages
}

// ─── Playwright fallback ────────────────────────────────────────────────────

let playwrightAvailable: boolean | null = null;

/**
 * Try to render a page with Playwright (headless Chromium) and extract emails.
 * Only used as a fallback when plain fetch finds nothing.
 * Returns null if Playwright is not installed or fails.
 */
async function extractEmailsWithPlaywright(
  url: string,
  websiteDomain: string,
  businessName: string,
): Promise<ScoredEmail[]> {
  // Check if Playwright is available (cache the check)
  if (playwrightAvailable === false) return [];

  try {
    // Dynamic import — doesn't crash if playwright isn't installed
    const pw = await import('playwright');
    playwrightAvailable = true;

    const browser = await pw.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();

      // Block unnecessary resources to speed up loading
      await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,mp4,mov,css}', (route) => route.abort());
      await page.route('**/analytics**', (route) => route.abort());
      await page.route('**/tracking**', (route) => route.abort());
      await page.route('**/google-analytics**', (route) => route.abort());
      await page.route('**/gtag**', (route) => route.abort());

      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

      // Wait a moment for any late-loading contact info
      await page.waitForTimeout(2000);

      const html = await page.content();
      await browser.close();

      return extractEmailsFromHtml(html, url, websiteDomain, businessName);
    } catch (err) {
      await browser.close();
      log.debug({ err, url }, 'Playwright page load failed');
      return [];
    }
  } catch {
    playwrightAvailable = false;
    log.debug('Playwright not available — skipping JS rendering fallback');
    return [];
  }
}

// ─── Main extraction function ───────────────────────────────────────────────

export interface EmailExtractionResult {
  email: string;
  score: number;
  source: string;
  page: string;
  allFound: Array<{ email: string; score: number }>;
}

/**
 * Extract the best email from a website.
 *
 * Strategy:
 * 1. Plain fetch homepage + known contact paths (fast)
 * 2. Follow any contact-related links found in the HTML
 * 3. If nothing found, try Playwright to render JS-heavy sites
 * 4. Score all emails found, return the highest quality one
 */
export async function extractEmailFromWebsite(
  websiteUrl: string,
  businessName: string = '',
): Promise<EmailExtractionResult | null> {
  // Normalize URL
  let base: string;
  let websiteDomain: string;
  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    base = `${parsed.protocol}//${parsed.host}`;
    websiteDomain = parsed.host.replace(/^www\./, '');
  } catch {
    return null;
  }

  const allEmails: ScoredEmail[] = [];
  const fetchedUrls = new Set<string>();

  // Phase 1: Fetch known contact pages with plain HTTP
  const pagesToCheck = CONTACT_PATHS.map(p => `${base}${p}`);

  for (const pageUrl of pagesToCheck) {
    if (fetchedUrls.has(pageUrl)) continue;
    fetchedUrls.add(pageUrl);

    const html = await fetchHtml(pageUrl);
    if (!html) continue;

    const emails = extractEmailsFromHtml(html, pageUrl, websiteDomain, businessName);
    allEmails.push(...emails);

    // Phase 2: Follow contact links found in this page's HTML
    if (fetchedUrls.size <= 3) { // only discover links from first few pages
      const contactLinks = findContactLinks(html, base);
      for (const link of contactLinks) {
        if (fetchedUrls.has(link)) continue;
        fetchedUrls.add(link);

        const linkHtml = await fetchHtml(link);
        if (!linkHtml) continue;

        const linkEmails = extractEmailsFromHtml(linkHtml, link, websiteDomain, businessName);
        allEmails.push(...linkEmails);
      }
    }

    // If we already found a high-quality email (custom domain + mailto), skip remaining pages
    const bestSoFar = allEmails.reduce((best, e) => e.score > best.score ? e : best, { score: 0 } as ScoredEmail);
    if (bestSoFar.score >= 70) break;
  }

  // Phase 3: If nothing found via plain fetch, try Playwright for JS-rendered sites
  if (allEmails.length === 0) {
    log.debug({ url: base, businessName }, 'No emails from plain fetch — trying Playwright');
    const playwrightEmails = await extractEmailsWithPlaywright(base, websiteDomain, businessName);
    allEmails.push(...playwrightEmails);

    // Also try the /contact page with Playwright if homepage yielded nothing
    if (playwrightEmails.length === 0) {
      const contactEmails = await extractEmailsWithPlaywright(`${base}/contact`, websiteDomain, businessName);
      allEmails.push(...contactEmails);
    }
  }

  if (allEmails.length === 0) return null;

  // Dedupe and sort by score
  const deduped = new Map<string, ScoredEmail>();
  for (const e of allEmails) {
    const existing = deduped.get(e.email);
    if (!existing || e.score > existing.score) {
      deduped.set(e.email, e);
    }
  }

  const sorted = [...deduped.values()].sort((a, b) => b.score - a.score);
  const best = sorted[0]!;

  log.info(
    { email: best.email, score: best.score, source: best.source, page: best.page, totalFound: sorted.length, businessName },
    'Best email selected',
  );

  return {
    email: best.email,
    score: best.score,
    source: best.source,
    page: best.page,
    allFound: sorted.map(e => ({ email: e.email, score: e.score })),
  };
}

// ─── Phone extraction (unchanged logic, improved paths) ─────────────────────

export async function extractPhoneFromWebsite(websiteUrl: string): Promise<string | null> {
  let base: string;
  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    base = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }

  const pagesToCheck = CONTACT_PATHS.map(p => `${base}${p}`);

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
