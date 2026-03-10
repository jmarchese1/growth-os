import cron from 'node-cron';
import { db } from '@embedo/db';
import { socialPostQueue } from '@embedo/queue';
import { createLogger } from '@embedo/utils';
import { generateSocialContent } from '../content/generator.js';
import type { SocialPlatform } from '@embedo/db';

const log = createLogger('social-media:scheduler');

/**
 * Generate a week's worth of content for a business and schedule it.
 */
export async function generateWeeklyContent(businessId: string): Promise<void> {
  const business = await db.business.findUniqueOrThrow({
    where: { id: businessId },
    include: { socialAccounts: { where: { active: true } } },
  });

  if (business.socialAccounts.length === 0) {
    log.info({ businessId }, 'No social accounts configured, skipping content generation');
    return;
  }

  const settings = (business.settings as Record<string, unknown>) ?? {};
  const schedule = settings['socialPostingSchedule'] as {
    postsPerWeek?: number;
    preferredDays?: string[];
  } | undefined;

  const postsPerWeek = schedule?.postsPerWeek ?? 4;
  const topics = [
    'daily special',
    'behind the scenes',
    'customer appreciation',
    'seasonal menu item',
    'team spotlight',
    'community event',
    'recipe or tip',
  ];

  const posts = [];

  for (const account of business.socialAccounts) {
    for (let i = 0; i < postsPerWeek; i++) {
      const topic = topics[i % topics.length]!;
      const daysFromNow = Math.floor((i / postsPerWeek) * 7) + 1;
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + daysFromNow);
      scheduledAt.setHours(12 + Math.floor(Math.random() * 6), 0, 0, 0); // 12-6pm

      const content = await generateSocialContent({
        businessId,
        businessName: business.name,
        businessType: business.type,
        platform: account.platform as 'INSTAGRAM' | 'FACEBOOK',
        topic,
        tone: 'casual',
        includeHashtags: true,
      });

      const post = await db.contentPost.create({
        data: {
          businessId,
          platform: account.platform as SocialPlatform,
          caption: content.caption,
          hashtags: content.hashtags,
          scheduledAt,
          status: 'SCHEDULED',
        },
      });

      // Schedule the BullMQ job for posting
      const delayMs = scheduledAt.getTime() - Date.now();
      if (delayMs > 0) {
        await socialPostQueue().add(
          `post:${post.id}`,
          {
            businessId,
            postId: post.id,
            platform: account.platform,
          },
          { delay: delayMs, jobId: `post:${post.id}` },
        );
      }

      posts.push(post);
    }
  }

  log.info({ businessId, postsScheduled: posts.length }, 'Weekly content scheduled');
}

/**
 * Start the weekly content generation cron (runs every Monday at 8am).
 */
export function startContentScheduler(): void {
  cron.schedule('0 8 * * 1', async () => {
    log.info('Running weekly content generation for all active businesses');

    const businesses = await db.business.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    for (const { id } of businesses) {
      try {
        await generateWeeklyContent(id);
      } catch (err) {
        log.error({ err, businessId: id }, 'Failed to generate weekly content');
      }
    }
  });

  log.info('Content scheduler started (runs every Monday 8am)');
}
