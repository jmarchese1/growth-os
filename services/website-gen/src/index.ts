import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { startWorkers } from './workers/website.worker.js';
import { websiteRoutes } from './routes.js';
import { initKnowledgeBase } from './training/knowledge-base.js';

const log = createLogger('website-gen');

async function start() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (isEmbedoError(error)) {
      return reply.code(error.statusCode).send({ success: false, error: error.message });
    }
    log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  });

  app.get('/health', async () => ({ ok: true, service: 'website-gen' }));

  await app.register(websiteRoutes);
  startWorkers();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Website gen service started');

  // Non-blocking: scrapes curated training sites in background, caches style insights in memory.
  // Static insights are always available; dynamic insights enrich responses as they arrive.
  if (env.ANTHROPIC_API_KEY) {
    initKnowledgeBase(env.ANTHROPIC_API_KEY);
  }
}

start().catch((err) => {
  console.error('Failed to start website-gen:', err);
  process.exit(1);
});
