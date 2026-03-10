import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:hunter');

export interface HunterContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  linkedin: string | null;
  confidence: number;
}

interface HunterEmailResult {
  value: string;
  type: string;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  linkedin: string | null;
}

interface HunterDomainSearchResponse {
  data?: {
    emails?: HunterEmailResult[];
  };
  errors?: Array<{ id: string; code: number; details: string }>;
}

/**
 * Look up the best contact email for a business domain using Hunter.io.
 * Returns null if no email found, API key missing, or request fails.
 *
 * Starter plan: $49/mo — 2,000 credits/month
 * Free tier: 50 credits/month (no card needed — good for dev/testing)
 * Sign up: https://hunter.io/users/sign_up
 */
export async function findEmailViaHunter(
  domain: string,
  apiKey: string,
): Promise<HunterContact | null> {
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&api_key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      log.warn({ domain, status: res.status }, 'Hunter.io request failed');
      return null;
    }

    const json = (await res.json()) as HunterDomainSearchResponse;

    if (json.errors?.length) {
      log.warn({ domain, errors: json.errors }, 'Hunter.io API error');
      return null;
    }

    const emails = json.data?.emails ?? [];
    if (emails.length === 0) return null;

    // Prefer personal emails (not generic info@/contact@) with highest confidence
    const best =
      emails.find((e) => e.type === 'personal') ??
      emails.sort((a, b) => b.confidence - a.confidence)[0];

    if (!best) return null;

    log.info({ domain, email: best.value, confidence: best.confidence }, 'Hunter.io found email');

    return {
      email: best.value.toLowerCase(),
      firstName: best.first_name ?? null,
      lastName: best.last_name ?? null,
      position: best.position ?? null,
      linkedin: best.linkedin ?? null,
      confidence: best.confidence,
    };
  } catch {
    log.warn({ domain }, 'Hunter.io request threw — skipping');
    return null;
  }
}

/** Extract the root domain from a website URL for Hunter.io lookup */
export function extractDomain(websiteUrl: string): string | null {
  try {
    const parsed = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
