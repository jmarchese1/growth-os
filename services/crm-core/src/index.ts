import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { registerRoutes } from './routes.js';

const log = createLogger('crm-core');

async function start() {
  const app = Fastify({
    logger: false, // We use our own Pino logger
  });

  await app.register(cors, { origin: true });
  await app.register(helmet);

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (isEmbedoError(error)) {
      log.warn({ err: error, code: error.code }, error.message);
      return reply.code(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  });

  await registerRoutes(app);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'crm-core service started');
}

start().catch((err) => {
  console.error('Failed to start crm-core:', err);
  process.exit(1);
});
