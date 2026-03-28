import { createLogger } from '@embedo/utils';
import { extractEmailFromWebsite } from './website-email.js';
import { findBusinessEmail } from './brave-search.js';

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

  // ── Attempt 2: Search for owner/manager at the domain via api_search + match ─
  try {
    const searchRes = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
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
        person_titles: ['owner', 'manager', 'general manager', 'founder', 'president', 'director', 'operator'],
      }),
    });

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        people?: Array<{ id?: string; has_email?: boolean }>;
      };
      const candidate = searchData.people?.find((p) => p.id && p.has_email);
      if (candidate?.id) {
        // Reveal email via people/match
        const matchRes = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify({ id: candidate.id, reveal_personal_emails: true }),
        });
        if (matchRes.ok) {
          const matchData = (await matchRes.json()) as {
            person?: { email?: string; first_name?: string; last_name?: string; title?: string; linkedin_url?: string; email_status?: string };
          };
          const person = matchData.person;
          if (person?.email) {
            log.debug({ domain, email: person.email }, 'Apollo api_search+match hit');
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
      }
    }
  } catch (err) {
    log.warn({ domain, err }, 'Apollo api_search+match failed');
  }

  log.info({ domain }, 'Apollo: no contact found');
  return null;
}

// ── Apollo Organization + People Discovery ──────────────────────────────────

export interface ApolloProspect {
  apolloOrgId: string;
  organizationName: string;
  organizationDomain: string | null;
  organizationPhone: string | null;
  organizationCity: string | null;
  organizationState: string | null;
  organizationLinkedin: string | null;
  organizationFacebook: string | null;
  organizationTwitter: string | null;
  organizationLogo: string | null;
  organizationRevenue: string | null;
  organizationFoundedYear: number | null;
  organizationSicCodes: string[];
  organizationNaicsCodes: string[];
  contact: ApolloContact | null;
  emailSource: 'apollo' | 'website' | 'brave_search' | null;
}

export interface ApolloDiscoveryOptions {
  city: string;
  state?: string;
  industries: string[];         // Apollo keyword tags (e.g. ['restaurants'])
  sicCodes?: string[];          // SIC codes (e.g. ['5812'] = Eating Places)
  employeeRanges: string[];     // e.g. ['1-10', '11-50']
  maxResults: number;
  startPage?: number;           // Skip to this page (1-based). For offset-based dedup to avoid burning credits.
  excludeOrgIds?: string[] | undefined; // Apollo org IDs to exclude from results (prevents credit waste on people search)
  personTitles?: string[];
  braveApiKey?: string;         // Brave Search API key for email fallback
}

/**
 * Discover businesses via Apollo Organization Search, then find contacts
 * at each organization via People Search. This is the full Apollo pipeline:
 * 1. Search organizations by location + industry + size
 * 2. For each org, search for people with owner/manager titles
 * 3. Return prospects with contact info
 */
export interface ApolloDiscoveryResult {
  prospects: ApolloProspect[];
  totalEntries: number; // Total businesses matching this search in Apollo's database
}

export async function discoverViaApollo(
  apiKey: string,
  options: ApolloDiscoveryOptions,
): Promise<ApolloDiscoveryResult> {
  const titles = options.personTitles ?? [
    'owner', 'manager', 'general manager', 'managing partner',
    'founder', 'president', 'director', 'operator', 'proprietor',
  ];

  // Step 1: Search for organizations
  const { orgs, totalEntries } = await searchApolloOrganizations(apiKey, options);
  log.info({ count: orgs.length, totalEntries, city: options.city }, 'Apollo org search complete');

  // Step 2: For each org, find people with target titles
  const prospects: ApolloProspect[] = [];

  for (const org of orgs) {
    if (prospects.length >= options.maxResults) break;

    let contact = await findPersonAtOrg(apiKey, org.id, titles);
    let emailSource: 'apollo' | 'website' | 'brave_search' | null = contact?.email ? 'apollo' : null;

    // Email fallback: website scraping → Brave Search
    if (!contact?.email && org.domain) {
      log.debug({ orgName: org.name, domain: org.domain }, 'Apollo no email — trying website scrape');
      const websiteEmail = await extractEmailFromWebsite(`https://${org.domain}`);
      if (websiteEmail) {
        log.info({ orgName: org.name, email: websiteEmail }, 'Email found via website scrape');
        contact = contact ?? { email: '', firstName: null, lastName: null, position: null, linkedin: null, confidence: 0 };
        contact.email = websiteEmail;
        contact.confidence = 45;
        emailSource = 'website';
      }
    }

    if (!contact?.email && options.braveApiKey) {
      log.debug({ orgName: org.name }, 'Apollo no email — trying Brave Search');
      const braveEmail = await findBusinessEmail(org.name, options.city, options.braveApiKey);
      if (braveEmail) {
        log.info({ orgName: org.name, email: braveEmail }, 'Email found via Brave Search');
        contact = contact ?? { email: '', firstName: null, lastName: null, position: null, linkedin: null, confidence: 0 };
        contact.email = braveEmail;
        contact.confidence = 35;
        emailSource = 'brave_search';
      }
    }

    prospects.push({
      apolloOrgId: org.id,
      organizationName: org.name,
      organizationDomain: org.domain ?? null,
      organizationPhone: org.phone ?? null,
      organizationCity: org.city ?? null,
      organizationState: org.state ?? null,
      organizationLinkedin: org.linkedinUrl ?? null,
      organizationFacebook: org.facebookUrl ?? null,
      organizationTwitter: org.twitterUrl ?? null,
      organizationLogo: org.logoUrl ?? null,
      organizationRevenue: org.revenuePrinted ?? null,
      organizationFoundedYear: org.foundedYear ?? null,
      organizationSicCodes: org.sicCodes ?? [],
      organizationNaicsCodes: org.naicsCodes ?? [],
      contact,
      emailSource,
    });

    // Rate limit: ~3 req/sec to stay within Apollo limits
    await new Promise((r) => setTimeout(r, 350));
  }

  const withEmail = prospects.filter((p) => p.contact?.email);
  log.info(
    { total: prospects.length, withEmail: withEmail.length, city: options.city },
    'Apollo discovery complete',
  );

  return { prospects, totalEntries };
}

