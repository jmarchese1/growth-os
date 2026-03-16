import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:voice-agent');

const VOICE_AGENT_URL = process.env['VOICE_AGENT_URL'] ?? 'http://localhost:3002';

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
   * Triggers ElevenLabs agent creation + Twilio number provisioning.
   * Proxies to the voice-agent service.
   */
  app.post('/voice-agent/provision', async (request, reply) => {
    const body = request.body as { businessId: string; areaCode?: string };

    if (!body.businessId) {
      return reply.code(400).send({ success: false, error: 'businessId is required' });
    }

    const business = await db.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new NotFoundError('Business', body.businessId);

    log.info({ businessId: body.businessId }, 'Provisioning voice agent');

    try {
      const res = await fetch(`${VOICE_AGENT_URL}/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return reply.code(res.status).send(data);
    } catch (err) {
      log.error({ err }, 'Failed to reach voice-agent service');
      return reply.code(502).send({ success: false, error: 'Voice agent service unavailable' });
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

      // If agent exists, update the prompt via voice-agent service
      if (business.elevenLabsAgentId) {
        try {
          await fetch(`${VOICE_AGENT_URL}/update-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId }),
          });
        } catch (err) {
          log.warn({ err, businessId }, 'Failed to update agent prompt — voice-agent service may be down');
        }
      }

      log.info({ businessId }, 'Voice agent settings updated');
      return { success: true, settings: newSettings };
    },
  );
}
