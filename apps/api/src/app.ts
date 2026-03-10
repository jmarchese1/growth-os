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
import { trackRoutes } from './routes/track.js';

const log = createLogger('api:gateway');

export async function buildApp() {
  const app = Fastify({ logger: false });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // disabled for API
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
  await app.register(trackRoutes);

  log.info('API Gateway configured');
  return app;
}
