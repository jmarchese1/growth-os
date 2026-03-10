import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import type { BusinessOnboardedPayload } from '@embedo/types';
import { createLogger } from '@embedo/utils';
import { provisionAgent } from '../elevenlabs/agent.js';
import { provisionPhoneNumber } from '../twilio/provisioning.js';
import { env } from '../config.js';

const log = createLogger('voice-agent:onboarding-worker');

export function startOnboardingWorker() {
  new Worker<BusinessOnboardedPayload>(
    QUEUE_NAMES.BUSINESS_ONBOARDED,
    async (job) => {
      const { businessId, businessName } = job.data;
      log.info({ businessId, businessName }, 'Provisioning voice agent');

      try {
        // 1. Create ElevenLabs conversational agent
        await provisionAgent(businessId);

        // 2. Provision Twilio phone number
        const webhookUrl = `${env.BASE_URL}/webhooks/twilio/voice`;
        await provisionPhoneNumber({ businessId, webhookUrl });

        log.info({ businessId }, 'Voice agent provisioning complete');
      } catch (err) {
        log.error({ err, businessId }, 'Voice agent provisioning failed');
        throw err; // BullMQ will retry
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    },
  );

  log.info('Voice agent onboarding worker started');
}
