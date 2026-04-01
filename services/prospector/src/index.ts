import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { registerRoutes } from './routes.js';
import { startProspectWorker } from './workers/prospect.worker.js';
import { startOutreachWorker } from './workers/outreach.worker.js';
import { sendDailyDigest } from './workers/digest.worker.js';
import { resetDailyCounts, advanceWarmup } from './outreach/domain-rotator.js';
import { startInstagramDmWorker } from './workers/instagram-dm.worker.js';
import { resetDailyCounts as resetIgDailyCounts } from './instagram/session-manager.js';
import { checkForReplies } from './instagram/reply-checker.js';

const log = createLogger('prospector');

async function start() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false });

  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, _request, reply) => {
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
  startInstagramDmWorker();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Prospector service started');

  // Daily digest — runs every 24h, sends at ~9am EST (schedule on startup + interval)
  const now = new Date();
  const next9am = new Date(now);
  next9am.setUTCHours(14, 0, 0, 0); // 9am EST = 14:00 UTC
  if (next9am <= now) next9am.setDate(next9am.getDate() + 1);
  const msUntil9am = next9am.getTime() - now.getTime();

  setTimeout(() => {
    sendDailyDigest();
    setInterval(sendDailyDigest, 24 * 60 * 60 * 1000);
  }, msUntil9am);
  log.info({ nextDigestAt: next9am.toISOString() }, 'Daily digest scheduled');

  // Midnight ET reset — reset daily send counts + advance warm-up stages
  const nextMidnightET = new Date(now);
  nextMidnightET.setUTCHours(5, 0, 0, 0); // midnight ET = 5:00 UTC (EST)
  if (nextMidnightET <= now) nextMidnightET.setDate(nextMidnightET.getDate() + 1);
  const msUntilMidnight = nextMidnightET.getTime() - now.getTime();

  setTimeout(() => {
    resetDailyCounts();
    advanceWarmup();
    resetIgDailyCounts();
    setInterval(() => {
      resetDailyCounts();
      advanceWarmup();
      resetIgDailyCounts();
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
  log.info({ nextResetAt: nextMidnightET.toISOString() }, 'Midnight ET reset scheduled');

  // Instagram reply checker — every hour, 8am-11pm ET, Mon-Sat
  // The checkForReplies function itself enforces the time/day window
  setInterval(() => {
    checkForReplies().catch(err => log.error({ err }, 'Instagram reply check failed'));
  }, 60 * 60 * 1000); // every hour
  // Also run once on startup (will skip if outside window)
  setTimeout(() => {
    checkForReplies().catch(err => log.error({ err }, 'Instagram reply check failed'));
  }, 30000); // 30s after startup
  log.info('Instagram reply checker scheduled (hourly, 8am-11pm ET, Mon-Sat)');

}

start().catch((err) => {
  console.error('Failed to start prospector:', err);
  process.exit(1);
});
