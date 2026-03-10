import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { registerRoutes } from './routes.js';
import { startProspectWorker } from './workers/prospect.worker.js';
import { startOutreachWorker } from './workers/outreach.worker.js';

const log = createLogger('prospector');

async function start() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false });

  app.setErrorHandler((error, _request, reply) => {
    if (isEmbedoError(error)) {
      return reply.code(error.statusCode).send({ success: false, error: error.message, code: error.code });
    }
    log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  });

  await registerRoutes(app);

  // Start BullMQ workers
  startProspectWorker();
  startOutreachWorker();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Prospector service started');
}

start().catch((err) => {
  console.error('Failed to start prospector:', err);
  process.exit(1);
});