interface ApolloOrg {
  id: string;
  name: string;
  domain: string | null;
  phone: string | null;
  city: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  logoUrl: string | null;
  revenuePrinted: string | null;
  foundedYear: number | null;
  sicCodes: string[];
  naicsCodes: string[];
  state: string | null;
}

async function searchApolloOrganizations(
  apiKey: string,
  options: ApolloDiscoveryOptions,
): Promise<{ orgs: ApolloOrg[]; totalEntries: number }> {
  const allOrgs: ApolloOrg[] = [];
  let page = options.startPage ?? 1;
  const perPage = 25;
  let totalEntries = 0;
  if (page > 1) log.info({ startPage: page }, 'Skipping to page (offset-based dedup)');

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
        body['q_organization_keyword_tags'] = options.industries;
      }
      if (options.sicCodes && options.sicCodes.length > 0) {
        body['organization_sic_codes'] = options.sicCodes;
      }
      if (options.excludeOrgIds && options.excludeOrgIds.length > 0) {
        body['organization_not_ids'] = options.excludeOrgIds;
      }

      log.info({ body: { ...body, organization_not_ids: options.excludeOrgIds?.length ?? 0 }, page }, 'Apollo org search request');

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
          linkedin_url?: string;
          facebook_url?: string;
          twitter_url?: string;
          logo_url?: string;
          organization_revenue_printed?: string;
          founded_year?: number;
          sic_codes?: string[];
          naics_codes?: string[];
        }>;
        pagination?: { total_pages?: number; total_entries?: number };
      };

      if (data.pagination?.total_entries) totalEntries = data.pagination.total_entries;

      log.info(
        { page, returned: data.organizations?.length ?? 0, totalEntries },
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
          linkedinUrl: org.linkedin_url ?? null,
          facebookUrl: org.facebook_url ?? null,
          twitterUrl: org.twitter_url ?? null,
          logoUrl: org.logo_url ?? null,
          revenuePrinted: org.organization_revenue_printed ?? null,
          foundedYear: org.founded_year ?? null,
          sicCodes: org.sic_codes ?? [],
          naicsCodes: org.naics_codes ?? [],
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

  return { orgs: allOrgs, totalEntries };
}

async function findPersonAtOrg(
  apiKey: string,
  orgId: string,
  titles: string[],
): Promise<ApolloContact | null> {
  try {
    // Step 1: Search for people at org (returns obfuscated results with person IDs)
    const searchRes = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
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
      }),
    });

    if (!searchRes.ok) {
      log.warn({ orgId, status: searchRes.status }, 'Apollo people api_search failed');
      return null;
    }

    const searchData = (await searchRes.json()) as {
      people?: Array<{
        id?: string;
        first_name?: string;
        title?: string;
        has_email?: boolean;
      }>;
    };

    // Find first person with an email available
    const candidate = searchData.people?.find((p) => p.id && p.has_email);
    if (!candidate?.id) {
      log.debug({ orgId, peopleCount: searchData.people?.length ?? 0 }, 'No candidate with email at org');
      return null;
    }

    // Step 2: Reveal full contact via people/match (costs 1 credit)
    await new Promise((r) => setTimeout(r, 200));
    const matchRes = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        id: candidate.id,
        reveal_personal_emails: true,
      }),
    });

    if (!matchRes.ok) {
      log.warn({ orgId, personId: candidate.id, status: matchRes.status }, 'Apollo people/match failed');
      return null;
    }

    const matchData = (await matchRes.json()) as {
      person?: {
        email?: string;
        first_name?: string;
        last_name?: string;
        title?: string;
        linkedin_url?: string;
        email_status?: string;
      };
    };

    const person = matchData.person;
    if (!person?.email) return null;

    log.debug({ orgId, email: person.email }, 'Apollo contact revealed');
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
