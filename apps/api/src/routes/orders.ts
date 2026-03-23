import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';


const log = createLogger('api:orders');

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /orders
   * List orders for a business, with optional status filter.
   */
  app.get<{ Querystring: { businessId: string; status?: string; limit?: string; offset?: string } }>(
    '/orders',
    async (request, reply) => {
      const { businessId, status, limit, offset } = request.query;
      if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

      const where: Record<string, unknown> = { businessId };
      if (status) where['status'] = status;

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          include: { items: true, contact: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit ? parseInt(limit) : 50,
          skip: offset ? parseInt(offset) : 0,
        }),
        db.order.count({ where }),
      ]);

      return { success: true, orders, total };
    },
  );

  /**
   * GET /orders/:id
   * Get a single order with items.
   */
  app.get<{ Params: { id: string } }>(
    '/orders/:id',
    async (request, _reply) => {
      const order = await db.order.findUnique({
        where: { id: request.params.id },
        include: { items: true, contact: { select: { id: true, firstName: true, lastName: true } } },
      });
      if (!order) throw new NotFoundError('Order', request.params.id);
      return { success: true, order };
    },
  );

  /**
   * POST /orders
   * Create a new takeout order — used by voice agent, chatbot, website, or manual entry.
   */
  app.post('/orders', async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.customerName?.trim()) return reply.code(400).send({ success: false, error: 'customerName is required' });
    if (!body.items || body.items.length === 0) return reply.code(400).send({ success: false, error: 'At least one item is required' });

    const business = await db.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new NotFoundError('Business', body.businessId);

    // Check if takeout orders tool is enabled
    const tool = await db.businessTool.findUnique({
      where: { businessId_type: { businessId: body.businessId, type: 'TAKEOUT_ORDERS' } },
    });
    if (!tool?.enabled) {
      return reply.code(400).send({ success: false, error: 'Takeout orders are not enabled for this business' });
    }

    const toolConfig = (tool.config as Record<string, unknown>) ?? {};
    const taxRate = (toolConfig['taxRate'] as number) ?? 0;

    // Calculate pricing
    const subtotal = body.items.reduce((sum: number, item: { price: number; quantity: number }) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Create or find Contact from customer info
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
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
            ...(body.customerEmail ? { email: body.customerEmail } : {}),
            ...(body.customerPhone ? { phone: body.customerPhone } : {}),
          },
          update: {
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
          },
        });
        contactId = contact.id;
      } catch {
        // ignore unique constraint conflict
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = await db.order.create({
      data: {
        businessId: body.businessId,
        ...(contactId !== undefined ? { contactId } : {}),
        customerName: body.customerName.trim(),
        ...(body.customerPhone != null ? { customerPhone: body.customerPhone } : {}),
        ...(body.customerEmail != null ? { customerEmail: body.customerEmail } : {}),
        ...(body.specialNotes != null ? { specialNotes: body.specialNotes } : {}),
        ...(body.pickupTime != null ? { pickupTime: body.pickupTime } : {}),
        subtotal,
        tax,
        total,
        source: body.source ?? 'MANUAL',
        ...(body.voiceCallLogId != null ? { voiceCallLogId: body.voiceCallLogId } : {}),
        ...(body.chatSessionId != null ? { chatSessionId: body.chatSessionId } : {}),
        items: {
          create: body.items.map((item: { name: string; quantity: number; price: number; notes?: string }) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            ...(item.notes != null ? { notes: item.notes } : {}),
          })),
        },
      } as any,
      include: { items: true },
    });

    log.info({ orderId: order.id, businessId: body.businessId, source: body.source, total }, 'Order created');

    return reply.code(201).send({ success: true, order });
  });

  /**
   * PATCH /orders/:id/status
   * Update order status (confirm, prepare, ready, pickup, cancel).
   */
  app.patch<{ Params: { id: string } }>(
    '/orders/:id/status',
    async (request, _reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = request.body as any;
      if (!body.status) throw new Error('status is required');

      const existing = await db.order.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('Order', request.params.id);

      const order = await db.order.update({
        where: { id: request.params.id },
        data: {
          status: body.status,
          ...(body.estimatedReady ? { estimatedReady: body.estimatedReady } : {}),
        },
        include: { items: true },
      });

      log.info({ orderId: order.id, status: body.status }, 'Order status updated');

      return { success: true, order };
    },
  );

  /**
   * DELETE /orders/:id
   * Delete an order (admin only, typically for test/cleanup).
   */
  app.delete<{ Params: { id: string } }>(
    '/orders/:id',
    async (request, _reply) => {
      const existing = await db.order.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('Order', request.params.id);

      await db.order.delete({ where: { id: request.params.id } });

      return { success: true };
    },
  );

  /**
   * GET /orders/stats/:businessId
   * Aggregated order stats for dashboard KPI cards.
   */
  app.get<{ Params: { businessId: string }; Querystring: { days?: string } }>(
    '/orders/stats/:businessId',
    async (request, _reply) => {
      const { businessId } = request.params;
      const days = parseInt(request.query.days ?? '30');
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [totalOrders, activeOrders, revenue, byStatus] = await Promise.all([
        db.order.count({ where: { businessId, createdAt: { gte: since } } }),
        db.order.count({ where: { businessId, status: { in: ['RECEIVED', 'CONFIRMED', 'PREPARING'] } } }),
        db.order.aggregate({ where: { businessId, createdAt: { gte: since }, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
        db.order.groupBy({ by: ['status'], where: { businessId, createdAt: { gte: since } }, _count: true }),
      ]);

      return {
        success: true,
        stats: {
          totalOrders,
          activeOrders,
          revenue: revenue._sum.total ?? 0,
          byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
        },
      };
    },
  );
}
