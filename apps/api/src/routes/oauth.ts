import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:oauth');

/* ─── Provider config ──────────────────────────────────────────────────────── */

interface OAuthProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}

const PROVIDERS: Record<string, OAuthProviderConfig> = {
  instagram: {
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_messages',
      'pages_show_list',
      'pages_read_engagement',
    ],
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_messaging',
      'pages_show_list',
    ],
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
  },
  'google-business': {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/business.manage',
    ],
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
  },
  tiktok: {
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.publish', 'video.list'],
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
  },
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function getEnv(key: string): string | undefined {
  return process.env[key];
}

function buildRedirectUri(provider: string): string {
  const base = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
  return `${base}/auth/${provider}/callback`;
}

/* ─── Routes ───────────────────────────────────────────────────────────────── */

export async function oauthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /auth/:provider/authorize?businessId=xxx
   * Redirects the user to the OAuth provider's consent screen.
   */
  app.get('/auth/:provider/authorize', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const { businessId } = request.query as { businessId?: string };

    const config = PROVIDERS[provider];
    if (!config) {
      return reply.code(400).send({ success: false, error: `Unknown provider: ${provider}` });
    }

    const clientId = getEnv(config.clientIdEnv);
    if (!clientId) {
      log.error({ provider }, `Missing env var ${config.clientIdEnv}`);
      return reply.code(500).send({ success: false, error: `OAuth not configured for ${provider}` });
    }

    const redirectUri = buildRedirectUri(provider);

    // State encodes businessId so callback knows which business to associate the token with
    const state = Buffer.from(JSON.stringify({ provider, businessId: businessId ?? '' })).toString('base64url');

    const params = new URLSearchParams({
      client_id: provider === 'tiktok' ? clientId : clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });

    // Provider-specific param naming
    if (provider === 'tiktok') {
      params.set('scope', config.scopes.join(','));
    } else if (provider === 'google-business') {
      params.set('scope', config.scopes.join(' '));
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    } else {
      // Meta (Facebook/Instagram)
      params.set('scope', config.scopes.join(','));
    }

    const authorizeUrl = `${config.authorizeUrl}?${params.toString()}`;
    log.info({ provider, businessId }, 'Redirecting to OAuth consent screen');
    return reply.redirect(authorizeUrl);
  });

  /**
   * GET /auth/:provider/callback?code=xxx&state=xxx
   * Exchanges the authorization code for an access token and stores it.
   */
  app.get('/auth/:provider/callback', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const { code, state, error: oauthError } = request.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    const config = PROVIDERS[provider];
    if (!config) {
      return reply.code(400).send({ success: false, error: `Unknown provider: ${provider}` });
    }

    if (oauthError) {
      log.warn({ provider, oauthError }, 'OAuth denied by user');
      const clientUrl = process.env['CLIENT_APP_URL'] ?? 'http://localhost:3012';
      return reply.redirect(`${clientUrl}/integrations?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      return reply.code(400).send({ success: false, error: 'Missing code or state parameter' });
    }

    // Decode state
    let stateData: { provider: string; businessId: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return reply.code(400).send({ success: false, error: 'Invalid state parameter' });
    }

    const clientId = getEnv(config.clientIdEnv);
    const clientSecret = getEnv(config.clientSecretEnv);
    if (!clientId || !clientSecret) {
      log.error({ provider }, 'Missing OAuth credentials in env');
      return reply.code(500).send({ success: false, error: 'OAuth not configured' });
    }

    const redirectUri = buildRedirectUri(provider);

    try {
      // Exchange code for token
      let tokenData: Record<string, unknown>;

      if (provider === 'tiktok') {
        const res = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        });
        tokenData = (await res.json()) as Record<string, unknown>;
      } else {
        // Meta & Google both use standard POST
        const body: Record<string, string> = {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        };

        const res = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(body),
        });
        tokenData = (await res.json()) as Record<string, unknown>;
      }

      log.info({ provider, hasAccessToken: !!tokenData['access_token'] }, 'Token exchange complete');

      if (!tokenData['access_token']) {
        log.error({ provider, tokenData }, 'No access_token in response');
        const clientUrl = process.env['CLIENT_APP_URL'] ?? 'http://localhost:3012';
        return reply.redirect(`${clientUrl}/integrations?error=token_exchange_failed`);
      }

      // Store token on Business.settings if we have a businessId
      if (stateData.businessId) {
        const business = await db.business.findUnique({
          where: { id: stateData.businessId },
          select: { settings: true },
        });

        const currentSettings = (business?.settings as Record<string, unknown>) ?? {};
        const oauthTokens = (currentSettings['oauthTokens'] as Record<string, unknown>) ?? {};

        oauthTokens[provider] = {
          accessToken: tokenData['access_token'],
          refreshToken: tokenData['refresh_token'] ?? null,
          expiresIn: tokenData['expires_in'] ?? null,
          tokenType: tokenData['token_type'] ?? 'Bearer',
          connectedAt: new Date().toISOString(),
          // TikTok nests data under 'data'
          ...(provider === 'tiktok' && tokenData['data']
            ? { openId: (tokenData['data'] as Record<string, unknown>)['open_id'] }
            : {}),
        };

        await db.business.update({
          where: { id: stateData.businessId },
          data: {
            settings: { ...currentSettings, oauthTokens },
          },
        });

        log.info({ provider, businessId: stateData.businessId }, 'OAuth token stored on business');
      }

      const clientUrl = process.env['CLIENT_APP_URL'] ?? 'http://localhost:3012';
      return reply.redirect(`${clientUrl}/integrations?connected=${provider}`);
    } catch (err) {
      log.error({ provider, err }, 'OAuth token exchange failed');
      const clientUrl = process.env['CLIENT_APP_URL'] ?? 'http://localhost:3012';
      return reply.redirect(`${clientUrl}/integrations?error=exchange_failed`);
    }
  });
}
