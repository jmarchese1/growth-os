import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES, leadCreatedQueue } from '@embedo/queue';
import type { PostSocialJobPayload, AutoDmJobPayload, BusinessOnboardedPayload } from '@embedo/types';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { generateAutoDmMessage } from '../content/generator.js';
import { generateWeeklyContent } from '../scheduler/calendar.js';
import axios from 'axios';

const log = createLogger('social-media:workers');

export function startWorkers() {
  // ─── Post Social Content Worker ───────────────────────────────────────────
  new Worker<PostSocialJobPayload>(
    QUEUE_NAMES.SOCIAL_POST,
    async (job) => {
      const { businessId, postId, platform } = job.data;
      log.info({ postId, platform }, 'Posting social content');

      const post = await db.contentPost.findUnique({ where: { id: postId } });
      if (!post) {
        log.warn({ postId }, 'Post not found');
        return;
      }

      // Get social account credentials
      const account = await db.socialAccount.findUnique({
        where: { businessId_platform: { businessId, platform: platform as 'INSTAGRAM' | 'FACEBOOK' | 'GOOGLE_MY_BUSINESS' | 'TIKTOK' } },
      });

      if (!account?.accessToken) {
        log.warn({ businessId, platform }, 'No access token for social account');
        await db.contentPost.update({ where: { id: postId }, data: { status: 'FAILED' } });
        return;
      }

      const captionWithHashtags = [
        post.caption,
        post.hashtags.map((h) => `#${h}`).join(' '),
      ]
        .filter(Boolean)
        .join('\n\n');

      if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
        try {
          // Create media container first (if image)
          // For text-only posts: publish directly
          await axios.post(
            `https://graph.facebook.com/v21.0/${account.accountId}/feed`,
            { message: captionWithHashtags, access_token: account.accessToken },
          );

          await db.contentPost.update({
            where: { id: postId },
            data: { status: 'POSTED', postedAt: new Date() },
          });

          log.info({ postId, platform }, 'Post published');
        } catch (err) {
          log.error({ err, postId }, 'Failed to publish post');
          await db.contentPost.update({ where: { id: postId }, data: { status: 'FAILED' } });
          throw err;
        }
      }
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );

  // ─── Auto DM Worker ───────────────────────────────────────────────────────
  new Worker<AutoDmJobPayload>(
    QUEUE_NAMES.AUTO_DM,
    async (job) => {
      const { businessId, platform, recipientId, recipientName, context } = job.data;
      log.info({ businessId, platform, recipientId }, 'Sending auto-DM');

      const business = await db.business.findUnique({
        where: { id: businessId },
        include: { socialAccounts: { where: { platform: platform as 'INSTAGRAM' | 'FACEBOOK' | 'GOOGLE_MY_BUSINESS' | 'TIKTOK' } } },
      });

      const account = business?.socialAccounts[0];
      if (!account?.accessToken) {
        log.warn({ businessId, platform }, 'No access token for auto-DM');
        return;
      }

      const message = await generateAutoDmMessage({
        businessName: business!.name,
        businessType: business!.type,
        recipientName,
        context,
      });

      // Send DM via Graph API
      await axios.post(
        `https://graph.facebook.com/v21.0/${account.accountId}/messages`,
        {
          recipient: { id: recipientId },
          message: { text: message },
          access_token: account.accessToken,
        },
      );

      // Emit lead.created for the person who engaged
      await leadCreatedQueue().add(`lead:social:${recipientId}`, {
        businessId,
        source: 'SOCIAL',
        sourceId: recipientId,
        rawData: { platform, recipientId, recipientName, context },
      });

      log.info({ recipientId, platform }, 'Auto-DM sent');
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  // ─── Business Onboarded Worker (setup social) ─────────────────────────────
  new Worker<BusinessOnboardedPayload>(
    QUEUE_NAMES.BUSINESS_ONBOARDED,
    async (job) => {
      const { businessId } = job.data;
      log.info({ businessId }, 'Setting up social media for new business');

      // Generate first batch of content (will be draft until accounts are connected)
      try {
        await generateWeeklyContent(businessId);
        await db.onboardingLog.create({
          data: { businessId, step: 'social_content_scheduled', status: 'success', message: 'First week of content scheduled' },
        });
      } catch (err) {
        log.warn({ err, businessId }, 'Could not generate initial social content (accounts may not be connected yet)');
        await db.onboardingLog.create({
          data: { businessId, step: 'social_content_scheduled', status: 'pending', message: 'Awaiting social account connection' },
        });
      }
    },
    { connection: getRedisConnection(), concurrency: 2 },
  );

  log.info('Social media workers started');
}
