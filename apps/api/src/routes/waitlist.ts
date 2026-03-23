import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import type { CreateWaitlistEntryRequest, UpdateWaitlistEntryRequest } from '@embedo/types';

const log = createLogger('api:waitlist');

export async function waitlistRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /waitlist
   * List current waitlist for a business.
   */
  app.get<{ Querystring: { businessId: string; status?: string } }>(
    '/waitlist',
    async (request, reply) => {
      const { businessId, status } = request.query;
      if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

      const where: Record<string, unknown> = { businessId };
      if (status) where['status'] = status;

      const entries = await db.waitlistEntry.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { position: 'asc' },
      });

      return { success: true, entries };
    },
  );

  /**
   * POST /waitlist
   * Add someone to the waitlist.
   */
  app.post('/waitlist', async (request, reply) => {
    const body = request.body as Partial<CreateWaitlistEntryRequest>;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.guestName?.trim()) return reply.code(400).send({ success: false, error: 'guestName is required' });
    if (!body.partySize || body.partySize < 1) return reply.code(400).send({ success: false, error: 'partySize must be at least 1' });

    // Check tool is enabled
    const tool = await db.businessTool.findUnique({
      where: { businessId_type: { businessId: body.businessId, type: 'WAITLIST' } },
    });
    if (!tool?.enabled) return reply.code(400).send({ success: false, error: 'Waitlist is not enabled for this business' });

    const toolConfig = (tool.config as Record<string, unknown>) ?? {};
    const avgWaitPerParty = (toolConfig['avgWaitMinutes'] as number) ?? 15;

    // Get current queue size to determine position
    const currentWaiting = await db.waitlistEntry.count({
      where: { businessId: body.businessId, status: 'WAITING' },
    });
    const position = currentWaiting + 1;
    const estimatedWait = position * avgWaitPerParty;

    // Create or find contact
    let contactId: string | undefined;
    if (body.guestPhone) {
      try {
        const firstName = body.guestName.trim().split(' ')[0];
        const lastName = body.guestName.trim().split(' ').slice(1).join(' ') || undefined;
        const contact = await db.contact.upsert({
          where: { businessId_phone: { businessId: body.businessId, phone: body.guestPhone } },
          create: {
            businessId: body.businessId,
            source: body.source === 'VOICE_AGENT' ? 'VOICE' : body.source === 'CHATBOT' ? 'CHATBOT' : 'MANUAL',
            firstName,
            ...(lastName ? { lastName } : {}),
            phone: body.guestPhone,
          },
          update: { firstName, ...(lastName ? { lastName } : {}) },
        });
        contactId = contact.id;
      } catch { /* ignore */ }
    }

    const entry = await db.waitlistEntry.create({
      data: {
        businessId: body.businessId,
        contactId,
        guestName: body.guestName.trim(),
        guestPhone: body.guestPhone,
        partySize: body.partySize,
        position,
        estimatedWait,
        notes: body.notes,
        source: body.source ?? 'MANUAL',
      },
    });

    log.info({ entryId: entry.id, position, estimatedWait }, 'Waitlist entry created');

    return reply.code(201).send({ success: true, entry: { ...entry, estimatedWait } });
  });

  /**
   * PATCH /waitlist/:id/status
   * Update waitlist entry status (notify, seat, no-show, cancel).
   */
  app.patch<{ Params: { id: string } }>(
    '/waitlist/:id/status',
    async (request, _reply) => {
      const body = request.body as Partial<UpdateWaitlistEntryRequest>;
      if (!body.status) throw new Error('status is required');

      const existing = await db.waitlistEntry.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('WaitlistEntry', request.params.id);

      const now = new Date();
      const entry = await db.waitlistEntry.update({
        where: { id: request.params.id },
        data: {
          status: body.status,
          ...(body.status === 'NOTIFIED' ? { notifiedAt: now } : {}),
          ...(body.status === 'SEATED' ? { seatedAt: now } : {}),
          ...(body.status === 'CANCELLED' || body.status === 'NO_SHOW' ? { cancelledAt: now } : {}),
        },
      });

      // TODO: Send SMS notification when status is NOTIFIED
      // if (body.status === 'NOTIFIED' && existing.guestPhone) {
      //   await smsQueue().add(...);
      // }

      log.info({ entryId: entry.id, status: body.status }, 'Waitlist entry updated');
      return { success: true, entry };
    },
  );

  /**
   * DELETE /waitlist/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/waitlist/:id',
    async (request, _reply) => {
      const existing = await db.waitlistEntry.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('WaitlistEntry', request.params.id);
      await db.waitlistEntry.delete({ where: { id: request.params.id } });
      return { success: true };
    },
  );

  /**
   * GET /waitlist/stats/:businessId
   */
  app.get<{ Params: { businessId: string } }>(
    '/waitlist/stats/:businessId',
    async (request, _reply) => {
      const { businessId } = request.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [currentWaiting, todayTotal, todaySeated, todayNoShow] = await Promise.all([
        db.waitlistEntry.count({ where: { businessId, status: 'WAITING' } }),
        db.waitlistEntry.count({ where: { businessId, createdAt: { gte: today } } }),
        db.waitlistEntry.count({ where: { businessId, status: 'SEATED', createdAt: { gte: today } } }),
        db.waitlistEntry.count({ where: { businessId, status: 'NO_SHOW', createdAt: { gte: today } } }),
      ]);

      return {
        success: true,
        stats: { currentWaiting, todayTotal, todaySeated, todayNoShow },
      };
    },
  );
}
