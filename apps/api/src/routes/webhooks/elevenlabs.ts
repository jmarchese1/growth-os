import type { FastifyInstance } from 'fastify';
import { verifyWebhookSignature, createLogger } from '@embedo/utils';
import { callCompletedQueue, leadCreatedQueue } from '@embedo/queue';
import { db } from '@embedo/db';
import { env } from '../../config.js';

const log = createLogger('api:webhook:elevenlabs');

interface ElevenLabsWebhookPayload {
  type: string;
  event_timestamp: number;
  data: {
    conversation_id: string;
    agent_id: string;
    status: string;
    transcript?: Array<{ role: string; message: string; time_in_call_secs: number }>;
    analysis?: {
      summary?: string;
      sentiment?: string;
      call_successful?: string;
    };
    call_duration_secs?: number;
    metadata?: Record<string, unknown>;
  };
}

export async function elevenLabsWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/webhooks/elevenlabs',
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      const signature = request.headers['elevenlabs-signature'] as string;
      const rawBody = (request as unknown as { rawBody: Buffer }).rawBody;

      if (signature && env.SUPABASE_SERVICE_ROLE_KEY) {
        const webhookSecret = process.env['ELEVENLABS_WEBHOOK_SECRET'] ?? '';
        const valid = verifyWebhookSignature({
          payload: rawBody,
          signature,
          secret: webhookSecret,
        });
        if (!valid) {
          log.warn('Invalid ElevenLabs webhook signature');
          return reply.code(401).send({ error: 'Invalid signature' });
        }
      }

      const payload = request.body as ElevenLabsWebhookPayload;
      log.info({ type: payload.type, conversationId: payload.data.conversation_id }, 'ElevenLabs webhook received');

      if (payload.type !== 'conversation_ended') {
        return reply.code(200).send({ received: true });
      }

      const { data } = payload;

      // Find which business this agent belongs to
      const business = await db.business.findFirst({
        where: { elevenLabsAgentId: data.agent_id },
      });

      if (!business) {
        log.warn({ agentId: data.agent_id }, 'No business found for ElevenLabs agent');
        return reply.code(200).send({ received: true });
      }

      const transcript = data.transcript
        ?.map((t) => `${t.role}: ${t.message}`)
        .join('\n');

      // Emit call.completed event for processing
      await callCompletedQueue().add(`call:${data.conversation_id}`, {
        businessId: business.id,
        callSid: data.conversation_id,
        intent: 'UNKNOWN',
        duration: data.call_duration_secs ?? 0,
        transcript,
        summary: data.analysis?.summary,
        sentiment: data.analysis?.sentiment,
        extractedData: data.metadata,
      });

      // Also emit lead.created with whatever data is in metadata
      if (data.metadata) {
        await leadCreatedQueue().add(`lead:voice:${data.conversation_id}`, {
          businessId: business.id,
          source: 'VOICE',
          sourceId: data.conversation_id,
          rawData: data.metadata,
        });
      }

      return reply.code(200).send({ received: true });
    },
  );
}
