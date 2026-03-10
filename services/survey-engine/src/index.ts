import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { registerRoutes } from './routes.js';
import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import type { CallCompletedPayload, SurveyDeliveryPayload } from '@embedo/types';
import { smsQueue } from '@embedo/queue';
import { db } from '@embedo/db';

const log = createLogger('survey-engine');

async function start() {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  app.setErrorHandler((error, _request, reply) => {
    if (isEmbedoError(error)) {
      return reply.code(error.statusCode).send({ success: false, error: error.message });
    }
    log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({ success: false, error: 'Internal server error' });
  });

  await registerRoutes(app);

  // ─── Worker: call.completed → send post-call survey ───────────────────────
  new Worker<CallCompletedPayload>(
    QUEUE_NAMES.CALL_COMPLETED,
    async (job) => {
      const { businessId, contactId } = job.data;

      // Find a post-call survey for this business
      const survey = await db.survey.findFirst({
        where: { businessId, active: true },
      });

      if (!survey) return;

      // Find contact's phone
      if (!contactId) return;
      const contact = await db.contact.findUnique({ where: { id: contactId } });
      if (!contact?.phone) return;

      const business = await db.business.findUnique({ where: { id: businessId } });
      const surveyUrl = `${env.SURVEY_BASE_URL}/${survey.id}/render`;

      await smsQueue().add(`post-call-survey:${job.data.callSid}`, {
        to: contact.phone,
        from: business?.twilioPhoneNumber ?? env.TWILIO_FROM_NUMBER,
        body: `Hi! Thanks for calling ${business?.name ?? 'us'}. We'd love your feedback: ${surveyUrl}`,
        businessId,
        contactId,
      }, { delay: 5 * 60 * 1000 }); // 5 minute delay
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  // ─── Worker: survey delivery ──────────────────────────────────────────────
  new Worker<SurveyDeliveryPayload>(
    QUEUE_NAMES.SURVEY_DELIVERY,
    async (job) => {
      const { surveyId, contactId, channel } = job.data;
      const [survey, contact] = await Promise.all([
        db.survey.findUnique({ where: { id: surveyId } }),
        db.contact.findUnique({ where: { id: contactId } }),
      ]);

      if (!survey || !contact) return;

      const surveyUrl = `${env.SURVEY_BASE_URL}/${surveyId}/render`;
      const business = await db.business.findUnique({ where: { id: survey.businessId } });

      if (channel === 'sms' && contact.phone) {
        await smsQueue().add(`survey-delivery:${surveyId}:${contactId}`, {
          to: contact.phone,
          from: business?.twilioPhoneNumber ?? env.TWILIO_FROM_NUMBER,
          body: `Hi ${contact.firstName ?? 'there'}! ${business?.name} would love your feedback: ${surveyUrl}`,
          businessId: survey.businessId,
          contactId,
        });
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Survey engine started');
}

start().catch((err) => {
  console.error('Failed to start survey-engine:', err);
  process.exit(1);
});
