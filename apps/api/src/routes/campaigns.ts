import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import type { CampaignType, CampaignStatus } from '@embedo/db';

const log = createLogger('api:campaigns');

export async function campaignRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /campaigns?businessId=xxx
   * List all campaigns for a business.
   */
  app.get('/campaigns', async (request, reply) => {
    const { businessId } = request.query as { businessId?: string };
    if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

    const campaigns = await db.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, campaigns };
  });

  /**
   * POST /campaigns
   * Create a new campaign draft.
   */
  app.post('/campaigns', async (request, reply) => {
    const body = request.body as {
      businessId?: string;
      name?: string;
      type?: string;
      subject?: string;
      body?: string;
    };

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.name?.trim()) return reply.code(400).send({ success: false, error: 'name is required' });
    if (!body.body?.trim()) return reply.code(400).send({ success: false, error: 'body is required' });

    const validTypes = ['EMAIL', 'SMS'];
    const campaignType = (body.type && validTypes.includes(body.type.toUpperCase()))
      ? body.type.toUpperCase() as CampaignType
      : 'EMAIL' as CampaignType;

    const campaign = await db.campaign.create({
      data: {
        businessId: body.businessId,
        name: body.name.trim(),
        type: campaignType,
        subject: body.subject?.trim() ?? null,
        body: body.body.trim(),
        status: 'DRAFT' as CampaignStatus,
      },
    });

    log.info({ businessId: body.businessId, campaignId: campaign.id }, 'Campaign created');
    return { success: true, campaign };
  });

  /**
   * DELETE /campaigns/:id
   */
  app.delete<{ Params: { id: string } }>('/campaigns/:id', async (request) => {
    const { id } = request.params;
    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);
    await db.campaign.delete({ where: { id } });
    log.info({ campaignId: id }, 'Campaign deleted');
    return { success: true };
  });
}
