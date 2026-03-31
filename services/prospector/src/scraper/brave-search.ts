import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:brave-search');

const BRAVE_SEARCH_BASE = 'https://api.search.brave.com/res/v1/web/search';

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Domains to skip — platform/directory sites that won't have the actual business email
const SKIP_DOMAINS = new Set([
  'yelp.com', 'tripadvisor.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'opentable.com', 'grubhub.com', 'doordash.com',
  'ubereats.com', 'toasttab.com', 'foursquare.com', 'zomato.com',
  'yellowpages.com', 'whitepages.com', 'bbb.org', 'mapquest.com',
  'linkedin.com', 'pinterest.com', 'tiktok.com', 'reddit.com',
]);

// Known noise / platform emails to reject
const NOISE_DOMAINS = new Set([
  'sentry.io', 'wixpress.com', 'squarespace.com', 'godaddy.com',
  'mailchimp.com', 'constantcontact.com', 'hubspot.com',
  'googleapis.com', 'google.com', 'example.com',
]);

// Placeholder patterns
const PLACEHOLDER_PATTERNS = [
  'example.com', 'placeholder', 'youremail', 'user@domain', 'email@email',
  'test@test', 'noreply', 'no-reply', 'donotreply',
];

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[];
  };
}

function isValidBusinessEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1] ?? '';
  const tld = domain.split('.').pop() ?? '';

  // Reject asset filenames
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'js', 'css'].includes(tld)) return false;

  // Reject noise domains
  if (NOISE_DOMAINS.has(domain)) return false;

  // Reject placeholders
  if (PLACEHOLDER_PATTERNS.some(p => lower.includes(p))) return false;

  // Reject all-numeric local part
  const localPart = lower.split('@')[0] ?? '';
  if (/^\d+$/.test(localPart)) return false;

  return domain.includes('.');
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return null;
    return res.text();
  } catch {
    return null;
  }
}

function extractAllEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return [...new Set(matches.map(e => e.toLowerCase()).filter(isValidBusinessEmail))];
}

/**
 * Search for a business email using Brave Search API.
 *
 * Strategy:
 * 1. Search for business name + city + "email" / "contact"
 * 2. Extract emails from search result snippets
 * 3. Visit the top 3 non-directory result pages and scrape them for emails
 * 4. Return the best match (prefer custom domain, then business-name Gmail)
 */
export async function findBusinessEmail(
  businessName: string,
  city: string,
  apiKey: string,
): Promise<string | null> {
  const query = `"${businessName}" "${city}" restaurant contact email`;

  try {
    // Brave free tier: 1 req/sec — throttle to avoid 429
    await new Promise((r) => setTimeout(r, 1500));

    const params = new URLSearchParams({ q: query, count: '10' });
    const res = await fetch(`${BRAVE_SEARCH_BASE}?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!res.ok) {
      log.warn({ status: res.status, businessName }, 'Brave Search request failed');
      return null;
    }

    const data = (await res.json()) as BraveSearchResponse;
    const results = data.web?.results ?? [];

    // Collect all emails found across snippets and visited pages
    const allEmails: Array<{ email: string; fromPage: boolean; domain: string }> = [];

    // Phase 1: Extract from search result snippets (fast, no extra requests)
    for (const result of results) {
      const searchText = `${result.title} ${result.description ?? ''}`;
      for (const email of extractAllEmails(searchText)) {
        allEmails.push({ email, fromPage: false, domain: email.split('@')[1]! });
      }
    }

    // Phase 2: Visit top non-directory pages and scrape for emails
    const pagesToVisit = results
      .filter(r => {
        try {
          const host = new URL(r.url).host.replace(/^www\./, '');
          return !SKIP_DOMAINS.has(host) && ![...SKIP_DOMAINS].some(d => host.endsWith(`.${d}`));
        } catch { return false; }
      })
      .slice(0, 3); // max 3 pages to visit

    for (const result of pagesToVisit) {
      // Small delay between page fetches
      await new Promise((r) => setTimeout(r, 500));

      const html = await fetchPageText(result.url);
      if (!html) continue;

      for (const email of extractAllEmails(html)) {
        allEmails.push({ email, fromPage: true, domain: email.split('@')[1]! });
      }

      // Also check mailto: links specifically
      const mailtoMatches = html.match(/mailto:([^"'?>\s&]+)/gi) ?? [];
      for (const m of mailtoMatches) {
        const raw = m.replace(/^mailto:/i, '').split('?')[0]?.trim();
        if (!raw) continue;
        const email = decodeURIComponent(raw).toLowerCase();
        if (isValidBusinessEmail(email) && !allEmails.some(e => e.email === email)) {
          allEmails.push({ email, fromPage: true, domain: email.split('@')[1]! });
        }
      }
    }

    if (allEmails.length === 0) return null;

    // Score and pick the best email
    const nameWords = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);

    const scored = allEmails.map(({ email, fromPage, domain }) => {
      let score = 0;

      // Found on an actual page vs just a snippet
      if (fromPage) score += 10;

      // Custom domain (not free email) — strong signal
      const isFree = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'].includes(domain);
      if (!isFree) {
        score += 30;
      } else {
        // Free email — check if local part contains business name words
        const local = email.split('@')[0]!.replace(/[^a-z0-9]/g, '');
        const hasBusinessWord = nameWords.some(w => local.includes(w));
        if (hasBusinessWord) score += 20;
        else score += 2; // random free email — low confidence
      }

      // Role prefix bonus
      const local = email.split('@')[0] ?? '';
      if (/^(info|contact|hello|book|reserv|order|catering|events)/.test(local)) score += 5;
      if (/^(owner|manager|gm|chef)/.test(local)) score += 8;

      return { email, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]!;

    log.info({ businessName, city, email: best.email, score: best.score, totalFound: scored.length }, 'Found email via Brave Search');
    return best.email;
  } catch (err) {
    log.warn({ err, businessName }, 'Brave Search failed — skipping');
  }

  return null;
}
