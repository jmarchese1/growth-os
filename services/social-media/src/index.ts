import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { startWorkers } from './workers/social.worker.js';
import { startContentScheduler } from './scheduler/calendar.js';

const log = createLogger('social-media');

async function start() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  app.setErrorHandler((error, _request, reply) => {
    if (isEmbedoError(error)) {
      return reply.code(error.statusCode).send({ success: false, error: error.message });
    }
    log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  });

  app.get('/health', async () => ({ ok: true, service: 'social-media' }));

  // Meta (Instagram/Facebook) webhook verification
  app.get('/webhooks/meta', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === env.INSTAGRAM_WEBHOOK_SECRET) {
      return reply.send(challenge);
    }
    return reply.code(403).send('Forbidden');
  });

  // Meta webhook events
  app.post('/webhooks/meta', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    log.info({ type: body['object'] }, 'Meta webhook received');
    // TODO: Process comment and message events, trigger auto-DM queue
    return reply.code(200).send({ received: true });
  });

  startWorkers();
  startContentScheduler();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Social media service started');
}

start().catch((err) => {
  console.error('Failed to start social-media:', err);
  process.exit(1);
});
