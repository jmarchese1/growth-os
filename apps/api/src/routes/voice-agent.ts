import type { FastifyInstance } from 'fastify';
import { ElevenLabsClient } from 'elevenlabs';
import twilio from 'twilio';
import { db } from '@embedo/db';
import { createLogger, NotFoundError, ExternalApiError } from '@embedo/utils';

const log = createLogger('api:voice-agent');


function buildSystemPrompt(business: { name: string; phone: string | null; address: unknown; settings: unknown }): string {
  const settings = (business.settings as Record<string, unknown>) ?? {};
  const hours = settings['hours'] as Record<string, { open: string; close: string }> | undefined;
  const cuisine = settings['cuisine'] as string | undefined;
  const maxPartySize = settings['maxPartySize'] as number | undefined;
  const persona = settings['chatbotPersona'] as string | undefined;
  const hoursText = hours
    ? Object.entries(hours).map(([day, h]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open} – ${h.close}`).join(', ')
    : 'Please ask the owner for current hours';
  const addr = business.address && typeof business.address === 'object'
    ? Object.values(business.address as Record<string, string>).filter(Boolean).join(', ')
    : 'See our website for address';
  return `You are the AI receptionist for ${business.name}${cuisine ? `, a ${cuisine} restaurant` : ''}.
Your personality is ${persona ?? 'friendly, warm, and professional'}.
BUSINESS INFORMATION:
- Name: ${business.name}
- Phone: ${business.phone ?? 'Not available'}
- Address: ${addr}
- Hours: ${hoursText}
${cuisine ? `- Cuisine: ${cuisine}` : ''}
${maxPartySize ? `- Maximum party size: ${maxPartySize}` : ''}
YOUR CAPABILITIES:
1. Answer questions about the restaurant (hours, location, menu, specials)
2. Take reservation requests — collect: name, party size, date/time, phone number
3. Handle inquiries warmly and professionally
4. Transfer to a human if requested or unable to help
IMPORTANT: Keep responses concise — this is a phone call. Never make up information you don't know.
When you collect reservation details output: RESERVATION_DATA: {"name":"...","partySize":...,"date":"...","time":"...","phone":"..."}`;
}

export async function voiceAgentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /voice-agent/status/:businessId
   * Returns provisioning status: ElevenLabs agent ID, Twilio number, and config.
   */
  app.get<{ Params: { businessId: string } }>(
    '/voice-agent/status/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          phone: true,
          elevenLabsAgentId: true,
          twilioPhoneNumber: true,
          settings: true,
        },
      });

      if (!business) throw new NotFoundError('Business', businessId);

      const settings = (business.settings as Record<string, unknown>) ?? {};

      return {
        businessId: business.id,
        businessName: business.name,
        agentId: business.elevenLabsAgentId,
        twilioNumber: business.twilioPhoneNumber,
        isProvisioned: !!(business.elevenLabsAgentId && business.twilioPhoneNumber),
        hasAgent: !!business.elevenLabsAgentId,
        hasNumber: !!business.twilioPhoneNumber,
        settings: {
          hours: settings['hours'] ?? null,
          cuisine: settings['cuisine'] ?? null,
          maxPartySize: settings['maxPartySize'] ?? null,
          chatbotPersona: settings['chatbotPersona'] ?? null,
        },
      };
    },
  );

  /**
   * POST /voice-agent/provision
   * Creates ElevenLabs agent + provisions Twilio phone number directly.
   */
  app.post('/voice-agent/provision', async (request, reply) => {
    const body = request.body as { businessId: string; areaCode?: string };
    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

    const business = await db.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new NotFoundError('Business', body.businessId);

    const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
    const twilioSid = process.env['TWILIO_ACCOUNT_SID'];
    const twilioToken = process.env['TWILIO_AUTH_TOKEN'];

    if (!elevenLabsKey) return reply.code(500).send({ success: false, error: 'ELEVENLABS_API_KEY not configured' });
    if (!twilioSid || !twilioToken) return reply.code(500).send({ success: false, error: 'Twilio credentials not configured' });

    log.info({ businessId: body.businessId }, 'Starting voice agent provisioning');

    try {
      // Step 1: Create ElevenLabs agent (idempotent)
      let agentId = business.elevenLabsAgentId;
      if (!agentId) {
        const el = new ElevenLabsClient({ apiKey: elevenLabsKey });
        const agent = await el.conversationalAi.createAgent({
          name: `${business.name} — AI Receptionist`,
          conversation_config: {
            agent: {
              prompt: { prompt: buildSystemPrompt(business) },
              first_message: `Thank you for calling ${business.name}! I'm your AI assistant. How can I help you today?`,
              language: 'en',
            },
            tts: { voice_id: 'EXAVITQu4vr4xnSDxMaL' }, // Sarah
          },
        });
        agentId = agent.agent_id;
        await db.business.update({ where: { id: business.id }, data: { elevenLabsAgentId: agentId } });
        await db.onboardingLog.create({ data: { businessId: business.id, step: 'elevenlabs_agent_created', status: 'success', message: `Agent: ${agentId}`, data: { agentId } as object } });
        log.info({ businessId: business.id, agentId }, 'ElevenLabs agent created');
      }

      // Step 2: Provision Twilio number (idempotent)
      let phoneNumber = business.twilioPhoneNumber;
      if (!phoneNumber) {
        const tc = twilio(twilioSid, twilioToken);
        const webhookUrl = `${process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app'}/webhooks/twilio/voice`;
        const available = await tc.availablePhoneNumbers('US').local.list({
          ...(body.areaCode ? { areaCode: parseInt(body.areaCode) } : {}),
          voiceEnabled: true,
          limit: 5,
        });
        if (available.length === 0) throw new ExternalApiError('Twilio', 'No available phone numbers', null);
        const purchased = await tc.incomingPhoneNumbers.create({
          phoneNumber: available[0]!.phoneNumber,
          voiceUrl: webhookUrl,
          voiceMethod: 'POST',
          friendlyName: `${business.name} — AI Receptionist`,
        });
        phoneNumber = purchased.phoneNumber;
        await db.business.update({ where: { id: business.id }, data: { twilioPhoneNumber: phoneNumber } });
        await db.onboardingLog.create({ data: { businessId: business.id, step: 'twilio_number_provisioned', status: 'success', message: `Number: ${phoneNumber}`, data: { phoneNumber } as object } });
        log.info({ businessId: business.id, phoneNumber }, 'Twilio number provisioned');
      }

      return { success: true, agentId, phoneNumber };
    } catch (err) {
      log.error({ err, businessId: body.businessId }, 'Provisioning failed');
      await db.onboardingLog.create({ data: { businessId: body.businessId, step: 'provision_failed', status: 'error', message: String(err) } }).catch(() => {});
      return reply.code(500).send({ success: false, error: String(err) });
    }
  });

  /**
   * GET /voice-agent/calls/:businessId
   * Returns call log history for a business.
   */
  app.get<{ Params: { businessId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/voice-agent/calls/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const page = parseInt(request.query.page ?? '1');
      const pageSize = parseInt(request.query.pageSize ?? '20');

      const [items, total] = await Promise.all([
        db.voiceCallLog.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        }),
        db.voiceCallLog.count({ where: { businessId } }),
      ]);

      return { items, total, page, pageSize };
    },
  );

  /**
   * GET /voice-agent/stats/:businessId
   * Returns aggregated call stats for the dashboard.
   */
  app.get<{ Params: { businessId: string } }>(
    '/voice-agent/stats/:businessId',
    async (request) => {
      const { businessId } = request.params;

      const [totalCalls, calls] = await Promise.all([
        db.voiceCallLog.count({ where: { businessId } }),
        db.voiceCallLog.findMany({
          where: { businessId },
          select: {
            duration: true,
            sentiment: true,
            intent: true,
            leadCaptured: true,
            reservationMade: true,
          },
        }),
      ]);

      const totalDuration = calls.reduce((sum, c) => sum + (c.duration ?? 0), 0);
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const leadsCapture = calls.filter((c) => c.leadCaptured).length;
      const positiveCount = calls.filter((c) => c.sentiment === 'POSITIVE').length;
      const positiveRate = totalCalls > 0 ? Math.round((positiveCount / totalCalls) * 100) : 0;

      const intentBreakdown = {
        RESERVATION: calls.filter((c) => c.intent === 'RESERVATION').length,
        INQUIRY: calls.filter((c) => c.intent === 'INQUIRY').length,
        COMPLAINT: calls.filter((c) => c.intent === 'COMPLAINT').length,
        GENERAL: calls.filter((c) => c.intent === 'GENERAL').length,
        UNKNOWN: calls.filter((c) => c.intent === 'UNKNOWN').length,
      };

      const sentimentBreakdown = {
        POSITIVE: positiveCount,
        NEUTRAL: calls.filter((c) => c.sentiment === 'NEUTRAL').length,
        NEGATIVE: calls.filter((c) => c.sentiment === 'NEGATIVE').length,
      };

      return {
        totalCalls,
        avgDuration,
        leadsCapture,
        positiveRate,
        intentBreakdown,
        sentimentBreakdown,
      };
    },
  );

  /**
   * PATCH /voice-agent/settings/:businessId
   * Update voice agent configuration (hours, cuisine, persona, maxPartySize).
   */
  app.patch<{ Params: { businessId: string } }>(
    '/voice-agent/settings/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const updates = request.body as Record<string, unknown>;

      const business = await db.business.findUnique({ where: { id: businessId } });
      if (!business) throw new NotFoundError('Business', businessId);

      const currentSettings = (business.settings as Record<string, unknown>) ?? {};
      const newSettings = { ...currentSettings, ...updates };

      await db.business.update({
        where: { id: businessId },
        data: { settings: newSettings as object },
      });

      // If agent exists, update the ElevenLabs prompt directly
      if (business.elevenLabsAgentId) {
        const elevenLabsKey = process.env['ELEVENLABS_API_KEY'];
        if (elevenLabsKey) {
          try {
            const updatedBusiness = { ...business, settings: newSettings as object };
            const el = new ElevenLabsClient({ apiKey: elevenLabsKey });
            await el.conversationalAi.updateAgent(business.elevenLabsAgentId, {
              conversation_config: { agent: { prompt: { prompt: buildSystemPrompt(updatedBusiness) } } },
            });
          } catch (err) {
            log.warn({ err, businessId }, 'Failed to update ElevenLabs agent prompt');
          }
        }
      }

      log.info({ businessId }, 'Voice agent settings updated');
      return { success: true, settings: newSettings };
    },
  );
}
