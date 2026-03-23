import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import type { CreateCateringInquiryRequest, UpdateCateringStatusRequest } from '@embedo/types';

const log = createLogger('api:catering');

export async function cateringRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /catering
   * List catering inquiries for a business.
   */
  app.get<{ Querystring: { businessId: string; status?: string } }>(
    '/catering',
    async (request, reply) => {
      const { businessId, status } = request.query;
      if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

      const where: Record<string, unknown> = { businessId };
      if (status) where['status'] = status;

      const inquiries = await db.cateringInquiry.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, inquiries };
    },
  );

  /**
   * GET /catering/:id
   */
  app.get<{ Params: { id: string } }>(
    '/catering/:id',
    async (request, _reply) => {
      const inquiry = await db.cateringInquiry.findUnique({
        where: { id: request.params.id },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
      });
      if (!inquiry) throw new NotFoundError('CateringInquiry', request.params.id);
      return { success: true, inquiry };
    },
  );

  /**
   * POST /catering
   * Create a new catering inquiry — from voice agent, chatbot, or manual.
   */
  app.post('/catering', async (request, reply) => {
    const body = request.body as Partial<CreateCateringInquiryRequest>;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.customerName?.trim()) return reply.code(400).send({ success: false, error: 'customerName is required' });
    if (!body.headcount || body.headcount < 1) return reply.code(400).send({ success: false, error: 'headcount must be at least 1' });

    const tool = await db.businessTool.findUnique({
      where: { businessId_type: { businessId: body.businessId, type: 'CATERING_REQUESTS' } },
    });
    if (!tool?.enabled) return reply.code(400).send({ success: false, error: 'Catering requests not enabled for this business' });

    // Create or find contact
    let contactId: string | undefined;
    if (body.customerEmail || body.customerPhone) {
      const firstName = body.customerName.trim().split(' ')[0];
      const lastName = body.customerName.trim().split(' ').slice(1).join(' ') || undefined;
      try {
        const contact = await db.contact.upsert({
          where: body.customerEmail
            ? { businessId_email: { businessId: body.businessId, email: body.customerEmail } }
            : { businessId_phone: { businessId: body.businessId, phone: body.customerPhone! } },
          create: {
            businessId: body.businessId,
            source: body.source === 'VOICE_AGENT' ? 'VOICE' : body.source === 'CHATBOT' ? 'CHATBOT' : 'MANUAL',
            firstName,
            ...(lastName ? { lastName } : {}),
            ...(body.customerEmail ? { email: body.customerEmail } : {}),
            ...(body.customerPhone ? { phone: body.customerPhone } : {}),
          },
          update: { firstName, ...(lastName ? { lastName } : {}) },
        });
        contactId = contact.id;
      } catch { /* ignore */ }
    }

    const inquiry = await db.cateringInquiry.create({
      data: {
        businessId: body.businessId,
        contactId,
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
        eventTime: body.eventTime,
        eventType: body.eventType,
        headcount: body.headcount,
        budget: body.budget,
        location: body.location,
        dietaryNotes: body.dietaryNotes,
        menuRequests: body.menuRequests,
        notes: body.notes,
        source: body.source ?? 'MANUAL',
        voiceCallLogId: body.voiceCallLogId,
        chatSessionId: body.chatSessionId,
      },
    });

    log.info({ inquiryId: inquiry.id, headcount: body.headcount }, 'Catering inquiry created');
    return reply.code(201).send({ success: true, inquiry });
  });

  /**
   * PATCH /catering/:id/status
   */
  app.patch<{ Params: { id: string } }>(
    '/catering/:id/status',
    async (request, _reply) => {
      const body = request.body as Partial<UpdateCateringStatusRequest>;
      if (!body.status) throw new Error('status is required');

      const existing = await db.cateringInquiry.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('CateringInquiry', request.params.id);

      const inquiry = await db.cateringInquiry.update({
        where: { id: request.params.id },
        data: {
          status: body.status,
          ...(body.quotedAmount !== undefined ? { quotedAmount: body.quotedAmount } : {}),
          ...(body.quoteNotes ? { quoteNotes: body.quoteNotes } : {}),
        },
      });

      log.info({ inquiryId: inquiry.id, status: body.status }, 'Catering inquiry status updated');
      return { success: true, inquiry };
    },
  );

  /**
   * DELETE /catering/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/catering/:id',
    async (request, _reply) => {
      const existing = await db.cateringInquiry.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('CateringInquiry', request.params.id);
      await db.cateringInquiry.delete({ where: { id: request.params.id } });
      return { success: true };
    },
  );

  /**
   * GET /catering/stats/:businessId
   */
  app.get<{ Params: { businessId: string } }>(
    '/catering/stats/:businessId',
    async (request, _reply) => {
      const { businessId } = request.params;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [total, active, confirmed, totalRevenue] = await Promise.all([
        db.cateringInquiry.count({ where: { businessId, createdAt: { gte: thirtyDaysAgo } } }),
        db.cateringInquiry.count({ where: { businessId, status: { in: ['NEW', 'CONTACTED', 'QUOTED'] } } }),
        db.cateringInquiry.count({ where: { businessId, status: 'CONFIRMED', createdAt: { gte: thirtyDaysAgo } } }),
        db.cateringInquiry.aggregate({ where: { businessId, status: { in: ['CONFIRMED', 'COMPLETED'] } }, _sum: { quotedAmount: true } }),
      ]);

      return {
        success: true,
        stats: { total, active, confirmed, totalRevenue: totalRevenue._sum.quotedAmount ?? 0 },
      };
    },
  );
}
