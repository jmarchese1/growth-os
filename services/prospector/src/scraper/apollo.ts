import { createLogger } from '@embedo/utils';

const log = createLogger('apollo-scraper');

export interface ApolloContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  linkedin: string | null;
  confidence: number; // 0–100
}

export function extractDomain(websiteUrl: string): string | null {
  try {
    const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Score Apollo email_status values to a 0–100 confidence number
const EMAIL_STATUS_SCORE: Record<string, number> = {
  verified: 92,
  likely:   72,
  guessed:  50,
  unavailable: 25,
  notFound: 10,
};

/**
 * Find the best contact at a domain via Apollo.io People Match, then fall back
 * to a mixed_people/search filtered to owner/manager titles.
 */
export async function findEmailViaApollo(
  domain: string,
  apiKey: string,
): Promise<ApolloContact | null> {
  // ── Attempt 1: Apollo People Match by domain ────────────────────────────────
  try {
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        organization_domain: domain,
        reveal_personal_emails: true,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        person?: {
          email?: string;
          first_name?: string;
          last_name?: string;
          title?: string;
          linkedin_url?: string;
          email_status?: string;
        };
      };
      const person = data.person;
      if (person?.email) {
        log.debug({ domain, email: person.email }, 'Apollo people/match hit');
        return {
          email: person.email,
          firstName: person.first_name ?? null,
          lastName: person.last_name ?? null,
          position: person.title ?? null,
          linkedin: person.linkedin_url ?? null,
          confidence: EMAIL_STATUS_SCORE[person.email_status ?? ''] ?? 60,
        };
      }
    }
  } catch (err) {
    log.warn({ domain, err }, 'Apollo people/match failed');
  }

  // ── Attempt 2: Search for owner/manager at the domain ───────────────────────
  try {
    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        q_organization_domains: domain,
        page: 1,
        per_page: 5,
        // Prefer decision-makers at local businesses
        person_titles: ['owner', 'manager', 'general manager', 'founder', 'president', 'director', 'operator'],
        reveal_personal_emails: true,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        people?: Array<{
          email?: string;
          first_name?: string;
          last_name?: string;
          title?: string;
          linkedin_url?: string;
          email_status?: string;
        }>;
      };
      const person = data.people?.find((p) => p.email);
      if (person?.email) {
        log.debug({ domain, email: person.email }, 'Apollo mixed_people/search hit');
        return {
          email: person.email,
          firstName: person.first_name ?? null,
          lastName: person.last_name ?? null,
          position: person.title ?? null,
          linkedin: person.linkedin_url ?? null,
          confidence: EMAIL_STATUS_SCORE[person.email_status ?? ''] ?? 60,
        };
      }
    }
  } catch (err) {
    log.warn({ domain, err }, 'Apollo mixed_people/search failed');
  }

  log.info({ domain }, 'Apollo: no contact found');
  return null;
}

/**
 * Verify a known email address via Apollo people/match.
 * Apollo doesn't have a standalone verify endpoint, but match returns email_status.
 */
export async function verifyEmailViaApollo(
  email: string,
  apiKey: string,
): Promise<'deliverable' | 'undeliverable' | 'risky' | 'unknown'> {
  try {
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ email, reveal_personal_emails: true }),
    });

    if (!res.ok) return 'unknown';

    const data = (await res.json()) as { person?: { email_status?: string } };
    const status = data.person?.email_status;

    if (status === 'verified') return 'deliverable';
    if (status === 'invalid' || status === 'notFound') return 'undeliverable';
    if (status === 'guessed' || status === 'likely') return 'risky';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
