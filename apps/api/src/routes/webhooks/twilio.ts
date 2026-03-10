import type { FastifyInstance } from 'fastify';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';

const log = createLogger('api:webhook:twilio');

export async function twilioWebhookRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Inbound voice call — Twilio calls this, we return TwiML to connect to ElevenLabs.
   * The ElevenLabs WebSocket URL is constructed from the agent ID stored on the Business.
   */
  app.post('/webhooks/twilio/voice', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const toNumber = body['To'];

    log.info({ from: body['From'], to: toNumber }, 'Inbound call received');

    if (!toNumber) {
      return reply.code(400).send({ error: 'Missing To number' });
    }

    // Find business by Twilio phone number
    const business = await db.business.findFirst({
      where: { twilioPhoneNumber: toNumber },
    });

    if (!business?.elevenLabsAgentId) {
      log.warn({ toNumber }, 'No business/agent found for this phone number');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. We are unable to take your call right now. Please try again later.</Say>
  <Hangup/>
</Response>`;
      return reply.header('Content-Type', 'text/xml').send(twiml);
    }

    // Connect to ElevenLabs WebSocket for conversational AI
    const elevenLabsWsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${business.elevenLabsAgentId}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${elevenLabsWsUrl}">
      <Parameter name="business_id" value="${business.id}"/>
      <Parameter name="business_name" value="${business.name}"/>
    </Stream>
  </Connect>
</Response>`;

    log.info({ businessId: business.id, agentId: business.elevenLabsAgentId }, 'Routing call to ElevenLabs');
    return reply.header('Content-Type', 'text/xml').send(twiml);
  });

  // Status callback for call tracking
  app.post('/webhooks/twilio/voice/status', async (request, reply) => {
    const body = request.body as Record<string, string>;
    log.info({ callSid: body['CallSid'], status: body['CallStatus'] }, 'Call status update');
    return reply.code(200).send({ received: true });
  });
}
