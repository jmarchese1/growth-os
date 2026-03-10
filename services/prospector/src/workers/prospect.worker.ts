import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES, outreachSendQueue } from '@embedo/queue';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import type { ProspectDiscoveredPayload } from '@embedo/types';
import { extractEmailFromWebsite, extractPhoneFromWebsite } from '../scraper/website-email.js';
import { findBusinessEmail } from '../scraper/brave-search.js';
import { findEmailViaHunter, extractDomain } from '../scraper/hunter.js';
import { env } from '../config.js';

const log = createLogger('prospector:prospect-worker');

async function enrichEmail(
  name: string,
  city: string,
  geoapifyEmail: string | undefined,
  website: string | undefined,
): Promise<{ email: string; source: string } | null> {
  // 1. Email directly from Geoapify (OSM data)
  if (geoapifyEmail) return { email: geoapifyEmail, source: 'geoapify' };

  // 2. Scrape website for mailto / email regex
  if (website) {
    const scraped = await extractEmailFromWebsite(website);
    if (scraped) return { email: scraped, source: 'website_scrape' };
  }

  // 3. Brave Search fallback — only if key is configured
  if (env.BRAVE_SEARCH_API_KEY && city) {
    const found = await findBusinessEmail(name, city, env.BRAVE_SEARCH_API_KEY);
    if (found) return { email: found, source: 'brave_search' };
  }

  // 4. Hunter.io domain search — drop in HUNTER_API_KEY to enable
  if (env.HUNTER_API_KEY && website) {
    const domain = extractDomain(website);
    if (domain) {
      const result = await findEmailViaHunter(domain, env.HUNTER_API_KEY);
      if (result) return { email: result.email, source: 'hunter' };
    }
  }

  return null;
}

export function startProspectWorker(): Worker {
  const worker = new Worker<ProspectDiscoveredPayload>(
    QUEUE_NAMES.PROSPECT_DISCOVERED,
    async (job) => {
      const { campaignId, placeId, name, address, phone, website, email: geoapifyEmail } = job.data;

      // Dedup — skip if already scraped
      const existing = await db.prospectBusiness.findUnique({ where: { googlePlaceId: placeId } });
      if (existing) {
        log.info({ placeId, name }, 'Prospect already exists — skipping');
        return;
      }

      const city = (address['city'] as string | undefined) ?? '';
      const emailResult = await enrichEmail(name, city, geoapifyEmail, website);
      const status = emailResult ? 'ENRICHED' : 'NEW';

      // If Places/Geoapify didn't return a phone, try scraping the website directly
      let resolvedPhone = phone ?? null;
      let phoneSource: string | null = phone ? 'geoapify' : null;
      if (!resolvedPhone && website) {
        resolvedPhone = await extractPhoneFromWebsite(website);
        if (resolvedPhone) {
          phoneSource = 'website_scrape';
          log.debug({ name, phone: resolvedPhone }, 'Phone found via website scrape');
        }
      }

      const prospect = await db.prospectBusiness.create({
        data: {
          campaignId,
          name,
          address: address as object,
          phone: resolvedPhone,
          phoneSource,
          website: website ?? null,
          email: emailResult?.email ?? null,
          emailSource: emailResult?.source ?? null,
          googlePlaceId: placeId,
          googleRating: null,
          googleReviewCount: null,
          status,
        },
      });

      log.info({ prospectId: prospect.id, name, email: emailResult?.email, emailSource: emailResult?.source, status }, 'Prospect created');

      if (emailResult?.email) {
        await outreachSendQueue().add(
          `outreach:${prospect.id}`,
          { prospectId: prospect.id, campaignId, channel: 'email' },
          { delay: 5 * 60 * 1000 },
        );
        log.info({ prospectId: prospect.id }, 'Outreach queued');
      }
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 3,
    },
  );

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Prospect worker job failed');
  });

  log.info('Prospect worker started');
  return worker;
}
