import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:social-email');

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

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

/**
 * Extract email from a Facebook business page.
 * Scrapes the "About" section which often has contact info.
 * Works with public pages only (no login required).
 */
export async function extractEmailFromFacebook(
  businessName: string,
  _city?: string,
): Promise<string | null> {
  try {
    // Search for the Facebook page via a regular search engine approach
    // Facebook's public pages at /about often show email
    // We'll try common URL patterns
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 30);
    const urlsToTry = [
      `https://www.facebook.com/${slug}/about`,
      `https://www.facebook.com/${slug}`,
    ];

    for (const url of urlsToTry) {
      const html = await fetchPage(url);
      if (!html) continue;

      // Facebook pages often have the email in structured data or visible text
      // Look for email patterns near "Email" labels
      const emailSection = html.match(/email[^<]*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi);
      if (emailSection) {
        for (const match of emailSection) {
          const emails = match.match(EMAIL_REGEX);
          if (emails?.[0]) {
            log.info({ businessName, email: emails[0], url }, 'Email found via Facebook');
            return emails[0].toLowerCase();
          }
        }
      }

      // Fallback: any email on the page
      const allEmails = html.match(EMAIL_REGEX) ?? [];
      for (const email of allEmails) {
        const domain = email.split('@')[1]?.toLowerCase() ?? '';
        // Skip Facebook's own emails and platform noise
        if (domain.includes('facebook') || domain.includes('fbcdn') || domain.includes('example')) continue;
        log.info({ businessName, email, url }, 'Email found via Facebook (regex)');
        return email.toLowerCase();
      }
    }
  } catch (err) {
    log.debug({ err, businessName }, 'Facebook scrape failed');
  }

  return null;
}

/**
 * Extract email from an Instagram profile bio.
 * Instagram renders bios in the initial HTML for public profiles.
 */
export async function extractEmailFromInstagram(
  businessName: string,
): Promise<string | null> {
  try {
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 30);
    const url = `https://www.instagram.com/${slug}/`;

    const html = await fetchPage(url);
    if (!html) return null;

    // Instagram includes profile data in JSON-LD or in the page source
    // Look for emails in the bio section
    const emails = html.match(EMAIL_REGEX) ?? [];
    for (const email of emails) {
      const domain = email.split('@')[1]?.toLowerCase() ?? '';
      // Skip Instagram/Meta platform emails
      if (domain.includes('instagram') || domain.includes('facebook') || domain.includes('cdninstagram') || domain.includes('example')) continue;
      log.info({ businessName, email, url }, 'Email found via Instagram bio');
      return email.toLowerCase();
    }
  } catch (err) {
    log.debug({ err, businessName }, 'Instagram scrape failed');
  }

  return null;
}

/**
 * Search Google Business Profile for email.
 * Requires GOOGLE_PLACES_API_KEY. Gracefully returns null if key not set.
 */
export async function extractEmailFromGooglePlaces(
  googlePlaceId: string | null | undefined,
  apiKey: string | null | undefined,
): Promise<string | null> {
  if (!googlePlaceId || !apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=website,formatted_phone_number,name&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    // Google Places doesn't directly return email, but the website field can be used
    // for further scraping. This is mainly a fallback to get a website URL if Geoapify didn't have one.
    // For now, return null — the website scraper handles the actual email extraction.
    await res.json(); // consume body
    return null;
  } catch {
    return null;
  }
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
