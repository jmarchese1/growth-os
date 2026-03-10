import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import type { LeadCreatedPayload, CallCompletedPayload, SmsJobPayload, EmailJobPayload, SequenceStepJobPayload } from '@embedo/types';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { normalizeLead } from '../capture/normalizer.js';
import { deduplicateContact } from '../capture/deduplication.js';
import { triggerSequences } from '../sequences/sequence-engine.js';
import { sendSms } from '../messaging/sms.js';
import { sendEmail } from '../messaging/email.js';

const log = createLogger('lead-engine:workers');

export function startWorkers() {
  // ─── Lead Created Worker ──────────────────────────────────────────────────
  new Worker<LeadCreatedPayload>(
    QUEUE_NAMES.LEAD_CREATED,
    async (job) => {
      const { businessId, source, rawData } = job.data;
      log.info({ jobId: job.id, businessId, source }, 'Processing lead.created');

      const normalized = normalizeLead(rawData as Parameters<typeof normalizeLead>[0]);

      // Store the raw lead record
      await db.lead.create({
        data: {
          businessId,
          source: source as Parameters<typeof db.lead.create>[0]['data']['source'],
          sourceId: job.data.sourceId,
          rawData: rawData as object,
          status: 'NEW',
        },
      });

      // Deduplicate into Contact
      const { contact, created } = await deduplicateContact({
        businessId,
        lead: normalized,
        source: source as Parameters<typeof deduplicateContact>[0]['source'],
      });

      // Trigger automation sequences for new contacts
      if (created) {
        await triggerSequences({
          businessId,
          contactId: contact.id,
          trigger: 'LEAD_CREATED',
        });
      }

      log.info({ contactId: contact.id, created }, 'Lead processed');
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  // ─── Call Completed Worker ────────────────────────────────────────────────
  new Worker<CallCompletedPayload>(
    QUEUE_NAMES.CALL_COMPLETED,
    async (job) => {
      const { businessId, callSid, contactId, extractedData, transcript, duration } = job.data;
      log.info({ jobId: job.id, businessId, callSid }, 'Processing call.completed');

      await db.voiceCallLog.upsert({
        where: { twilioCallSid: callSid },
        create: {
          businessId,
          contactId,
          twilioCallSid: callSid,
          direction: 'INBOUND',
          duration,
          transcript,
          intent: job.data.intent as Parameters<typeof db.voiceCallLog.create>[0]['data']['intent'],
          extractedData: extractedData as object ?? undefined,
          leadCaptured: !!extractedData,
        },
        update: {
          transcript,
          duration,
          extractedData: extractedData as object ?? undefined,
        },
      });

      log.info({ callSid }, 'Call log saved');
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );

  // ─── SMS Job Worker ───────────────────────────────────────────────────────
  new Worker<SmsJobPayload>(
    QUEUE_NAMES.SMS,
    async (job) => {
      await sendSms({ to: job.data.to, body: job.data.body, from: job.data.from });
    },
    { connection: getRedisConnection(), concurrency: 10 },
  );

  // ─── Email Job Worker ─────────────────────────────────────────────────────
  new Worker<EmailJobPayload>(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      await sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.html,
        templateId: job.data.templateId,
        dynamicData: job.data.dynamicData,
      });
    },
    { connection: getRedisConnection(), concurrency: 10 },
  );

  // ─── Sequence Step Worker ─────────────────────────────────────────────────
  new Worker<SequenceStepJobPayload>(
    QUEUE_NAMES.SEQUENCE_STEP,
    async (job) => {
      const { businessId, contactId, sequenceId, stepNumber, channel } = job.data;
      log.info({ jobId: job.id, sequenceId, stepNumber, channel }, 'Processing sequence step');

      const contact = await db.contact.findUnique({ where: { id: contactId } });
      if (!contact) {
        log.warn({ contactId }, 'Contact not found, skipping sequence step');
        return;
      }

      if (channel === 'sms') {
        const seq = await db.smsSequence.findUnique({ where: { id: sequenceId } });
        if (!seq) return;

        const steps = seq.steps as Array<{ stepNumber: number; message: string }>;
        const step = steps.find((s) => s.stepNumber === stepNumber);
        if (!step || !contact.phone) return;

        const business = await db.business.findUnique({ where: { id: businessId } });
        await sendSms({
          to: contact.phone,
          body: step.message.replace('{{name}}', contact.firstName ?? 'there'),
          from: business?.twilioPhoneNumber ?? undefined,
        });
      } else {
        const seq = await db.emailSequence.findUnique({ where: { id: sequenceId } });
        if (!seq) return;

        const steps = seq.steps as Array<{ stepNumber: number; subject: string; templateId?: string; body?: string }>;
        const step = steps.find((s) => s.stepNumber === stepNumber);
        if (!step || !contact.email) return;

        await sendEmail({
          to: contact.email,
          subject: step.subject,
          templateId: step.templateId,
          html: step.body,
          dynamicData: { firstName: contact.firstName ?? 'there' },
        });
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  log.info('Lead engine workers started');
}
