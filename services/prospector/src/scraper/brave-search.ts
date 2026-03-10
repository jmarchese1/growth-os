import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:brave-search');

const BRAVE_SEARCH_BASE = 'https://api.search.brave.com/res/v1/web/search';

// Personal email domains to filter out
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'me.com', 'live.com', 'msn.com',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

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

function extractBusinessEmail(text: string): string | null {
  const matches = text.match(EMAIL_REGEX) ?? [];
  for (const email of matches) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && !PERSONAL_DOMAINS.has(domain)) {
      return email.toLowerCase();
    }
  }
  return null;
}

/**
 * Search for a business email using Brave Search API.
 * Used as a fallback when Geoapify + website scraping yields no email.
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

    const params = new URLSearchParams({ q: query, count: '5' });
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

    for (const result of results) {
      const searchText = `${result.title} ${result.description ?? ''}`;
      const email = extractBusinessEmail(searchText);
      if (email) {
        log.info({ businessName, city, email }, 'Found email via Brave Search');
        return email;
      }
    }
  } catch (err) {
    log.warn({ err, businessName }, 'Brave Search failed — skipping');
  }

  return null;
}
