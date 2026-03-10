import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import type { OutreachSendPayload } from '@embedo/types';
import { sendColdEmail } from '../outreach/email-sender.js';

const log = createLogger('prospector:outreach-worker');

const TERMINAL_STATUSES = new Set(['CONTACTED', 'OPENED', 'REPLIED', 'MEETING_BOOKED', 'CONVERTED', 'UNSUBSCRIBED', 'BOUNCED', 'DEAD']);

export function startOutreachWorker(): Worker {
  const worker = new Worker<OutreachSendPayload>(
    QUEUE_NAMES.OUTREACH_SEND,
    async (job) => {
      const { prospectId, campaignId, stepNumber } = job.data;

      const [prospect, campaign] = await Promise.all([
        db.prospectBusiness.findUnique({ where: { id: prospectId } }),
        db.outboundCampaign.findUnique({ where: { id: campaignId } }),
      ]);

      if (!prospect || !campaign) {
        log.warn({ prospectId, campaignId }, 'Prospect or campaign not found — skipping');
        return;
      }

      // Prevent duplicate outreach
      if (TERMINAL_STATUSES.has(prospect.status)) {
        log.info({ prospectId, status: prospect.status }, 'Prospect already contacted — skipping');
        return;
      }

      if (!prospect.email) {
        log.info({ prospectId }, 'No email on prospect — skipping email outreach');
        await db.prospectBusiness.update({ where: { id: prospectId }, data: { status: 'DEAD' } });
        return;
      }

      const suppression = await db.outreachSuppression.findUnique({
        where: { email: prospect.email.toLowerCase() },
      });
      if (suppression) {
        const status = suppression.reason.includes('bounce') || suppression.reason.includes('invalid')
          ? 'BOUNCED'
          : 'UNSUBSCRIBED';
        await db.prospectBusiness.update({ where: { id: prospectId }, data: { status } });
        log.info({ prospectId, status }, 'Suppressed email — skipping send');
        return;
      }

      const steps = (campaign.sequenceSteps as Array<{
        stepNumber: number;
        delayHours: number;
        subject?: string;
        bodyHtml?: string;
      }> | null) ?? [];

      const step = stepNumber ? steps.find((s) => s.stepNumber === stepNumber) : null;
      if (stepNumber && !step) {
        log.info({ prospectId, stepNumber }, 'Sequence step not found â€” skipping');
        return;
      }

      try {
        await sendColdEmail(prospect, campaign, {
          subjectOverride: step?.subject,
          bodyHtmlOverride: step?.bodyHtml,
          stepNumber,
          disableAi: stepNumber ? stepNumber > 1 : false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('suppressed')) {
          await db.prospectBusiness.update({
            where: { id: prospectId },
            data: { status: 'UNSUBSCRIBED' },
          });
          log.info({ prospectId }, 'Suppressed email â€” marking unsubscribed');
          return;
        }
        throw err;
      }
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Outreach worker job failed');
  });

  log.info('Outreach worker started');
  return worker;
}
