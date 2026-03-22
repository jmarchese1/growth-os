import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import { publishPost, SocialPublishError } from '../lib/social-publish.js';

const log = createLogger('api:social-media');

const PLATFORM_MAP: Record<string, string> = {
  INSTAGRAM: 'INSTAGRAM',
  FACEBOOK: 'FACEBOOK',
  GOOGLE: 'GOOGLE_MY_BUSINESS',
  TIKTOK: 'TIKTOK',
};

export async function socialMediaRoutes(app: FastifyInstance): Promise<void> {
  // POST /businesses/:id/posts/:postId/publish — publish a post to Instagram or Facebook
  app.post('/businesses/:id/posts/:postId/publish', async (request, reply) => {
    const { id, postId } = request.params as { id: string; postId: string };

    const post = await db.contentPost.findFirst({
      where: { id: postId, businessId: id },
    });
    if (!post) throw new NotFoundError('ContentPost', postId);

    if (post.status === 'POSTED') {
      return reply.code(400).send({ success: false, error: 'Post is already published' });
    }

    const business = await db.business.findUnique({
      where: { id },
      select: { id: true, instagramPageId: true, facebookPageId: true, settings: true },
    });
    if (!business) throw new NotFoundError('Business', id);

    try {
      await publishPost(
        { id: post.id, platform: post.platform, caption: post.caption, hashtags: post.hashtags, imageUrl: post.imageUrl },
        business,
      );

      const updated = await db.contentPost.findUnique({ where: { id: postId } });
      return { success: true, post: updated };
    } catch (err) {
      if (err instanceof SocialPublishError) {
        return reply.code(err.statusCode).send({ success: false, error: err.message, code: err.code });
      }
      throw err;
    }
  });

  // PATCH /businesses/:id/posts/:postId — edit a draft/scheduled post
  app.patch('/businesses/:id/posts/:postId', async (request, reply) => {
    const { id, postId } = request.params as { id: string; postId: string };

    const post = await db.contentPost.findFirst({
      where: { id: postId, businessId: id },
    });
    if (!post) throw new NotFoundError('ContentPost', postId);

    if (post.status === 'POSTED') {
      return reply.code(400).send({ success: false, error: 'Cannot edit a published post' });
    }

    const body = request.body as {
      caption?: string;
      hashtags?: string[];
      scheduledAt?: string | null;
      platform?: string;
      imageUrl?: string | null;
    };

    const data: Record<string, unknown> = {};

    if (body.caption !== undefined) data['caption'] = body.caption;
    if (body.hashtags !== undefined) data['hashtags'] = body.hashtags;
    if (body.imageUrl !== undefined) data['imageUrl'] = body.imageUrl;

    if (body.platform !== undefined) {
      const mapped = PLATFORM_MAP[body.platform];
      if (mapped) data['platform'] = mapped;
    }

    if (body.scheduledAt !== undefined) {
      if (body.scheduledAt) {
        const dt = new Date(body.scheduledAt);
        if (isNaN(dt.getTime())) {
          return reply.code(400).send({ success: false, error: 'Invalid scheduledAt date' });
        }
        data['scheduledAt'] = dt;
        data['status'] = 'SCHEDULED';
      } else {
        data['scheduledAt'] = null;
        data['status'] = 'DRAFT';
      }
    }

    const updated = await db.contentPost.update({
      where: { id: postId },
      data,
    });

    log.info({ postId, businessId: id }, 'Post updated');
    return { success: true, post: updated };
  });

  // DELETE /businesses/:id/posts/:postId — delete a draft/scheduled post
  app.delete('/businesses/:id/posts/:postId', async (request, reply) => {
    const { id, postId } = request.params as { id: string; postId: string };

    const post = await db.contentPost.findFirst({
      where: { id: postId, businessId: id },
    });
    if (!post) throw new NotFoundError('ContentPost', postId);

    if (post.status === 'POSTED') {
      return reply.code(400).send({ success: false, error: 'Cannot delete a published post' });
    }

    await db.contentPost.delete({ where: { id: postId } });

    log.info({ postId, businessId: id }, 'Post deleted');
    return { success: true };
  });

  // GET /businesses/:id/social-accounts — which platforms are connected
  app.get('/businesses/:id/social-accounts', async (request, _reply) => {
    const { id } = request.params as { id: string };

    const business = await db.business.findUnique({
      where: { id },
      select: { instagramPageId: true, facebookPageId: true, settings: true },
    });
    if (!business) throw new NotFoundError('Business', id);

    const settings = business.settings as Record<string, unknown> | null;
    const oauthTokens = settings?.['oauthTokens'] as Record<string, { connectedAt?: string }> | undefined;

    const platforms = [
      {
        platform: 'INSTAGRAM',
        connected: !!(business.instagramPageId && oauthTokens?.['instagram']?.connectedAt),
        pageId: business.instagramPageId,
        connectedAt: oauthTokens?.['instagram']?.connectedAt ?? null,
      },
      {
        platform: 'FACEBOOK',
        connected: !!(business.facebookPageId && oauthTokens?.['facebook']?.connectedAt),
        pageId: business.facebookPageId,
        connectedAt: oauthTokens?.['facebook']?.connectedAt ?? null,
      },
    ];

    return { success: true, platforms };
  });
}
