import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:social-publish');

const GRAPH_API = 'https://graph.facebook.com/v21.0';

interface GraphApiError {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

export class SocialPublishError extends Error {
  constructor(
    message: string,
    public readonly code: 'TOKEN_EXPIRED' | 'RATE_LIMITED' | 'MISSING_PAGE_ID' | 'IMAGE_REQUIRED' | 'API_ERROR',
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'SocialPublishError';
  }
}

function getAccessToken(business: { settings: unknown }, platform: 'instagram' | 'facebook'): string {
  const settings = business.settings as Record<string, unknown> | null;
  const oauthTokens = settings?.['oauthTokens'] as Record<string, unknown> | undefined;
  const platformToken = oauthTokens?.[platform] as { accessToken?: string } | undefined;

  if (!platformToken?.accessToken) {
    throw new SocialPublishError(
      `No ${platform} access token found — connect ${platform} in Integrations`,
      'TOKEN_EXPIRED',
      401,
    );
  }

  return platformToken.accessToken;
}

function buildCaption(caption: string, hashtags: string[]): string {
  const tags = hashtags.filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  return tags ? `${caption}\n\n${tags}` : caption;
}

async function graphPost(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown> & GraphApiError;

  if (!res.ok || data.error) {
    const err = data.error;
    const code = err?.code;
    const msg = err?.message ?? 'Unknown Graph API error';

    if (code === 190) {
      throw new SocialPublishError(
        `Access token expired — reconnect the platform in Integrations`,
        'TOKEN_EXPIRED',
        401,
      );
    }
    if (code === 32 || code === 4) {
      throw new SocialPublishError(
        `Rate limit reached — try again later`,
        'RATE_LIMITED',
        429,
      );
    }
    throw new SocialPublishError(`Graph API: ${msg}`, 'API_ERROR', 400);
  }

  return data;
}

export async function publishToInstagram(
  igUserId: string,
  caption: string,
  imageUrl: string,
  accessToken: string,
): Promise<string> {
  // Step 1: Create media container
  const container = await graphPost(`${GRAPH_API}/${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  const containerId = container['id'] as string;
  if (!containerId) {
    throw new SocialPublishError('Instagram: failed to create media container', 'API_ERROR');
  }

  // Brief wait for container processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Publish the container
  const result = await graphPost(`${GRAPH_API}/${igUserId}/media_publish`, {
    creation_id: containerId,
    access_token: accessToken,
  });

  const mediaId = result['id'] as string;
  if (!mediaId) {
    throw new SocialPublishError('Instagram: failed to publish media', 'API_ERROR');
  }

  return mediaId;
}

export async function publishToFacebook(
  pageId: string,
  caption: string,
  imageUrl: string | null,
  accessToken: string,
): Promise<string> {
  let result: Record<string, unknown>;

  if (imageUrl) {
    // Photo post
    result = await graphPost(`${GRAPH_API}/${pageId}/photos`, {
      url: imageUrl,
      message: caption,
      access_token: accessToken,
    });
  } else {
    // Text-only post
    result = await graphPost(`${GRAPH_API}/${pageId}/feed`, {
      message: caption,
      access_token: accessToken,
    });
  }

  const postId = result['id'] as string ?? result['post_id'] as string;
  if (!postId) {
    throw new SocialPublishError('Facebook: no post ID returned', 'API_ERROR');
  }

  return postId;
}

export async function publishPost(
  post: { id: string; platform: string; caption: string; hashtags: string[]; imageUrl: string | null },
  business: { id: string; instagramPageId: string | null; facebookPageId: string | null; settings: unknown },
): Promise<void> {
  const fullCaption = buildCaption(post.caption, post.hashtags);

  try {
    let platformPostId: string;

    if (post.platform === 'INSTAGRAM') {
      if (!business.instagramPageId) {
        throw new SocialPublishError('No Instagram page ID — reconnect Instagram in Integrations', 'MISSING_PAGE_ID');
      }
      if (!post.imageUrl) {
        throw new SocialPublishError('Instagram requires an image — add an image before publishing', 'IMAGE_REQUIRED');
      }
      const token = getAccessToken(business, 'instagram');
      platformPostId = await publishToInstagram(business.instagramPageId, fullCaption, post.imageUrl, token);
    } else if (post.platform === 'FACEBOOK') {
      if (!business.facebookPageId) {
        throw new SocialPublishError('No Facebook page ID — reconnect Facebook in Integrations', 'MISSING_PAGE_ID');
      }
      const token = getAccessToken(business, 'facebook');
      platformPostId = await publishToFacebook(business.facebookPageId, fullCaption, post.imageUrl, token);
    } else {
      throw new SocialPublishError(`Publishing to ${post.platform} is not yet supported`, 'API_ERROR');
    }

    await db.contentPost.update({
      where: { id: post.id },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        platformPostId,
      },
    });

    log.info({ postId: post.id, platform: post.platform, platformPostId }, 'Post published successfully');
  } catch (err) {
    await db.contentPost.update({
      where: { id: post.id },
      data: { status: 'FAILED' },
    });

    if (err instanceof SocialPublishError) {
      log.warn({ postId: post.id, code: err.code }, err.message);
      throw err;
    }

    log.error({ postId: post.id, err }, 'Unexpected publish error');
    throw new SocialPublishError('Publishing failed — try again later', 'API_ERROR', 500);
  }
}
