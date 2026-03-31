import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:social-email');

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Noise emails to skip on social pages
const NOISE_DOMAINS = new Set([
  'facebook.com', 'instagram.com', 'fbcdn.net', 'cdninstagram.com',
  'example.com', 'sentry.io', 'wixpress.com', 'google.com',
]);

async function fetchPage(url: string, timeoutMs = 10000): Promise<string | null> {
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
    return res.text();
  } catch {
    return null;
  }
}

function extractValidEmails(html: string): string[] {
  const emails = html.match(EMAIL_REGEX) ?? [];
  return [...new Set(emails)]
    .map(e => e.toLowerCase())
    .filter(e => {
      const domain = e.split('@')[1] ?? '';
      return !NOISE_DOMAINS.has(domain) && !domain.endsWith('.png') && !domain.endsWith('.jpg');
    });
}

/**
 * Extract social media links (Facebook, Instagram) from a website's HTML.
 * Looks for <a> tags linking to facebook.com and instagram.com.
 */
export function extractSocialLinksFromHtml(html: string): { facebook?: string; instagram?: string } {
  const result: { facebook?: string; instagram?: string } = {};

  // Facebook: look for links to facebook.com/pagename (check ALL matches, not just first)
  const fbMatches = html.matchAll(/href\s*=\s*["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'?\s#]+)/gi);
  for (const m of fbMatches) {
    const url = m[1];
    if (!url) continue;
    // Skip share/sharer links, login links, and generic facebook.com
    if (/\/(sharer|share|login|dialog|plugins|tr\?)/.test(url)) continue;
    if (url === 'https://facebook.com/' || url === 'https://www.facebook.com/') continue;
    result.facebook = url;
    break;
  }

  // Instagram: look for links to instagram.com/handle (check ALL matches)
  const igMatches = html.matchAll(/href\s*=\s*["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'?\s#]+)/gi);
  for (const m of igMatches) {
    const url = m[1];
    if (!url) continue;
    // Skip share/embed links and generic instagram.com
    if (/\/(accounts|explore|p\/|reel\/|stories\/)/.test(url)) continue;
    if (url === 'https://instagram.com/' || url === 'https://www.instagram.com/') continue;
    result.instagram = url;
    break;
  }

  return result;
}

/**
 * Extract email from a known Facebook page URL.
 * Tries plain fetch first, falls back to Playwright for JS-rendered pages.
 */
export async function extractEmailFromFacebook(
  facebookUrl: string | null | undefined,
): Promise<string | null> {
  if (!facebookUrl) return null;

  // Normalize to /about page which shows contact info
  let aboutUrl = facebookUrl.replace(/\/$/, '');
  if (!aboutUrl.endsWith('/about')) {
    aboutUrl = `${aboutUrl}/about`;
  }

  try {
    // Try plain fetch first (works for some public pages)
    const html = await fetchPage(aboutUrl);
    if (html) {
      const emails = extractValidEmails(html);
      if (emails[0]) {
        log.info({ email: emails[0], url: aboutUrl }, 'Email found via Facebook (fetch)');
        return emails[0];
      }
    }

    // Try Playwright for JS-rendered Facebook pages
    try {
      const pw = await import('playwright');
      const browser = await pw.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        const page = await browser.newPage();
        await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,mp4,css}', (route) => route.abort());
        await page.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);

        const content = await page.content();
        await browser.close();

        const emails = extractValidEmails(content);
        if (emails[0]) {
          log.info({ email: emails[0], url: aboutUrl }, 'Email found via Facebook (Playwright)');
          return emails[0];
        }
      } catch {
        await browser.close();
      }
    } catch {
      // Playwright not available
    }
  } catch (err) {
    log.debug({ err, url: facebookUrl }, 'Facebook email extraction failed');
  }

  return null;
}

/**
 * Extract email from a known Instagram profile URL.
 * Instagram profiles need JS rendering to show contact info.
 */
export async function extractEmailFromInstagram(
  instagramUrl: string | null | undefined,
): Promise<string | null> {
  if (!instagramUrl) return null;

  try {
    // Instagram almost always needs JS rendering
    const pw = await import('playwright');
    const browser = await pw.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,mp4}', (route) => route.abort());
      await page.goto(instagramUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);

      const content = await page.content();
      await browser.close();

      // Look for email in the bio text / page metadata
      const emails = extractValidEmails(content);
      if (emails[0]) {
        log.info({ email: emails[0], url: instagramUrl }, 'Email found via Instagram');
        return emails[0];
      }
    } catch {
      await browser.close();
    }
  } catch {
    // Playwright not available — try plain fetch as last resort
    const html = await fetchPage(instagramUrl);
    if (html) {
      const emails = extractValidEmails(html);
      if (emails[0]) {
        log.info({ email: emails[0], url: instagramUrl }, 'Email found via Instagram (fetch)');
        return emails[0];
      }
    }
  }

  return null;
}

/**
 * Hunter.io email finder.
 * Takes a domain and returns the best email + metadata.
 * Gracefully returns null if API key not set.
 */
export async function findEmailViaHunterDomain(
  domain: string,
  apiKey: string | null | undefined,
): Promise<{
  email: string;
  confidence: number;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
} | null> {
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      domain,
      api_key: apiKey,
      limit: '5',
    });
    const res = await fetch(`https://api.hunter.io/v2/domain-search?${params}`);
    if (!res.ok) {
      log.warn({ status: res.status, domain }, 'Hunter.io request failed');
      return null;
    }

    const data = (await res.json()) as {
      data?: {
        emails?: Array<{
          value: string;
          confidence: number;
          first_name?: string;
          last_name?: string;
          position?: string;
          type?: string; // "personal" | "generic"
        }>;
      };
    };

    const emails = data.data?.emails ?? [];
    if (emails.length === 0) return null;

    // Prefer generic emails (info@, contact@) for cold outreach — they're more likely monitored
    const generic = emails.find(e => e.type === 'generic');
    const best = generic ?? emails[0]!;

    log.info({ domain, email: best.value, confidence: best.confidence }, 'Email found via Hunter.io');
    return {
      email: best.value.toLowerCase(),
      confidence: best.confidence,
      firstName: best.first_name ?? null,
      lastName: best.last_name ?? null,
      position: best.position ?? null,
    };
  } catch (err) {
    log.warn({ err, domain }, 'Hunter.io failed');
    return null;
  }
}
