import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';


const log = createLogger('api:feedback');

export async function feedbackRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /feedback
   */
  app.get<{ Querystring: { businessId: string; rating?: string } }>(
    '/feedback',
    async (request, reply) => {
      const { businessId, rating } = request.query;
      if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

      const where: Record<string, unknown> = { businessId };
      if (rating) where['rating'] = rating;

      const entries = await db.feedbackEntry.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return { success: true, entries };
    },
  );

  /**
   * POST /feedback
   * Create feedback — from SMS follow-up, chatbot, or manual entry.
   */
  app.post('/feedback', async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

    const tool = await db.businessTool.findUnique({
      where: { businessId_type: { businessId: body.businessId, type: 'FEEDBACK_COLLECTION' } },
    });
    if (!tool?.enabled) return reply.code(400).send({ success: false, error: 'Feedback collection not enabled' });

    const entry = await db.feedbackEntry.create({
      data: {
        businessId: body.businessId,
        contactId: body.contactId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        triggerType: body.triggerType,
        triggerId: body.triggerId,
        rating: body.rating,
        comment: body.comment,
      },
    });

    log.info({ feedbackId: entry.id, rating: body.rating }, 'Feedback entry created');
    return reply.code(201).send({ success: true, entry });
  });

  /**
   * PATCH /feedback/:id/respond
   * Restaurant responds to feedback.
   */
  app.patch<{ Params: { id: string } }>(
    '/feedback/:id/respond',
    async (request, _reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = request.body as any;
      if (!body.responseText?.trim()) throw new Error('responseText is required');

      const existing = await db.feedbackEntry.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('FeedbackEntry', request.params.id);

      const entry = await db.feedbackEntry.update({
        where: { id: request.params.id },
        data: { responded: true, responseText: body.responseText.trim() },
      });

      log.info({ feedbackId: entry.id }, 'Feedback responded to');
      return { success: true, entry };
    },
  );

  /**
   * GET /feedback/stats/:businessId
   */
  app.get<{ Params: { businessId: string } }>(
    '/feedback/stats/:businessId',
    async (request, _reply) => {
      const { businessId } = request.params;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [total, byRating, unanswered] = await Promise.all([
        db.feedbackEntry.count({ where: { businessId, createdAt: { gte: thirtyDaysAgo } } }),
        db.feedbackEntry.groupBy({ by: ['rating'], where: { businessId, createdAt: { gte: thirtyDaysAgo }, rating: { not: null } }, _count: true }),
        db.feedbackEntry.count({ where: { businessId, responded: false, comment: { not: null } } }),
      ]);

      const ratingMap = Object.fromEntries(byRating.map(r => [r.rating!, r._count]));
      const totalRated = byRating.reduce((sum, r) => sum + r._count, 0);
      const ratingValues: Record<string, number> = { TERRIBLE: 1, POOR: 2, OKAY: 3, GOOD: 4, EXCELLENT: 5 };
      const avgRating = totalRated > 0
        ? byRating.reduce((sum, r) => sum + (ratingValues[r.rating!] ?? 0) * r._count, 0) / totalRated
        : 0;

      return {
        success: true,
        stats: { total, avgRating: Math.round(avgRating * 10) / 10, unanswered, byRating: ratingMap },
      };
    },
  );
}
