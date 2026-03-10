import { createLogger } from '@embedo/utils';
import { env } from './config.js';
import { buildApp } from './app.js';

const log = createLogger('api');

async function start() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Embedo API Gateway started');
}

start().catch((err) => {
  console.error('Failed to start API gateway:', err);
  process.exit(1);
});
