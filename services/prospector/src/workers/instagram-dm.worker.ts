import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import { createLogger } from '@embedo/utils';
import type { InstagramDmSendPayload } from '@embedo/types';
import { sendInstagramDm } from '../instagram/dm-sender.js';

const log = createLogger('prospector:ig-dm-worker');

export function startInstagramDmWorker(): Worker {
  const worker = new Worker<InstagramDmSendPayload>(
    QUEUE_NAMES.INSTAGRAM_DM_SEND,
    async (job) => {
      const { prospectId, campaignId, sessionId, stepNumber } = job.data;

      log.info({ prospectId, campaignId, jobId: job.id }, 'Processing Instagram DM job');

      const result = await sendInstagramDm(prospectId, campaignId, sessionId, stepNumber);

      if (!result.success) {
        log.warn({ prospectId, dmId: result.dmId, error: result.error }, 'Instagram DM failed');

        // If session is challenged/expired, don't retry — it won't help
        if (result.error?.includes('Session is')) {
          return; // Don't throw — prevents retry
        }

        throw new Error(result.error ?? 'DM send failed');
      }

      // Add randomized delay before the next job can be processed
      // This spreads DMs across time to avoid detection
      const delayMs = (2 + Math.random() * 3) * 60 * 1000; // 2-5 minutes
      log.info({ delayMs: Math.round(delayMs / 1000) }, 'Waiting before next DM');
      await new Promise((r) => setTimeout(r, delayMs));
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 1, // MUST be 1 — sequential DMs to avoid detection
      limiter: {
        max: 1,
        duration: 120000, // At most 1 job per 2 minutes
      },
    },
  );

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Instagram DM worker job failed');
  });

  log.info('Instagram DM worker started');
  return worker;
}
