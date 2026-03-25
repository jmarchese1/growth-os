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

// ── Apollo Organization + People Discovery ──────────────────────────────────

export interface ApolloProspect {
  organizationName: string;
  organizationDomain: string | null;
  organizationPhone: string | null;
  organizationCity: string | null;
  organizationState: string | null;
  contact: ApolloContact | null;
}

export interface ApolloDiscoveryOptions {
  city: string;
  state?: string;
  industries: string[];         // Apollo industry tags
  employeeRanges: string[];     // e.g. ['1-10', '11-50']
  maxResults: number;
  personTitles?: string[];
}

/**
 * Discover businesses via Apollo Organization Search, then find contacts
 * at each organization via People Search. This is the full Apollo pipeline:
 * 1. Search organizations by location + industry + size
 * 2. For each org, search for people with owner/manager titles
 * 3. Return prospects with contact info
 */
export async function discoverViaApollo(
  apiKey: string,
  options: ApolloDiscoveryOptions,
): Promise<ApolloProspect[]> {
  const titles = options.personTitles ?? [
    'owner', 'manager', 'general manager', 'managing partner',
    'founder', 'president', 'director', 'operator', 'proprietor',
  ];

  // Step 1: Search for organizations
  const orgs = await searchApolloOrganizations(apiKey, options);
  log.info({ count: orgs.length, city: options.city }, 'Apollo org search complete');

  // Step 2: For each org, find people with target titles
  const prospects: ApolloProspect[] = [];

  for (const org of orgs) {
    if (prospects.length >= options.maxResults) break;

    const contact = await findPersonAtOrg(apiKey, org.id, titles);

    prospects.push({
      organizationName: org.name,
      organizationDomain: org.domain ?? null,
      organizationPhone: org.phone ?? null,
      organizationCity: org.city ?? null,
      organizationState: org.state ?? null,
      contact,
    });

    // Rate limit: ~3 req/sec to stay within Apollo limits
    await new Promise((r) => setTimeout(r, 350));
  }

  const withEmail = prospects.filter((p) => p.contact?.email);
  log.info(
    { total: prospects.length, withEmail: withEmail.length, city: options.city },
    'Apollo discovery complete',
  );

  return prospects;
}

interface ApolloOrg {
  id: string;
  name: string;
  domain: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

async function searchApolloOrganizations(
  apiKey: string,
  options: ApolloDiscoveryOptions,
): Promise<ApolloOrg[]> {
  const allOrgs: ApolloOrg[] = [];
  let page = 1;
  const perPage = 25;

  while (allOrgs.length < options.maxResults) {
    try {
      const body: Record<string, unknown> = {
        page,
        per_page: perPage,
        organization_locations: [
          options.state
            ? `${options.city}, ${options.state}, United States`
            : `${options.city}, United States`,
        ],
        organization_num_employees_ranges: options.employeeRanges,
      };

      if (options.industries.length > 0) {
        // Use both industry tag IDs and keywords for maximum coverage
        body['organization_industry_tag_ids'] = options.industries;
        body['organization_keywords'] = options.industries;
      }

      log.info({ body, page }, 'Apollo org search request');

      const res = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        log.warn({ status: res.status, page, responseBody: text }, 'Apollo org search failed');
        break;
      }

      const data = (await res.json()) as {
        organizations?: Array<{
          id?: string;
          name?: string;
          primary_domain?: string;
          phone?: string;
          city?: string;
          state?: string;
        }>;
        pagination?: { total_pages?: number; total_entries?: number };
      };

      log.info(
        { page, returned: data.organizations?.length ?? 0, totalEntries: data.pagination?.total_entries },
        'Apollo org search response',
      );

      const orgs = data.organizations ?? [];
      if (orgs.length === 0) break;

      for (const org of orgs) {
        if (allOrgs.length >= options.maxResults) break;
        if (!org.id || !org.name) continue;
        allOrgs.push({
          id: org.id,
          name: org.name,
          domain: org.primary_domain ?? null,
          phone: org.phone ?? null,
          city: org.city ?? null,
          state: org.state ?? null,
        });
      }

      const totalPages = data.pagination?.total_pages ?? 1;
      if (page >= totalPages) break;
      page++;

      await new Promise((r) => setTimeout(r, 350));
    } catch (err) {
      log.warn({ err, page }, 'Apollo org search error');
      break;
    }
  }

  return allOrgs;
}

async function findPersonAtOrg(
  apiKey: string,
  orgId: string,
  titles: string[],
): Promise<ApolloContact | null> {
  try {
    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        organization_ids: [orgId],
        page: 1,
        per_page: 5,
        person_titles: titles,
        reveal_personal_emails: true,
      }),
    });

    if (!res.ok) return null;

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
    if (!person?.email) return null;

    return {
      email: person.email,
      firstName: person.first_name ?? null,
      lastName: person.last_name ?? null,
      position: person.title ?? null,
      linkedin: person.linkedin_url ?? null,
      confidence: EMAIL_STATUS_SCORE[person.email_status ?? ''] ?? 60,
    };
  } catch (err) {
    log.warn({ orgId, err }, 'Apollo people search for org failed');
    return null;
  }
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
