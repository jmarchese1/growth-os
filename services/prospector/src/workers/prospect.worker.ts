import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import type { ProspectDiscoveredPayload } from '@embedo/types';
import { extractEmailFromWebsite, extractPhoneFromWebsite } from '../scraper/website-email.js';
import { findBusinessEmail } from '../scraper/brave-search.js';
import { isDuplicate } from '../dedup/isDuplicate.js';
import { scoreWebsite } from '../scraper/website-score.js';
import { env } from '../config.js';

const log = createLogger('prospector:prospect-worker');

async function enrichEmail(
  name: string,
  city: string,
  geoapifyEmail: string | undefined,
  website: string | undefined,
): Promise<{
  email: string;
  source: string;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  linkedin?: string | null;
  confidence?: number | null;
} | null> {
  // 1. Email directly from Geoapify (OSM data)
  if (geoapifyEmail) return { email: geoapifyEmail, source: 'geoapify' };

  // 2. Scrape website for mailto / email regex (with quality scoring)
  if (website) {
    const scraped = await extractEmailFromWebsite(website, name);
    if (scraped) return { email: scraped.email, source: `website_scrape:${scraped.source}` };
  }

  // 3. Brave Search fallback — only if key is configured
  if (env.BRAVE_SEARCH_API_KEY && city) {
    const found = await findBusinessEmail(name, city, env.BRAVE_SEARCH_API_KEY);
    if (found) return { email: found, source: 'brave_search' };
  }

  // No Apollo enrichment for Geoapify campaigns — keep sources separate

  return null;
}

export function startProspectWorker(): Worker {
  const worker = new Worker<ProspectDiscoveredPayload>(
    QUEUE_NAMES.PROSPECT_DISCOVERED,
    async (job) => {
      const { campaignId, placeId, name, address, categories, phone, website, email: geoapifyEmail } = job.data;

      // Cross-source dedup — check by placeId, email, phone, website, name across ALL campaigns
      const dupCheck = await isDuplicate({ name, phone, email: geoapifyEmail, website, googlePlaceId: placeId });
      if (dupCheck.isDuplicate) {
        log.info({ placeId, name, matchField: dupCheck.matchField, matchedId: dupCheck.matchedProspectId }, 'Duplicate prospect — skipping');
        return;
      }

      const city = (address['city'] as string | undefined) ?? '';
      const emailResult = await enrichEmail(name, city, geoapifyEmail, website);

      const status = emailResult ? 'ENRICHED' : 'NEW';

      // If Geoapify did not return a phone, try scraping the website
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
          contactFirstName: emailResult?.firstName ?? null,
          contactLastName: emailResult?.lastName ?? null,
          contactTitle: emailResult?.position ?? null,
          contactLinkedIn: emailResult?.linkedin ?? null,
          googlePlaceId: placeId,
          googleRating: null,
          googleReviewCount: null,
          status,
        },
      });

      log.info(
        { prospectId: prospect.id, name, email: emailResult?.email, emailSource: emailResult?.source, status },
        'Prospect created',
      );

      // Generate AI short name + business type in background (non-blocking)
      if (env.ANTHROPIC_API_KEY) {
        import('../outreach/templates.js').then(async ({ aiBusinessName, typeFromCategories }) => {
          const categoryHint = categories?.length ? typeFromCategories(categories) : null;
          const result = await aiBusinessName(name, env.ANTHROPIC_API_KEY!, categoryHint);
          if (result) {
            await db.prospectBusiness.update({
              where: { id: prospect.id },
              data: {
                shortName: result.shortName,
                businessType: result.type,
              },
            });
          }
        }).catch(() => {});
      }

      // Score website in background (non-blocking)
      if (website) {
        scoreWebsite(website).then(async (result) => {
          try {
            await db.prospectBusiness.update({
              where: { id: prospect.id },
              data: {
                websiteScore: result.score,
                websiteScorecard: result.scorecard as object ?? undefined,
                websiteScoringMethod: result.scoringMethod,
                websiteHasChatbot: result.hasChatbot,
                websiteChatbotProvider: result.chatbotProvider,
                websiteScoredAt: new Date(),
              },
            });
            log.info({ prospectId: prospect.id, score: result.score }, 'Website score saved');
          } catch (err) {
            log.warn({ err, prospectId: prospect.id }, 'Failed to save website score');
          }
        }).catch(() => {});
      }

      // Emails are NOT auto-queued — user must manually send via the campaign UI
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
