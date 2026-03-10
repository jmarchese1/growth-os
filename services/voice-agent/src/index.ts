import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { startOnboardingWorker } from './workers/onboarding.worker.js';

const log = createLogger('voice-agent');

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

  app.get('/health', async () => ({ ok: true, service: 'voice-agent' }));

  // Start onboarding worker to listen for business.onboarded events
  startOnboardingWorker();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Voice agent service started');
}

start().catch((err) => {
  console.error('Failed to start voice-agent:', err);
  process.exit(1);
});
