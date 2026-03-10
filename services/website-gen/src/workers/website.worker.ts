import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import type { BusinessOnboardedPayload, GenerateWebsiteJobPayload } from '@embedo/types';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { renderRestaurantMinimal } from '../templates/restaurant/minimal.js';
import { deployToVercel } from '../deploy/vercel.js';
import type { WebsiteConfig } from '@embedo/types';

const log = createLogger('website-gen:workers');

export function startWorkers() {
  // ─── Business Onboarded → Generate + Deploy Website ──────────────────────
  new Worker<BusinessOnboardedPayload>(
    QUEUE_NAMES.BUSINESS_ONBOARDED,
    async (job) => {
      const { businessId, businessName } = job.data;
      log.info({ businessId }, 'Generating website for new business');

      const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
      const settings = (business.settings as Record<string, unknown>) ?? {};

      // Create GeneratedWebsite record
      const website = await db.generatedWebsite.create({
        data: {
          businessId,
          template: 'restaurant-minimal',
          config: {
            primaryColor: '#1a1a1a',
            businessName,
            chatbotEnabled: true,
            chatbotBusinessId: businessId,
            bookingEnabled: !!business.calendlyUri,
            calendlyUrl: business.calendlyUri ?? undefined,
          },
          status: 'GENERATING',
        },
      });

      try {
        const config: WebsiteConfig = {
          template: 'restaurant-minimal',
          businessName: business.name,
          description: settings['cuisine'] ? `${settings['cuisine']} restaurant in ${(settings['address'] as Record<string, string> | undefined)?.['city'] ?? ''}` : undefined,
          primaryColor: '#1a1a1a',
          sections: [],
          chatbotEnabled: true,
          chatbotBusinessId: businessId,
          bookingEnabled: !!business.calendlyUri,
          calendlyUrl: business.calendlyUri ?? undefined,
          settings: business.settings as Record<string, unknown>,
        } as WebsiteConfig & { settings: Record<string, unknown> };

        const html = renderRestaurantMinimal(config);

        const deployed = await deployToVercel({
          projectName: business.slug,
          html,
          businessId,
        });

        await db.generatedWebsite.update({
          where: { id: website.id },
          data: {
            deployUrl: deployed.url,
            vercelDeploymentId: deployed.deploymentId,
            status: 'LIVE',
          },
        });

        await db.onboardingLog.create({
          data: {
            businessId,
            step: 'website_deployed',
            status: 'success',
            message: `Website deployed: ${deployed.url}`,
            data: { url: deployed.url, deploymentId: deployed.deploymentId },
          },
        });

        log.info({ businessId, url: deployed.url }, 'Website deployed');
      } catch (err) {
        await db.generatedWebsite.update({
          where: { id: website.id },
          data: { status: 'ERROR' },
        });
        await db.onboardingLog.create({
          data: { businessId, step: 'website_deployed', status: 'error', message: String(err) },
        });
        throw err;
      }
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  // ─── Explicit website generation job ──────────────────────────────────────
  new Worker<GenerateWebsiteJobPayload>(
    QUEUE_NAMES.WEBSITE_GENERATE,
    async (job) => {
      const { businessId, websiteId } = job.data;
      log.info({ businessId, websiteId }, 'Processing website generation job');

      const [website, business] = await Promise.all([
        db.generatedWebsite.findUniqueOrThrow({ where: { id: websiteId } }),
        db.business.findUniqueOrThrow({ where: { id: businessId } }),
      ]);

      const config = website.config as WebsiteConfig;
      const html = renderRestaurantMinimal(config);

      const deployed = await deployToVercel({
        projectName: business.slug,
        html,
        businessId,
      });

      await db.generatedWebsite.update({
        where: { id: websiteId },
        data: { deployUrl: deployed.url, status: 'LIVE' },
      });
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  log.info('Website gen workers started');
}
