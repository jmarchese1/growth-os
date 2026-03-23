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

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await db.order.create({
                  data: {
                    businessId: business.id,
                    customerName: orderData.name,
                    ...(orderData.phone != null ? { customerPhone: orderData.phone } : {}),
                    ...(orderData.specialNotes != null ? { specialNotes: orderData.specialNotes } : {}),
                    ...(orderData.pickupTime != null ? { pickupTime: orderData.pickupTime } : {}),
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
                        ...(item.notes != null ? { notes: item.notes } : {}),
                      })),
                    },
                  } as any,
                });
                log.info({ businessId: business.id, conversationId: data.conversation_id }, 'Order created from voice agent');
              }
            }
          } catch (err) {
            log.warn({ err, conversationId: data.conversation_id }, 'Failed to parse ORDER_DATA from transcript');
          }
        }
      }

      // Parse WAITLIST_DATA from transcript
      if (transcript) {
        const waitlistMatch = transcript.match(/WAITLIST_DATA:\s*(\{[\s\S]*?\})/);
        if (waitlistMatch?.[1]) {
          try {
            const wData = JSON.parse(waitlistMatch[1]) as { name?: string; phone?: string; partySize?: number; notes?: string };
            if (wData.name && wData.partySize) {
              const tool = await db.businessTool.findUnique({ where: { businessId_type: { businessId: business.id, type: 'WAITLIST' } } });
              if (tool?.enabled) {
                const currentWaiting = await db.waitlistEntry.count({ where: { businessId: business.id, status: 'WAITING' } });
                const avgWait = ((tool.config as Record<string, unknown>)?.['avgWaitMinutes'] as number) ?? 15;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await db.waitlistEntry.create({
                  data: { businessId: business.id, guestName: wData.name, ...(wData.phone != null ? { guestPhone: wData.phone } : {}), partySize: wData.partySize, position: currentWaiting + 1, estimatedWait: (currentWaiting + 1) * avgWait, ...(wData.notes != null ? { notes: wData.notes } : {}), source: 'VOICE_AGENT' } as any,
                });
                log.info({ businessId: business.id, conversationId: data.conversation_id }, 'Waitlist entry created from voice agent');
              }
            }
          } catch (err) { log.warn({ err, conversationId: data.conversation_id }, 'Failed to parse WAITLIST_DATA'); }
        }
      }

      // Parse CATERING_DATA from transcript
      if (transcript) {
        const cateringMatch = transcript.match(/CATERING_DATA:\s*(\{[\s\S]*?\})/);
        if (cateringMatch?.[1]) {
          try {
            const cData = JSON.parse(cateringMatch[1]) as { name?: string; phone?: string; email?: string; eventDate?: string; eventTime?: string; eventType?: string; headcount?: number; budget?: number; dietaryNotes?: string; menuRequests?: string };
            if (cData.name && cData.headcount) {
              const tool = await db.businessTool.findUnique({ where: { businessId_type: { businessId: business.id, type: 'CATERING_REQUESTS' } } });
              if (tool?.enabled) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await db.cateringInquiry.create({
                  data: { businessId: business.id, customerName: cData.name, ...(cData.phone != null ? { customerPhone: cData.phone } : {}), ...(cData.email != null ? { customerEmail: cData.email } : {}), ...(cData.eventDate ? { eventDate: new Date(cData.eventDate) } : {}), ...(cData.eventTime != null ? { eventTime: cData.eventTime } : {}), ...(cData.eventType != null ? { eventType: cData.eventType } : {}), headcount: cData.headcount, ...(cData.budget != null ? { budget: cData.budget } : {}), ...(cData.dietaryNotes != null ? { dietaryNotes: cData.dietaryNotes } : {}), ...(cData.menuRequests != null ? { menuRequests: cData.menuRequests } : {}), source: 'VOICE_AGENT', voiceCallLogId: data.conversation_id } as any,
                });
                log.info({ businessId: business.id, conversationId: data.conversation_id }, 'Catering inquiry created from voice agent');
              }
            }
          } catch (err) { log.warn({ err, conversationId: data.conversation_id }, 'Failed to parse CATERING_DATA'); }
        }
      }

      // Parse GIFTCARD_DATA from transcript
      if (transcript) {
        const gcMatch = transcript.match(/GIFTCARD_DATA:\s*(\{[\s\S]*?\})/);
        if (gcMatch?.[1]) {
          try {
            const gcData = JSON.parse(gcMatch[1]) as { purchaserName?: string; purchaserPhone?: string; recipientName?: string; amount?: number; personalMessage?: string };
            if (gcData.amount && gcData.amount > 0) {
              const tool = await db.businessTool.findUnique({ where: { businessId_type: { businessId: business.id, type: 'GIFT_CARD_LOYALTY' } } });
              if (tool?.enabled) {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = 'GC-';
                for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await db.giftCard.create({
                  data: { businessId: business.id, code, initialAmount: gcData.amount, currentBalance: gcData.amount, ...(gcData.purchaserName != null ? { purchaserName: gcData.purchaserName } : {}), ...(gcData.purchaserPhone != null ? { purchaserPhone: gcData.purchaserPhone } : {}), ...(gcData.recipientName != null ? { recipientName: gcData.recipientName } : {}), ...(gcData.personalMessage != null ? { personalMessage: gcData.personalMessage } : {}), source: 'VOICE_AGENT' } as any,
                });
                log.info({ businessId: business.id, code, conversationId: data.conversation_id }, 'Gift card created from voice agent');
              }
            }
          } catch (err) { log.warn({ err, conversationId: data.conversation_id }, 'Failed to parse GIFTCARD_DATA'); }
        }
      }

      // Parse RESERVATION_DATA from transcript
      if (transcript) {
        const resMatch = transcript.match(/RESERVATION_DATA:\s*(\{[\s\S]*?\})/);
        if (resMatch?.[1]) {
          try {
            const rData = JSON.parse(resMatch[1]) as { guestName?: string; guestPhone?: string; guestEmail?: string; partySize?: number; date?: string; time?: string; specialRequests?: string };
            if (rData.guestName && rData.partySize && rData.date && rData.time) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await db.reservation.create({
                data: { businessId: business.id, guestName: rData.guestName, ...(rData.guestPhone != null ? { guestPhone: rData.guestPhone } : {}), ...(rData.guestEmail != null ? { guestEmail: rData.guestEmail } : {}), partySize: rData.partySize, date: new Date(rData.date), time: rData.time, ...(rData.specialRequests != null ? { specialRequests: rData.specialRequests } : {}), source: 'VOICE_AGENT', status: 'CONFIRMED' } as any,
              });
              log.info({ businessId: business.id, conversationId: data.conversation_id }, 'Reservation created from voice agent');
            }
          } catch (err) { log.warn({ err, conversationId: data.conversation_id }, 'Failed to parse RESERVATION_DATA'); }
        }
      }

      // Parse FEEDBACK_DATA from transcript
      if (transcript) {
        const fbMatch = transcript.match(/FEEDBACK_DATA:\s*(\{[\s\S]*?\})/);
        if (fbMatch?.[1]) {
          try {
            const fbData = JSON.parse(fbMatch[1]) as { customerName?: string; customerPhone?: string; rating?: string; comment?: string };
            if (fbData.rating && fbData.comment) {
              const tool = await db.businessTool.findUnique({ where: { businessId_type: { businessId: business.id, type: 'FEEDBACK_COLLECTION' } } });
              if (tool?.enabled) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await db.feedbackEntry.create({
                  data: { businessId: business.id, ...(fbData.customerName != null ? { customerName: fbData.customerName } : {}), ...(fbData.customerPhone != null ? { customerPhone: fbData.customerPhone } : {}), rating: fbData.rating as any, comment: fbData.comment, triggerType: 'VOICE_AGENT', voiceCallLogId: data.conversation_id } as any,
                });
                log.info({ businessId: business.id, conversationId: data.conversation_id }, 'Feedback entry created from voice agent');
              }
            }
          } catch (err) { log.warn({ err, conversationId: data.conversation_id }, 'Failed to parse FEEDBACK_DATA'); }
        }
      }

      return reply.code(200).send({ received: true });
    },
  );
}
