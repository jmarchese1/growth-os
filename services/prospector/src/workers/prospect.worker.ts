import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES, outreachSendQueue } from '@embedo/queue';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import type { ProspectDiscoveredPayload } from '@embedo/types';
import { extractEmailFromWebsite, extractPhoneFromWebsite } from '../scraper/website-email.js';
import { findBusinessEmail } from '../scraper/brave-search.js';
import { findEmailViaApollo, extractDomain, verifyEmailViaApollo } from '../scraper/apollo.js';
import { upsertSuppression } from '../outreach/suppression.js';
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

  // 4. Apollo.io domain search — drop in APOLLO_API_KEY to enable
  if (env.APOLLO_API_KEY && website) {
    const domain = extractDomain(website);
    if (domain) {
      const result = await findEmailViaApollo(domain, env.APOLLO_API_KEY);
      if (result) {
        return {
          email: result.email,
          source: 'apollo',
          firstName: result.firstName,
          lastName: result.lastName,
          position: result.position,
          linkedin: result.linkedin,
          confidence: result.confidence,
        };
      }
    }
  }

  return null;
}

export function startProspectWorker(): Worker {
  const worker = new Worker<ProspectDiscoveredPayload>(
    QUEUE_NAMES.PROSPECT_DISCOVERED,
    async (job) => {
      const { campaignId, placeId, name, address, phone, website, email: geoapifyEmail } = job.data;

      // Cross-source dedup — check by placeId, email, phone, website, name across ALL campaigns
      const dupCheck = await isDuplicate({ name, phone, email: geoapifyEmail, website, googlePlaceId: placeId });
      if (dupCheck.isDuplicate) {
        log.info({ placeId, name, matchField: dupCheck.matchField, matchedId: dupCheck.matchedProspectId }, 'Duplicate prospect — skipping');
        return;
      }

      const city = (address['city'] as string | undefined) ?? '';
      const emailResult = await enrichEmail(name, city, geoapifyEmail, website);

      // Verify the discovered email to avoid hard bounces
      let verification: { result?: string; score?: number } | null = null;
      if (emailResult?.email && env.APOLLO_API_KEY) {
        const apolloResult = await verifyEmailViaApollo(emailResult.email, env.APOLLO_API_KEY);
        verification = { result: apolloResult };
      }

      const verificationStatus = verification?.result?.toLowerCase();
      const isInvalid = verificationStatus === 'undeliverable';
      const status = isInvalid ? 'DEAD' : emailResult ? 'ENRICHED' : 'NEW';

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

      const baseDelayMs = 5 * 60 * 1000; // 5 minutes before first email

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
          emailVerificationStatus: verification?.result ?? null,
          emailVerificationScore: verification?.score != null ? Math.round(verification.score) : null,
          emailVerifiedAt: verification ? new Date() : null,
          googlePlaceId: placeId,
          googleRating: null,
          googleReviewCount: null,
          status,
          // Countdown to first email shown in campaign table
          nextFollowUpAt: emailResult?.email && !isInvalid
            ? new Date(Date.now() + baseDelayMs)
            : null,
        },
      });

      log.info(
        { prospectId: prospect.id, name, email: emailResult?.email, emailSource: emailResult?.source, status },
        'Prospect created',
      );

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

      if (emailResult?.email) {
        if (isInvalid) {
          await upsertSuppression({ email: emailResult.email, reason: 'verification_invalid', source: 'apollo' });
          log.info({ prospectId: prospect.id }, 'Invalid email — suppressed');
          return;
        }

        const campaign = await db.outboundCampaign.findUnique({
          where: { id: campaignId },
          select: { sequenceSteps: true },
        });
        const steps = (campaign?.sequenceSteps as Array<{ stepNumber: number; delayHours: number }> | null) ?? [];

        // Queue step 1 (cold email)
        await outreachSendQueue().add(
          `outreach:${prospect.id}:step1`,
          { prospectId: prospect.id, campaignId, channel: 'email', stepNumber: 1 },
          { delay: baseDelayMs },
        );

        // Queue follow-up steps with their configured delays
        for (const step of steps) {
          if (step.stepNumber <= 1) continue;
          const delayMs = baseDelayMs + step.delayHours * 60 * 60 * 1000;
          await outreachSendQueue().add(
            `outreach:${prospect.id}:step${step.stepNumber}`,
            { prospectId: prospect.id, campaignId, channel: 'email', stepNumber: step.stepNumber },
            { delay: delayMs },
          );
        }

        log.info({ prospectId: prospect.id, steps: steps.length + 1 }, 'Outreach sequence queued');
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
