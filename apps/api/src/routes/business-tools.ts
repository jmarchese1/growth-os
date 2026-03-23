import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import type { EnableToolRequest, UpdateToolConfigRequest } from '@embedo/types';

const log = createLogger('api:business-tools');

export async function businessToolRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /business-tools
   * List all tools for a business.
   */
  app.get<{ Querystring: { businessId: string } }>(
    '/business-tools',
    async (request, reply) => {
      const { businessId } = request.query;
      if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

      const tools = await db.businessTool.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, tools };
    },
  );

  /**
   * POST /business-tools
   * Enable a tool for a business. Idempotent — if tool already exists, updates config.
   */
  app.post('/business-tools', async (request, reply) => {
    const body = request.body as Partial<EnableToolRequest>;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.type) return reply.code(400).send({ success: false, error: 'type is required' });

    const business = await db.business.findUnique({ where: { id: body.businessId } });
    if (!business) throw new NotFoundError('Business', body.businessId);

    const tool = await db.businessTool.upsert({
      where: { businessId_type: { businessId: body.businessId, type: body.type } },
      create: {
        businessId: body.businessId,
        type: body.type,
        enabled: true,
        config: body.config ?? {},
      },
      update: {
        enabled: true,
        ...(body.config ? { config: body.config } : {}),
      },
    });

    log.info({ toolId: tool.id, businessId: body.businessId, type: body.type }, 'Business tool enabled');

    return reply.code(201).send({ success: true, tool });
  });

  /**
   * PATCH /business-tools/:id
   * Update a tool's config or enabled state.
   */
  app.patch<{ Params: { id: string } }>(
    '/business-tools/:id',
    async (request, _reply) => {
      const body = request.body as Partial<UpdateToolConfigRequest> & { enabled?: boolean };

      const existing = await db.businessTool.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('BusinessTool', request.params.id);

      const tool = await db.businessTool.update({
        where: { id: request.params.id },
        data: {
          ...(body.config !== undefined ? { config: body.config } : {}),
          ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        },
      });

      log.info({ toolId: tool.id, type: tool.type }, 'Business tool updated');

      return { success: true, tool };
    },
  );

  /**
   * DELETE /business-tools/:id
   * Remove a tool from a business.
   */
  app.delete<{ Params: { id: string } }>(
    '/business-tools/:id',
    async (request, _reply) => {
      const existing = await db.businessTool.findUnique({ where: { id: request.params.id } });
      if (!existing) throw new NotFoundError('BusinessTool', request.params.id);

      await db.businessTool.delete({ where: { id: request.params.id } });

      log.info({ toolId: request.params.id, type: existing.type }, 'Business tool removed');

      return { success: true };
    },
  );

  /**
   * GET /business-tools/catalog
   * Return the available tool catalog (static for now, will be dynamic later).
   */
  app.get('/business-tools/catalog', async (_request, _reply) => {
    return {
      success: true,
      catalog: [
        {
          type: 'TAKEOUT_ORDERS',
          name: 'Takeout Orders',
          description: 'Let your AI phone agent and chatbot take takeout orders directly from customers. Orders appear in your dashboard in real-time.',
          icon: 'shopping-bag',
          industries: ['RESTAURANT'],
          capabilities: [
            'Voice agent takes phone orders',
            'Chatbot takes website/DM orders',
            'Real-time order dashboard',
            'Customer notification on status change',
            'Menu configuration',
          ],
          defaultConfig: {
            taxRate: 0,
            menuItems: [],
            prepTimeMinutes: 20,
            acceptingOrders: true,
          },
        },
      ],
    };
  });
}
