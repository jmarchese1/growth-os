import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import type { OutreachSendPayload } from '@embedo/types';
import { sendColdEmail } from '../outreach/email-sender.js';

const log = createLogger('prospector:outreach-worker');

// Statuses where ALL further outreach stops.
// CONTACTED and OPENED are intentionally excluded — those prospects still receive follow-up steps.
const STOP_OUTREACH_STATUSES = new Set([
  'REPLIED',
  'MEETING_BOOKED',
  'CONVERTED',
  'UNSUBSCRIBED',
  'BOUNCED',
  'DEAD',
]);

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

      if (STOP_OUTREACH_STATUSES.has(prospect.status)) {
        log.info({ prospectId, status: prospect.status, stepNumber }, 'Outreach stopped — terminal status');
        await db.prospectBusiness.update({ where: { id: prospectId }, data: { nextFollowUpAt: null } });
        return;
      }

      if (!prospect.email) {
        log.info({ prospectId }, 'No email on prospect — skipping');
        await db.prospectBusiness.update({ where: { id: prospectId }, data: { status: 'DEAD', nextFollowUpAt: null } });
        return;
      }

      // Prevent duplicate sends for same step
      const existingMsg = await db.outreachMessage.findFirst({
        where: { prospectId, stepNumber: stepNumber ?? 1 },
        select: { id: true },
      });
      if (existingMsg) {
        log.info({ prospectId, stepNumber }, 'Step already sent — skipping duplicate');
        return;
      }

      const suppression = await db.outreachSuppression.findUnique({
        where: { email: prospect.email.toLowerCase() },
      });
      if (suppression) {
        const status = suppression.reason.includes('bounce') || suppression.reason.includes('invalid')
          ? 'BOUNCED'
          : 'UNSUBSCRIBED';
        await db.prospectBusiness.update({ where: { id: prospectId }, data: { status, nextFollowUpAt: null } });
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
      // Only skip missing step if it's a follow-up (step > 1). Step 1 uses campaign defaults.
      if (stepNumber && stepNumber > 1 && !step) {
        log.info({ prospectId, stepNumber }, 'Sequence step not found — skipping');
        return;
      }

      try {
        await sendColdEmail(prospect, campaign, {
          ...(step?.subject !== undefined && { subjectOverride: step.subject }),
          ...(step?.bodyHtml !== undefined && { bodyHtmlOverride: step.bodyHtml }),
          ...(stepNumber !== undefined && { stepNumber }),
          disableAi: stepNumber ? stepNumber > 1 : false,
        });

        // After a successful send, update nextFollowUpAt to when the NEXT step will fire
        const currentStep = stepNumber ?? 1;
        const nextStep = steps.find((s) => s.stepNumber === currentStep + 1);
        if (nextStep) {
          const baseDelayMs = 5 * 60 * 1000;
          const nextFireAt = new Date(
            prospect.createdAt.getTime() + baseDelayMs + nextStep.delayHours * 60 * 60 * 1000,
          );
          await db.prospectBusiness.update({ where: { id: prospectId }, data: { nextFollowUpAt: nextFireAt } });
          log.info({ prospectId, nextFireAt, nextStep: currentStep + 1 }, 'Next follow-up scheduled');
        } else {
          // Last step sent — no more follow-ups
          await db.prospectBusiness.update({ where: { id: prospectId }, data: { nextFollowUpAt: null } });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('suppressed')) {
          await db.prospectBusiness.update({
            where: { id: prospectId },
            data: { status: 'UNSUBSCRIBED', nextFollowUpAt: null },
          });
          log.info({ prospectId }, 'Suppressed email — marking unsubscribed');
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
