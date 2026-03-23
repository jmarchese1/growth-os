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
        {
          type: 'WAITLIST',
          name: 'Waitlist Manager',
          description: 'Automated waitlist with estimated wait times and SMS notifications when the table is ready. Replaces paper lists and expensive Yelp Waitlist.',
          icon: 'clock',
          industries: ['RESTAURANT'],
          capabilities: [
            'Voice agent adds callers to the waitlist',
            'Chatbot handles walk-in waitlist requests',
            'Auto-calculated wait time estimates',
            'SMS notification when table is ready',
            'Live waitlist view in dashboard',
          ],
          defaultConfig: {
            avgWaitMinutes: 15,
            maxWaitlistSize: 50,
            autoNotify: true,
            notificationMessage: 'Your table at {businessName} is ready! Please come to the host stand within 10 minutes.',
          },
        },
        {
          type: 'DAILY_SPECIALS',
          name: 'Daily Specials & 86\'d Items',
          description: 'Keep your AI agents up-to-date on today\'s specials and sold-out items. No more taking orders for food you don\'t have.',
          icon: 'star',
          industries: ['RESTAURANT'],
          capabilities: [
            'Voice agent announces daily specials',
            'Chatbot shows specials in conversation',
            'Real-time 86\'d item tracking',
            'Agents auto-decline unavailable items',
            'Quick update from dashboard',
          ],
          defaultConfig: {
            specials: [],
            eightySixedItems: [],
            autoAnnounce: true,
          },
        },
        {
          type: 'CATERING_REQUESTS',
          name: 'Catering Requests',
          description: 'Capture catering inquiries from calls and chat. Collect event details, headcount, dietary needs, and budget — then follow up with a quote.',
          icon: 'truck',
          industries: ['RESTAURANT'],
          capabilities: [
            'Voice agent captures catering inquiries',
            'Chatbot collects event details',
            'Event date, headcount, budget tracking',
            'Quote management in dashboard',
            'Status pipeline: New → Quoted → Confirmed',
          ],
          defaultConfig: {
            minimumHeadcount: 10,
            minimumBudget: 200,
            cateringMenu: [],
            leadTimeHours: 48,
          },
        },
        {
          type: 'REVIEW_RESPONSE',
          name: 'Review Response',
          description: 'AI-drafted responses to Google and Yelp reviews. Catch negative reviews early and respond professionally without spending hours writing replies.',
          icon: 'message-circle',
          industries: ['RESTAURANT'],
          capabilities: [
            'AI-drafted review responses',
            'Tone matching (professional, casual, apologetic)',
            'One-click approve and post',
            'Negative review alerts',
            'Response templates by star rating',
          ],
          defaultConfig: {
            tone: 'professional',
            autoAlert: true,
            alertOnRating: 3,
            platforms: ['google', 'yelp'],
          },
        },
        {
          type: 'FEEDBACK_COLLECTION',
          name: 'Feedback Collection',
          description: 'Automatically follow up with customers after orders or visits. Catch bad experiences before they become 1-star reviews.',
          icon: 'thumbs-up',
          industries: ['RESTAURANT'],
          capabilities: [
            'Auto SMS follow-up after orders',
            'Simple rating collection (1-5 stars)',
            'Free-text comment collection',
            'Dashboard with average rating trends',
            'Respond to feedback directly',
          ],
          defaultConfig: {
            autoSendAfterOrder: true,
            delayMinutes: 60,
            followUpMessage: 'Thanks for ordering from {businessName}! How was your experience? Reply 1-5 (5 = amazing)',
          },
        },
        {
          type: 'PROMO_ALERTS',
          name: 'Happy Hour & Promo Alerts',
          description: 'Set recurring specials and promotions. Your AI agents tell callers about today\'s deals, and you can blast SMS to opted-in customers.',
          icon: 'megaphone',
          industries: ['RESTAURANT'],
          capabilities: [
            'Voice agent announces current promos',
            'Chatbot shows active deals',
            'Recurring schedule (Taco Tuesday, etc.)',
            'SMS blast to opted-in contacts',
            'Time-based auto-activation',
          ],
          defaultConfig: {
            promos: [],
            smsBlastEnabled: false,
            smsBlastTime: '11:00',
          },
        },
        {
          type: 'TABLE_TURNOVER',
          name: 'Table Turnover Tracker',
          description: 'Track which tables are occupied, estimate wait times accurately, and optimize seating. Your AI agent quotes real wait times to callers.',
          icon: 'layout',
          industries: ['RESTAURANT'],
          capabilities: [
            'Visual table map in dashboard',
            'Real-time occupancy tracking',
            'Accurate wait time estimates for callers',
            'Table capacity management',
            'Turnover analytics',
          ],
          defaultConfig: {
            tables: [],
            avgDiningMinutes: 60,
          },
        },
        {
          type: 'DELIVERY_TRACKING',
          name: 'Delivery Coordination',
          description: 'For restaurants doing their own delivery. Track drivers, send customers ETA updates, and manage the delivery queue.',
          icon: 'map-pin',
          industries: ['RESTAURANT'],
          capabilities: [
            'Delivery queue management',
            'Driver assignment',
            'Customer SMS with ETA updates',
            'Status tracking: Preparing → Out → Delivered',
            'Delivery zone configuration',
          ],
          defaultConfig: {
            deliveryEnabled: true,
            defaultDeliveryMinutes: 30,
            deliveryFee: 0,
            deliveryRadius: 5,
          },
        },
        {
          type: 'GIFT_CARD_LOYALTY',
          name: 'Gift Cards & Loyalty',
          description: 'Sell gift cards over the phone or chat. Track balances, redemptions, and build customer loyalty without a third-party platform.',
          icon: 'gift',
          industries: ['RESTAURANT'],
          capabilities: [
            'Voice agent sells gift cards',
            'Chatbot handles gift card purchases',
            'Unique redemption codes',
            'Balance tracking and partial redemption',
            'Gift card lookup by code',
          ],
          defaultConfig: {
            denominations: [25, 50, 75, 100],
            expirationMonths: 12,
            allowCustomAmount: true,
          },
        },
      ],
    };
  });
}
