import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';


const log = createLogger('api:tables');

export async function tableRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /tables
   * List all tables for a business with current status.
   */
  app.get<{ Querystring: { businessId: string } }>(
    '/tables',
    async (request, reply) => {
      const { businessId } = request.query;
      if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

      const tables = await db.tableSession.findMany({
        where: { businessId },
        orderBy: { tableNumber: 'asc' },
      });

      return { success: true, tables };
    },
  );

  /**
   * POST /tables
   * Create/register a table for the restaurant.
   */
  app.post('/tables', async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = request.body as any;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.tableNumber?.trim()) return reply.code(400).send({ success: false, error: 'tableNumber is required' });

    const tool = await db.businessTool.findUnique({
      where: { businessId_type: { businessId: body.businessId, type: 'TABLE_TURNOVER' } },
    });
    if (!tool?.enabled) return reply.code(400).send({ success: false, error: 'Table turnover tracking not enabled' });

    const table = await db.tableSession.create({
      data: {
        businessId: body.businessId,
        tableNumber: body.tableNumber.trim(),
        tableCapacity: body.tableCapacity,
      },
    });

    log.info({ tableId: table.id, tableNumber: body.tableNumber }, 'Table created');
    return reply.code(201).send({ success: true, table });
  });

  /**
   * PATCH /tables/:id/seat
   * Seat a party at a table.
   */
  app.patch<{ Params: { id: string } }>(
    '/tables/:id/seat',
    async (request, _reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = request.body as any;
      if (!body.partySize) throw new Error('partySize is required');

      const table = await db.tableSession.findUnique({ where: { id: request.params.id } });
      if (!table) throw new NotFoundError('TableSession', request.params.id);

      const now = new Date();
      const estimatedDone = body.estimatedMinutes
        ? new Date(now.getTime() + body.estimatedMinutes * 60 * 1000)
        : undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await db.tableSession.update({
        where: { id: request.params.id },
        data: {
          status: 'OCCUPIED',
          partySize: body.partySize,
          guestName: body.guestName,
          seatedAt: now,
          ...(estimatedDone !== undefined ? { estimatedDone } : {}),
          clearedAt: null,
        } as any,
      });

      log.info({ tableId: table.id, partySize: body.partySize }, 'Table seated');
      return { success: true, table: updated };
    },
  );

  /**
   * PATCH /tables/:id/status
   * Update table status (clear, reserve, cleaning).
   */
  app.patch<{ Params: { id: string } }>(
    '/tables/:id/status',
    async (request, _reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = request.body as any;
      if (!body.status) throw new Error('status is required');

      const table = await db.tableSession.findUnique({ where: { id: request.params.id } });
      if (!table) throw new NotFoundError('TableSession', request.params.id);

      const now = new Date();
      const updated = await db.tableSession.update({
        where: { id: request.params.id },
        data: {
          status: body.status,
          ...(body.status === 'AVAILABLE' ? { partySize: null, guestName: null, seatedAt: null, estimatedDone: null, clearedAt: now } : {}),
          ...(body.status === 'CLEANING' ? { clearedAt: now } : {}),
        },
      });

      log.info({ tableId: table.id, status: body.status }, 'Table status updated');
      return { success: true, table: updated };
    },
  );

  /**
   * DELETE /tables/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/tables/:id',
    async (request, _reply) => {
      const existing = await db.tableSession.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('TableSession', request.params.id);
      await db.tableSession.delete({ where: { id: request.params.id } });
      return { success: true };
    },
  );

  /**
   * GET /tables/stats/:businessId
   */
  app.get<{ Params: { businessId: string } }>(
    '/tables/stats/:businessId',
    async (request, _reply) => {
      const { businessId } = request.params;

      const tables = await db.tableSession.findMany({ where: { businessId } });

      const totalTables = tables.length;
      const occupied = tables.filter(t => t.status === 'OCCUPIED').length;
      const available = tables.filter(t => t.status === 'AVAILABLE').length;
      const totalCapacity = tables.reduce((sum, t) => sum + (t.tableCapacity ?? 0), 0);
      const seatedGuests = tables.filter(t => t.status === 'OCCUPIED').reduce((sum, t) => sum + (t.partySize ?? 0), 0);

      // Estimate average wait based on occupied tables
      const occupiedTables = tables.filter(t => t.status === 'OCCUPIED' && t.estimatedDone);
      const now = new Date();
      const avgMinutesLeft = occupiedTables.length > 0
        ? Math.max(0, Math.round(occupiedTables.reduce((sum, t) => {
            const remaining = (t.estimatedDone!.getTime() - now.getTime()) / 60000;
            return sum + Math.max(0, remaining);
          }, 0) / occupiedTables.length))
        : 0;

      return {
        success: true,
        stats: { totalTables, occupied, available, totalCapacity, seatedGuests, avgMinutesLeft },
      };
    },
  );
}
