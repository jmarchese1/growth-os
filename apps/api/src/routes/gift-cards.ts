import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import type { CreateGiftCardRequest, RedeemGiftCardRequest } from '@embedo/types';

const log = createLogger('api:gift-cards');

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = 'GC-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function giftCardRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /gift-cards
   */
  app.get<{ Querystring: { businessId: string; status?: string } }>(
    '/gift-cards',
    async (request, reply) => {
      const { businessId, status } = request.query;
      if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

      const where: Record<string, unknown> = { businessId };
      if (status) where['status'] = status;

      const cards = await db.giftCard.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, cards };
    },
  );

  /**
   * GET /gift-cards/lookup/:code
   * Public endpoint — look up a gift card by code (for redemption).
   */
  app.get<{ Params: { code: string } }>(
    '/gift-cards/lookup/:code',
    async (request, _reply) => {
      const card = await db.giftCard.findUnique({ where: { code: request.params.code.toUpperCase() } });
      if (!card) throw new NotFoundError('GiftCard', request.params.code);

      return {
        success: true,
        card: {
          code: card.code,
          currentBalance: card.currentBalance,
          status: card.status,
          recipientName: card.recipientName,
          expiresAt: card.expiresAt,
        },
      };
    },
  );

  /**
   * POST /gift-cards
   * Create/sell a gift card.
   */
  app.post('/gift-cards', async (request, reply) => {
    const body = request.body as Partial<CreateGiftCardRequest>;

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.amount || body.amount <= 0) return reply.code(400).send({ success: false, error: 'amount must be positive' });

    const tool = await db.businessTool.findUnique({
      where: { businessId_type: { businessId: body.businessId, type: 'GIFT_CARD_LOYALTY' } },
    });
    if (!tool?.enabled) return reply.code(400).send({ success: false, error: 'Gift cards not enabled' });

    // Create or find contact from purchaser info
    let contactId: string | undefined;
    if (body.purchaserEmail || body.purchaserPhone) {
      try {
        const contact = await db.contact.upsert({
          where: body.purchaserEmail
            ? { businessId_email: { businessId: body.businessId, email: body.purchaserEmail } }
            : { businessId_phone: { businessId: body.businessId, phone: body.purchaserPhone! } },
          create: {
            businessId: body.businessId,
            source: body.source === 'VOICE_AGENT' ? 'VOICE' : body.source === 'CHATBOT' ? 'CHATBOT' : 'MANUAL',
            ...(body.purchaserName ? { firstName: body.purchaserName.split(' ')[0], lastName: body.purchaserName.split(' ').slice(1).join(' ') || undefined } : {}),
            ...(body.purchaserEmail ? { email: body.purchaserEmail } : {}),
            ...(body.purchaserPhone ? { phone: body.purchaserPhone } : {}),
          },
          update: {},
        });
        contactId = contact.id;
      } catch { /* ignore */ }
    }

    const code = generateCode();

    const card = await db.giftCard.create({
      data: {
        businessId: body.businessId,
        contactId,
        code,
        initialAmount: body.amount,
        currentBalance: body.amount,
        purchaserName: body.purchaserName,
        purchaserEmail: body.purchaserEmail,
        purchaserPhone: body.purchaserPhone,
        recipientName: body.recipientName,
        recipientEmail: body.recipientEmail,
        recipientPhone: body.recipientPhone,
        personalMessage: body.personalMessage,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        source: body.source ?? 'MANUAL',
      },
    });

    log.info({ cardId: card.id, code, amount: body.amount }, 'Gift card created');
    return reply.code(201).send({ success: true, card });
  });

  /**
   * POST /gift-cards/:id/redeem
   * Redeem (deduct) from a gift card balance.
   */
  app.post<{ Params: { id: string } }>(
    '/gift-cards/:id/redeem',
    async (request, reply) => {
      const body = request.body as Partial<RedeemGiftCardRequest>;
      if (!body.amount || body.amount <= 0) return reply.code(400).send({ success: false, error: 'amount must be positive' });

      const card = await db.giftCard.findUnique({ where: { id: request.params.id } });
      if (!card) throw new NotFoundError('GiftCard', request.params.id);
      if (card.status !== 'ACTIVE') return reply.code(400).send({ success: false, error: `Gift card is ${card.status.toLowerCase()}` });
      if (card.expiresAt && card.expiresAt < new Date()) return reply.code(400).send({ success: false, error: 'Gift card is expired' });
      if (body.amount > card.currentBalance) return reply.code(400).send({ success: false, error: `Insufficient balance. Current: $${card.currentBalance.toFixed(2)}` });

      const newBalance = Math.round((card.currentBalance - body.amount) * 100) / 100;
      const updated = await db.giftCard.update({
        where: { id: request.params.id },
        data: {
          currentBalance: newBalance,
          ...(newBalance === 0 ? { status: 'REDEEMED', redeemedAt: new Date() } : {}),
        },
      });

      log.info({ cardId: card.id, redeemed: body.amount, remaining: newBalance }, 'Gift card redeemed');
      return { success: true, card: updated };
    },
  );

  /**
   * GET /gift-cards/stats/:businessId
   */
  app.get<{ Params: { businessId: string } }>(
    '/gift-cards/stats/:businessId',
    async (request, _reply) => {
      const { businessId } = request.params;

      const [totalSold, activeCards, totalValue, outstandingBalance] = await Promise.all([
        db.giftCard.count({ where: { businessId } }),
        db.giftCard.count({ where: { businessId, status: 'ACTIVE' } }),
        db.giftCard.aggregate({ where: { businessId }, _sum: { initialAmount: true } }),
        db.giftCard.aggregate({ where: { businessId, status: 'ACTIVE' }, _sum: { currentBalance: true } }),
      ]);

      return {
        success: true,
        stats: {
          totalSold,
          activeCards,
          totalValue: totalValue._sum.initialAmount ?? 0,
          outstandingBalance: outstandingBalance._sum.currentBalance ?? 0,
        },
      };
    },
  );
}
