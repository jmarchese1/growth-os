import { db } from '@embedo/db';
import type { SequenceTrigger } from '@embedo/db';
import { sequenceStepQueue } from '@embedo/queue';
import { createLogger } from '@embedo/utils';

const log = createLogger('lead-engine:sequences');

/**
 * Trigger all active SMS and email sequences for a business/contact/trigger combination.
 * Enqueues BullMQ jobs with appropriate delays for each step.
 */
export async function triggerSequences(params: {
  businessId: string;
  contactId: string;
  trigger: SequenceTrigger;
}): Promise<void> {
  const { businessId, contactId, trigger } = params;

  const [emailSequences, smsSequences] = await Promise.all([
    db.emailSequence.findMany({ where: { businessId, trigger, active: true } }),
    db.smsSequence.findMany({ where: { businessId, trigger, active: true } }),
  ]);

  const jobs: Promise<unknown>[] = [];

  for (const sequence of emailSequences) {
    const steps = sequence.steps as Array<{ stepNumber: number; delayHours: number }>;
    for (const step of steps) {
      const delayMs = step.delayHours * 60 * 60 * 1000;
      jobs.push(
        sequenceStepQueue().add(
          `seq:email:${sequence.id}:step${step.stepNumber}:${contactId}`,
          {
            businessId,
            contactId,
            sequenceId: sequence.id,
            stepNumber: step.stepNumber,
            channel: 'email',
          },
          { delay: delayMs },
        ),
      );
    }
  }

  for (const sequence of smsSequences) {
    const steps = sequence.steps as Array<{ stepNumber: number; delayHours: number }>;
    for (const step of steps) {
      const delayMs = step.delayHours * 60 * 60 * 1000;
      jobs.push(
        sequenceStepQueue().add(
          `seq:sms:${sequence.id}:step${step.stepNumber}:${contactId}`,
          {
            businessId,
            contactId,
            sequenceId: sequence.id,
            stepNumber: step.stepNumber,
            channel: 'sms',
          },
          { delay: delayMs },
        ),
      );
    }
  }

  await Promise.all(jobs);

  log.info(
    {
      businessId,
      contactId,
      trigger,
      emailSequences: emailSequences.length,
      smsSequences: smsSequences.length,
    },
    'Sequences triggered',
  );
}
