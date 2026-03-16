import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger, isEmbedoError } from '@embedo/utils';
import { env } from './config.js';
import { startOnboardingWorker } from './workers/onboarding.worker.js';
import { provisionAgent, updateAgentPrompt } from './elevenlabs/agent.js';
import { provisionPhoneNumber } from './twilio/provisioning.js';

const log = createLogger('voice-agent');

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

  app.get('/health', async () => ({ ok: true, service: 'voice-agent' }));

  // ─── Provision endpoint (called by API gateway) ────────────────────────────
  app.post('/provision', async (request, reply) => {
    const { businessId, areaCode } = request.body as { businessId: string; areaCode?: string };

    if (!businessId) {
      return reply.code(400).send({ success: false, error: 'businessId is required' });
    }

    try {
      log.info({ businessId }, 'Starting voice agent provisioning');

      // 1. Create ElevenLabs agent
      const agentId = await provisionAgent(businessId);

      // 2. Provision Twilio phone number
      const webhookUrl = `${env.BASE_URL}/webhooks/twilio/voice`;
      const phoneNumber = await provisionPhoneNumber({ businessId, areaCode, webhookUrl });

      log.info({ businessId, agentId, phoneNumber }, 'Voice agent provisioning complete');
      return { success: true, agentId, phoneNumber };
    } catch (err) {
      log.error({ err, businessId }, 'Provisioning failed');
      return reply.code(500).send({ success: false, error: String(err) });
    }
  });

  // ─── Update agent prompt (called by API gateway when settings change) ──────
  app.post('/update-prompt', async (request, reply) => {
    const { businessId } = request.body as { businessId: string };

    if (!businessId) {
      return reply.code(400).send({ success: false, error: 'businessId is required' });
    }

    try {
      await updateAgentPrompt(businessId);
      return { success: true };
    } catch (err) {
      log.error({ err, businessId }, 'Failed to update agent prompt');
      return reply.code(500).send({ success: false, error: String(err) });
    }
  });

  // Start onboarding worker to listen for business.onboarded events
  startOnboardingWorker();

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, 'Voice agent service started');
}

start().catch((err) => {
  console.error('Failed to start voice-agent:', err);
  process.exit(1);
});
