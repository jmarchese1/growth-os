import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { healthRoutes } from './routes/health.js';
import { elevenLabsWebhookRoutes } from './routes/webhooks/elevenlabs.js';
import { twilioWebhookRoutes } from './routes/webhooks/twilio.js';
import { calWebhookRoutes } from './routes/webhooks/cal.js';
import { sendgridInboundRoutes } from './routes/webhooks/sendgrid-inbound.js';
import { sendgridEventRoutes } from './routes/webhooks/sendgrid-events.js';
import { trackRoutes } from './routes/track.js';
import { leadCaptureRoutes } from './routes/leads.js';
import { proposalRoutes } from './routes/proposals.js';
import { businessRoutes } from './routes/businesses.js';
import { websiteRoutes } from './routes/websites.js';
import { imageRoutes } from './routes/images.js';
import { voiceAgentRoutes } from './routes/voice-agent.js';
import { chatbotRoutes } from './routes/chatbot.js';
import { oauthRoutes } from './routes/oauth.js';
import { meRoutes } from './routes/me.js';
import { billingRoutes } from './routes/billing.js';
import { sendingDomainRoutes } from './routes/sending-domains.js';
import { stripeWebhookRoutes } from './routes/webhooks/stripe.js';
import { surveyRoutes } from './routes/surveys.js';
import { campaignRoutes } from './routes/campaigns.js';
import { qrCodeRoutes } from './routes/qr-codes.js';
import { socialMediaRoutes } from './routes/social-media.js';
import { sequenceRoutes } from './routes/sequences.js';
import { reservationRoutes } from './routes/reservations.js';
import { orderRoutes } from './routes/orders.js';
import { businessToolRoutes } from './routes/business-tools.js';
import { waitlistRoutes } from './routes/waitlist.js';
import { cateringRoutes } from './routes/catering.js';
import { feedbackRoutes } from './routes/feedback.js';
import { tableRoutes } from './routes/tables.js';
import { giftCardRoutes } from './routes/gift-cards.js';
import { reviewRoutes } from './routes/reviews.js';
import { competitorRoutes } from './routes/competitors.js';
import { appointmentRoutes } from './routes/appointments.js';

const log = createLogger('api:gateway');

export async function buildApp() {
  const app = Fastify({
    logger: false,
    requestTimeout: 0,  // No timeout
  });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  // Build CORS origins list — auto-include www variants for any custom domain
  const rawOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  const origins = new Set(rawOrigins);
  for (const o of rawOrigins) {
    try {
      const u = new URL(o);
      if (u.hostname.startsWith('www.')) {
        origins.add(o.replace('://www.', '://'));
      } else if (!u.hostname.includes('localhost')) {
        origins.add(o.replace('://', '://www.'));
      }
    } catch { /* skip invalid */ }
  }

  await app.register(cors, {
    origin: [...origins],
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    // Allow iframe embedding for website preview
    frameguard: false,
  });

  await app.register(multipart, {
    attachFieldsToBody: 'keyValues',
  });

  // Parse application/x-www-form-urlencoded (needed for Twilio webhooks)
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    try {
      const parsed = Object.fromEntries(new URLSearchParams(body as string));
      done(null, parsed);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (request) =>
      (request.headers['x-forwarded-for'] as string) ?? request.ip,
  });

  // ─── Global Error Handler ────────────────────────────────────────────────────
  app.setErrorHandler((error, _request, reply) => {
    if (isEmbedoError(error)) {
      log.warn({ err: error, code: error.code }, error.message);
      return reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    // Fastify validation errors
    const fe = error as FastifyError;
    if (fe.statusCode === 400) {
      return reply.code(400).send({ success: false, error: fe.message });
    }

    log.error({ err: error }, 'Unhandled API error');
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  });

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(elevenLabsWebhookRoutes);
  await app.register(twilioWebhookRoutes);
  await app.register(calWebhookRoutes);
  await app.register(sendgridInboundRoutes);
  await app.register(sendgridEventRoutes);
  await app.register(trackRoutes);
  await app.register(leadCaptureRoutes);
  await app.register(proposalRoutes);
  await app.register(businessRoutes);
  await app.register(websiteRoutes);
  await app.register(imageRoutes);
  await app.register(voiceAgentRoutes);
  await app.register(chatbotRoutes);
  await app.register(oauthRoutes);
  await app.register(meRoutes);
  await app.register(billingRoutes);
  await app.register(stripeWebhookRoutes);
  await app.register(surveyRoutes);
  await app.register(campaignRoutes);
  await app.register(qrCodeRoutes);
  await app.register(socialMediaRoutes);
  await app.register(sequenceRoutes);
  await app.register(reservationRoutes);
  await app.register(orderRoutes);
  await app.register(businessToolRoutes);
  await app.register(waitlistRoutes);
  await app.register(cateringRoutes);
  await app.register(feedbackRoutes);
  await app.register(tableRoutes);
  await app.register(giftCardRoutes);
  await app.register(reviewRoutes);
  await app.register(competitorRoutes);
  await app.register(appointmentRoutes);
  await app.register(sendingDomainRoutes);

  log.info('API Gateway configured');
  return app;
}
// redeploy 1774025549
