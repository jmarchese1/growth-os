import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { startWorkers } from './workers/lead.worker.js';

const log = createLogger('lead-engine');

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

  app.get('/health', async () => ({ ok: true, service: 'lead-engine' }));

  // Start BullMQ workers
  startWorkers();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Lead engine started');
}

start().catch((err) => {
  console.error('Failed to start lead-engine:', err);
  process.exit(1);
});
