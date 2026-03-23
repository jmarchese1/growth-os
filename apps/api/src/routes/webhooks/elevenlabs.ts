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
        ...(transcript !== undefined && { transcript }),
        ...(data.analysis?.summary !== undefined && { summary: data.analysis.summary }),
        ...(data.analysis?.sentiment !== undefined && { sentiment: data.analysis.sentiment }),
        ...(data.metadata !== undefined && { extractedData: data.metadata }),
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

      // Parse ORDER_DATA from transcript (voice agent outputs this when taking orders)
      if (transcript) {
        const orderMatch = transcript.match(/ORDER_DATA:\s*(\{[\s\S]*?\})/);
        if (orderMatch?.[1]) {
          try {
            const orderData = JSON.parse(orderMatch[1]) as {
              name?: string;
              phone?: string;
              items?: Array<{ name: string; quantity: number; price: number; notes?: string }>;
              specialNotes?: string;
              pickupTime?: string;
            };

            if (orderData.name && orderData.items && orderData.items.length > 0) {
              // Check if takeout orders tool is enabled for this business
              const tool = await db.businessTool.findUnique({
                where: { businessId_type: { businessId: business.id, type: 'TAKEOUT_ORDERS' } },
              });

              if (tool?.enabled) {
                const toolConfig = (tool.config as Record<string, unknown>) ?? {};
                const taxRate = (toolConfig['taxRate'] as number) ?? 0;
                const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const tax = Math.round(subtotal * taxRate * 100) / 100;
                const total = Math.round((subtotal + tax) * 100) / 100;

                await db.order.create({
                  data: {
                    businessId: business.id,
                    customerName: orderData.name,
                    customerPhone: orderData.phone,
                    specialNotes: orderData.specialNotes,
                    pickupTime: orderData.pickupTime,
                    subtotal,
                    tax,
                    total,
                    source: 'VOICE_AGENT',
                    voiceCallLogId: data.conversation_id,
                    items: {
                      create: orderData.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        notes: item.notes,
                      })),
                    },
                  },
                });
                log.info({ businessId: business.id, conversationId: data.conversation_id }, 'Order created from voice agent');
              }
            }
          } catch (err) {
            log.warn({ err, conversationId: data.conversation_id }, 'Failed to parse ORDER_DATA from transcript');
          }
        }
      }

      return reply.code(200).send({ received: true });
    },
  );
}
