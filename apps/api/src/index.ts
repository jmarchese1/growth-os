// Redeploy trigger — 2026-03-22
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { env } from './config.js';
import { buildApp } from './app.js';
import { publishPost } from './lib/social-publish.js';

const log = createLogger('api');

async function startScheduledPostPublisher() {
  setInterval(async () => {
    try {
      const duePosts = await db.contentPost.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: new Date() },
        },
        take: 10,
      });

      if (duePosts.length === 0) return;

      log.info({ count: duePosts.length }, 'Processing scheduled posts');

      for (const post of duePosts) {
        const business = await db.business.findUnique({
          where: { id: post.businessId },
          select: { id: true, instagramPageId: true, facebookPageId: true, settings: true },
        });

        if (!business) {
          log.warn({ postId: post.id }, 'Business not found for scheduled post');
          await db.contentPost.update({ where: { id: post.id }, data: { status: 'FAILED' } });
          continue;
        }

        try {
          await publishPost(
            { id: post.id, platform: post.platform, caption: post.caption, hashtags: post.hashtags, imageUrl: post.imageUrl },
            business,
          );
        } catch (err) {
          log.error({ err, postId: post.id }, 'Scheduled publish failed');
        }
      }
    } catch (err) {
      log.error({ err }, 'Scheduler tick failed');
    }
  }, 60_000);
}

async function start() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Embedo API Gateway started');

  // Start the scheduled post publisher (checks every 60s)
  startScheduledPostPublisher();
  log.info('Scheduled post publisher started (60s interval)');
}

start().catch((err) => {
  console.error('Failed to start API gateway:', err);
  process.exit(1);
});
