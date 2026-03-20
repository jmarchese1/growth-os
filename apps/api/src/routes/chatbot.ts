import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:chatbot');

const CHATBOT_URL = process.env['CHATBOT_API_URL'] ?? process.env['CHATBOT_URL'] ?? 'http://localhost:3003';

export async function chatbotRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /chatbot/chat
   * Proxies chat messages to the chatbot-agent service.
   */
  app.post('/chatbot/chat', async (request, reply) => {
    const body = request.body as { businessId?: string };

    if (!body.businessId) {
      return reply.code(400).send({ success: false, error: 'businessId is required' });
    }

    try {
      const res = await fetch(`${CHATBOT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });
      const data = await res.json();
      return reply.code(res.status).send(data);
    } catch (err) {
      log.error({ err }, 'Failed to reach chatbot-agent service');
      return reply.code(502).send({ success: false, error: 'Chatbot service unavailable' });
    }
  });

  /**
   * GET /chatbot/status/:businessId
   * Returns chatbot deployment status for a business.
   */
  app.get<{ Params: { businessId: string } }>(
    '/chatbot/status/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const business = await db.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          name: true,
          settings: true,
        },
      });

      if (!business) throw new NotFoundError('Business', businessId);

      const settings = (business.settings as Record<string, unknown>) ?? {};

      return {
        businessId: business.id,
        businessName: business.name,
        isEnabled: !!settings['chatbotEnabled'],
        settings: {
          chatbotPersona: settings['chatbotPersona'] ?? null,
          welcomeMessage: settings['welcomeMessage'] ?? null,
          primaryColor: settings['primaryColor'] ?? null,
          hours: settings['hours'] ?? null,
          cuisine: settings['cuisine'] ?? null,
        },
      };
    },
  );

  /**
   * POST /chatbot/enable
   * Enables the chatbot for a business — sets chatbotEnabled flag in settings.
   * Creates a minimal Business record if one doesn't exist yet (e.g. client app user).
   */
  app.post('/chatbot/enable', async (request, reply) => {
    const body = request.body as { businessId: string };

    if (!body.businessId) {
      return reply.code(400).send({ success: false, error: 'businessId is required' });
    }

    let business = await db.business.findUnique({ where: { id: body.businessId } });

    if (!business) {
      // Auto-create a minimal Business record so client-app users can enable features
      const slug = `biz-${body.businessId.slice(0, 8)}-${Date.now()}`;
      business = await db.business.create({
        data: {
          id: body.businessId,
          name: 'My Business',
          slug,
          type: 'RESTAURANT',
          settings: { chatbotEnabled: true },
        },
      });
      log.info({ businessId: body.businessId }, 'Auto-created business and enabled chatbot');
      return { success: true, businessId: business.id };
    }

    const currentSettings = (business.settings as Record<string, unknown>) ?? {};
    const newSettings = { ...currentSettings, chatbotEnabled: true };

    await db.business.update({
      where: { id: body.businessId },
      data: { settings: newSettings },
    });

    log.info({ businessId: body.businessId }, 'Chatbot enabled');
    return { success: true, businessId: body.businessId };
  });

  /**
   * GET /chatbot/sessions/:businessId
   * Returns chat session history for a business.
   */
  app.get<{ Params: { businessId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/chatbot/sessions/:businessId',
    async (request) => {
      const { businessId } = request.params;
      const page = parseInt(request.query.page ?? '1');
      const pageSize = parseInt(request.query.pageSize ?? '20');

      const [items, total] = await Promise.all([
        db.chatSession.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          },
        }),
        db.chatSession.count({ where: { businessId } }),
      ]);

      return { items, total, page, pageSize };
    },
  );

  /**
   * GET /chatbot/stats/:businessId
   * Returns aggregated chatbot stats for the dashboard.
   */
  app.get<{ Params: { businessId: string } }>(
    '/chatbot/stats/:businessId',
    async (request) => {
      const { businessId } = request.params;

      const [totalSessions, sessions] = await Promise.all([
        db.chatSession.count({ where: { businessId } }),
        db.chatSession.findMany({
          where: { businessId },
          select: {
            channel: true,
            messages: true,
            leadCaptured: true,
            appointmentMade: true,
          },
        }),
      ]);

      const leadsCapture = sessions.filter((s) => s.leadCaptured).length;
      const appointmentsMade = sessions.filter((s) => s.appointmentMade).length;
      const totalMessages = sessions.reduce((sum, s) => {
        const msgs = s.messages as unknown[];
        return sum + (Array.isArray(msgs) ? msgs.length : 0);
      }, 0);

      const channelBreakdown = {
        WEB: sessions.filter((s) => s.channel === 'WEB').length,
        INSTAGRAM: sessions.filter((s) => s.channel === 'INSTAGRAM').length,
        FACEBOOK: sessions.filter((s) => s.channel === 'FACEBOOK').length,
      };

      return {
        totalSessions,
        leadsCapture,
        appointmentsMade,
        totalMessages,
        channelBreakdown,
      };
    },
  );

  /**
   * GET /chatbot/widget/snippet/:businessId
   * Proxies widget snippet request to chatbot-agent service.
   */
  app.get<{ Params: { businessId: string } }>(
    '/chatbot/widget/snippet/:businessId',
    async (request, reply) => {
      const { businessId } = request.params;

      try {
        const res = await fetch(`${CHATBOT_URL}/widget/snippet/${businessId}`);
        const text = await res.text();
        return reply.code(res.status).header('Content-Type', 'text/plain').send(text);
      } catch (err) {
        log.error({ err }, 'Failed to reach chatbot-agent service for snippet');
        return reply.code(502).send({ success: false, error: 'Chatbot service unavailable' });
      }
    },
  );

  /**
   * PATCH /chatbot/settings/:businessId
   * Update chatbot configuration (persona, welcome message, colors).
   */
  app.patch<{ Params: { businessId: string } }>(
    '/chatbot/settings/:businessId',
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

      log.info({ businessId }, 'Chatbot settings updated');
      return { success: true, settings: newSettings };
    },
  );
}
