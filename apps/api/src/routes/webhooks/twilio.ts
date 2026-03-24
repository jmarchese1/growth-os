import type { FastifyInstance } from 'fastify';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';

const log = createLogger('api:webhook:twilio');

/** Check if the current time falls within business hours */
function isWithinBusinessHours(settings: Record<string, unknown>): boolean {
  const hours = settings['hours'] as Record<string, { open: string; close: string }> | undefined;
  if (!hours) return true; // No hours configured — assume always open

  const tz = (settings['timezone'] as string) ?? 'America/New_York';
  let now: Date;
  try {
    // Get current time in business timezone
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() ?? '';
    const hour = parts.find(p => p.type === 'hour')?.value ?? '0';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '0';
    now = new Date(2000, 0, 1, parseInt(hour), parseInt(minute));

    const dayHours = hours[weekday];
    if (!dayHours) return false; // Day not in hours = closed

    const [openH, openM] = dayHours.open.split(':').map(Number);
    const [closeH, closeM] = dayHours.close.split(':').map(Number);
    const openTime = new Date(2000, 0, 1, openH, openM);
    const closeTime = new Date(2000, 0, 1, closeH, closeM);

    return now >= openTime && now <= closeTime;
  } catch {
    return true; // On error, assume open
  }
}

/** Seconds of ringing per ring count (approx 6 seconds per ring) */
function ringsToTimeout(rings: number): number {
  return Math.max(5, rings * 6);
}

export async function twilioWebhookRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Inbound voice call — Twilio calls this, we return TwiML.
   *
   * Routing logic:
   * 1. If a forwarding number is configured, ring that first (configurable ring count).
   *    If no answer, fall through to the AI agent via the action URL.
   * 2. If after-hours and afterHoursMode is configured, pass context to the AI.
   * 3. Otherwise, connect directly to ElevenLabs AI agent.
   */
  app.post('/webhooks/twilio/voice', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const toNumber = body['To'];

    log.info({ from: body['From'], to: toNumber }, 'Inbound call received');

    if (!toNumber) {
      return reply.code(400).send({ error: 'Missing To number' });
    }

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

    const settings = (business.settings as Record<string, unknown>) ?? {};
    const forwardingNumber = settings['voiceForwardingNumber'] as string | undefined;
    const ringCount = (settings['voiceRingCount'] as number) ?? 4;
    const callMode = (settings['voiceCallMode'] as string) ?? 'ai_only'; // 'ai_only' | 'forward_first' | 'after_hours_only'
    const afterHoursMode = (settings['voiceAfterHoursMode'] as string) ?? 'take_messages'; // 'take_messages' | 'full_service' | 'closed_message'

    // Determine if we're in business hours
    const duringHours = isWithinBusinessHours(settings);
    const isAfterHours = !duringHours;

    // After-hours: closed message mode — just play a message and hang up
    if (isAfterHours && afterHoursMode === 'closed_message') {
      const closedMsg = (settings['voiceClosedMessage'] as string) ??
        `Thank you for calling ${business.name}. We are currently closed. Please call back during our regular business hours.`;
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(closedMsg)}</Say>
  <Hangup/>
</Response>`;
      log.info({ businessId: business.id, mode: 'closed_message' }, 'After-hours: playing closed message');
      return reply.header('Content-Type', 'text/xml').send(twiml);
    }

    // Build the AI connection URL
    const apiBaseUrl = process.env['API_BASE_URL'] ?? `https://${request.hostname}`;
    const aiActionUrl = `${apiBaseUrl}/webhooks/twilio/voice/ai?businessId=${business.id}&afterHours=${isAfterHours ? '1' : '0'}`;

    // Forward-first mode: ring the business phone, fall through to AI if no answer
    if (callMode === 'forward_first' && forwardingNumber && duringHours) {
      const timeout = ringsToTimeout(ringCount);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${timeout}" action="${escapeXml(aiActionUrl)}">
    <Number>${escapeXml(forwardingNumber)}</Number>
  </Dial>
</Response>`;
      log.info({ businessId: business.id, forwardTo: forwardingNumber, timeout, mode: 'forward_first' }, 'Forwarding call, AI as backup');
      return reply.header('Content-Type', 'text/xml').send(twiml);
    }

    // After-hours-only mode: during hours → forward to human, after hours → AI
    if (callMode === 'after_hours_only' && forwardingNumber && duringHours) {
      const timeout = ringsToTimeout(ringCount);
      // During hours: just ring the business, no AI fallback
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${timeout}">
    <Number>${escapeXml(forwardingNumber)}</Number>
  </Dial>
  <Say>We're sorry, no one is available to take your call right now. Please try again later.</Say>
  <Hangup/>
</Response>`;
      log.info({ businessId: business.id, mode: 'after_hours_only', duringHours: true }, 'During hours: forwarding to human only');
      return reply.header('Content-Type', 'text/xml').send(twiml);
    }

    // Default: connect directly to AI agent
    return reply.header('Content-Type', 'text/xml').send(
      buildAiTwiml(business.id, business.name, business.elevenLabsAgentId, isAfterHours)
    );
  });

  /**
   * AI fallback action — called by Twilio when <Dial> times out or fails.
   * Connects the caller to the ElevenLabs AI agent.
   */
  app.post('/webhooks/twilio/voice/ai', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const query = request.query as Record<string, string>;
    const businessId = query['businessId'];
    const isAfterHours = query['afterHours'] === '1';
    const dialStatus = body['DialCallStatus']; // completed, no-answer, busy, failed, canceled

    log.info({ businessId, dialStatus, isAfterHours }, 'Forwarding timed out, connecting to AI agent');

    if (!businessId) {
      return reply.header('Content-Type', 'text/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, something went wrong.</Say><Hangup/></Response>`
      );
    }

    // If the human answered and completed the call, don't connect to AI
    if (dialStatus === 'completed') {
      return reply.header('Content-Type', 'text/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`
      );
    }

    const business = await db.business.findUnique({ where: { id: businessId } });
    if (!business?.elevenLabsAgentId) {
      return reply.header('Content-Type', 'text/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, our AI assistant is not available.</Say><Hangup/></Response>`
      );
    }

    return reply.header('Content-Type', 'text/xml').send(
      buildAiTwiml(business.id, business.name, business.elevenLabsAgentId, isAfterHours)
    );
  });

  // Status callback for call tracking
  app.post('/webhooks/twilio/voice/status', async (request, reply) => {
    const body = request.body as Record<string, string>;
    log.info({ callSid: body['CallSid'], status: body['CallStatus'] }, 'Call status update');
    return reply.code(200).send({ received: true });
  });
}

function buildAiTwiml(businessId: string, businessName: string, agentId: string, afterHours: boolean): string {
  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="business_id" value="${businessId}"/>
      <Parameter name="business_name" value="${businessName}"/>
      <Parameter name="after_hours" value="${afterHours ? 'true' : 'false'}"/>
    </Stream>
  </Connect>
</Response>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
