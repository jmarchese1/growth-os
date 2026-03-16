import { Worker, type Job } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import type { ProposalViewedPayload } from '@embedo/types';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import type { ProposalIntakeData } from '@embedo/types';
import { sendFollowUpEmail } from '../notifications/follow-up.js';
import { env } from '../config.js';

const log = createLogger('proposal-engine:viewed-worker');

export function startProposalViewedWorker(): void {
  const worker = new Worker<ProposalViewedPayload>(
    QUEUE_NAMES.PROPOSAL_VIEWED,
    async (job) => {
      const { proposalId, shareToken } = job.data;
      log.info({ proposalId }, 'Processing proposal.viewed event');

      // Fetch proposal with intake data
      const proposal = await db.proposal.findUnique({
        where: { id: proposalId },
      });

      if (!proposal) {
        log.warn({ proposalId }, 'Proposal not found — skipping follow-up');
        return;
      }

      const intake = proposal.intakeData as unknown as ProposalIntakeData;

      // Need a contact email to send follow-up
      if (!intake.contactEmail) {
        log.info({ proposalId }, 'No contact email on proposal — skipping follow-up');
        return;
      }

      const shareUrl = `${env.PROPOSAL_BASE_URL}/${shareToken}`;

      await sendFollowUpEmail({
        contactEmail: intake.contactEmail,
        businessName: intake.businessName,
        shareUrl,
        ...(intake.contactName ? { contactName: intake.contactName } : {}),
      });

      log.info({ proposalId, contactEmail: intake.contactEmail }, 'Proposal follow-up completed');
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    },
  );

  worker.on('failed', (job: Job<ProposalViewedPayload> | undefined, err: Error) => {
    log.error({ err, jobId: job?.id, proposalId: job?.data?.proposalId }, 'Proposal follow-up job failed');
  });

  worker.on('completed', (job: Job<ProposalViewedPayload>) => {
    log.info({ jobId: job.id }, 'Proposal follow-up job completed');
  });

  log.info('Proposal viewed worker started');
}
