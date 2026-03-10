import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger, validate, NotFoundError } from '@embedo/utils';
import { db } from '@embedo/db';
import { prospectDiscoveredQueue } from '@embedo/queue';
import { searchRestaurants } from './scraper/geoapify.js';
import { sendColdEmail } from './outreach/email-sender.js';
import { generatePersonalizedEmail } from './outreach/ai-personalizer.js';
import { env } from './config.js';

const log = createLogger('prospector:routes');

const updateCampaignSchema = z.object({
  emailSubject: z.string().min(5).optional(),
  emailBodyHtml: z.string().min(20).optional(),
  smsBody: z.string().optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(2),
  targetCity: z.string().min(2),
  targetIndustry: z.enum(['RESTAURANT', 'SALON', 'RETAIL', 'FITNESS', 'MEDICAL', 'OTHER']).default('RESTAURANT'),
  emailSubject: z.string().min(5),
  emailBodyHtml: z.string().min(20),
  smsBody: z.string().optional(),
  maxProspects: z.number().int().positive().nullable().optional(),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true, service: 'prospector' }));

  // ─── AI status ────────────────────────────────────────────────────────────
  app.get('/ai/status', async () => ({ aiEnabled: !!env.ANTHROPIC_API_KEY }));

  // ─── AI email preview (for campaign form) ─────────────────────────────────
  app.post('/ai/preview-email', async (request, reply) => {
    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(400).send({ error: 'ANTHROPIC_API_KEY not configured' });
    }
    const { name, city, website, googleRating, googleReviewCount } = request.body as {
      name?: string; city?: string; website?: string;
      googleRating?: number; googleReviewCount?: number;
    };
    const replyEmail = env.REPLY_TRACKING_EMAIL ?? env.SENDGRID_FROM_EMAIL ?? 'jason@embedo.io';
    const html = await generatePersonalizedEmail(
      { name: name ?? 'Acme Restaurant', city: city ?? 'New York', website: website ?? null, googleRating, googleReviewCount },
      replyEmail,
      env.ANTHROPIC_API_KEY,
    );
    if (!html) return reply.code(500).send({ error: 'AI generation failed' });
    return reply.send({ html });
  });

  // ─── Create campaign ──────────────────────────────────────────────────────
  app.post('/campaigns', async (request, reply) => {
    const parsed = validate(createCampaignSchema, request.body);
    // Build create data without undefined optional fields (exactOptionalPropertyTypes)
    const createData: Record<string, unknown> = {
      name: parsed.name,
      targetCity: parsed.targetCity,
      targetIndustry: (parsed.targetIndustry ?? 'RESTAURANT') as 'RESTAURANT' | 'SALON' | 'RETAIL' | 'FITNESS' | 'MEDICAL' | 'OTHER',
      emailSubject: parsed.emailSubject,
      emailBodyHtml: parsed.emailBodyHtml,
    };
    if (parsed.smsBody !== undefined) createData['smsBody'] = parsed.smsBody;
    if (parsed.maxProspects != null) createData['maxProspects'] = parsed.maxProspects;
    const campaign = await db.outboundCampaign.create({ data: createData as never });
    log.info({ campaignId: campaign.id, name: campaign.name }, 'Campaign created');
    return reply.code(201).send(campaign);
  });

  // ─── List campaigns ───────────────────────────────────────────────────────
  app.get('/campaigns', async () => {
    return db.outboundCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { prospects: true } } },
    });
  });

  // ─── Update campaign email content ────────────────────────────────────────
  app.patch('/campaigns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = validate(updateCampaignSchema, request.body);

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const updated = await db.outboundCampaign.update({
      where: { id },
      data: {
        ...(parsed.emailSubject !== undefined && { emailSubject: parsed.emailSubject }),
        ...(parsed.emailBodyHtml !== undefined && { emailBodyHtml: parsed.emailBodyHtml }),
        ...(parsed.smsBody !== undefined && { smsBody: parsed.smsBody }),
      },
    });
    log.info({ campaignId: id }, 'Campaign email updated');
    return reply.send(updated);
  });

  // ─── Delete campaign ──────────────────────────────────────────────────────
  app.delete('/campaigns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    // Delete all related outreach messages first, then prospects, then campaign
    await db.outreachMessage.deleteMany({
      where: { prospect: { campaignId: id } },
    });
    await db.prospectBusiness.deleteMany({ where: { campaignId: id } });
    await db.outboundCampaign.delete({ where: { id } });

    log.info({ campaignId: id }, 'Campaign deleted');
    return reply.send({ deleted: true });
  });

  // ─── Run campaign (scrape + queue) ────────────────────────────────────────
  app.post('/campaigns/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);
    if (!campaign.active) return reply.code(400).send({ error: 'Campaign is inactive' });

    if (!env.GEOAPIFY_API_KEY) {
      return reply.code(400).send({ error: 'GEOAPIFY_API_KEY not configured' });
    }

    log.info({ campaignId: id, city: campaign.targetCity }, 'Running campaign');

    // Scrape in background — return immediately
    setImmediate(async () => {
      try {
        const allPlaces = await searchRestaurants(campaign.targetCity, env.GEOAPIFY_API_KEY!);
        const places = campaign.maxProspects != null ? allPlaces.slice(0, campaign.maxProspects) : allPlaces;
        log.info({ campaignId: id, total: allPlaces.length, limited: places.length, maxProspects: campaign.maxProspects }, 'Places scraped, queuing prospects');

        for (const place of places) {
          const job: Record<string, unknown> = {
            campaignId: id,
            placeId: place.placeId,
            name: place.name,
            address: place.address as Record<string, unknown>,
          };
          if (place.phone) job['phone'] = place.phone;
          if (place.website) job['website'] = place.website;
          if (place.email) job['email'] = place.email;

          await prospectDiscoveredQueue().add(`place:${place.placeId}`, job as never);
        }
      } catch (err) {
        log.error({ err, campaignId: id }, 'Campaign run failed');
      }
    });

    return reply.code(202).send({ message: 'Campaign started', campaignId: id, city: campaign.targetCity });
  });

  // ─── Campaign stats ───────────────────────────────────────────────────────
  app.get('/campaigns/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const [total, byStatus] = await Promise.all([
      db.prospectBusiness.count({ where: { campaignId: id } }),
      db.prospectBusiness.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: { _all: true },
      }),
    ]);

    const stats = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));

    const replies = await db.outreachMessage.count({
      where: {
        prospect: { campaignId: id },
        status: 'REPLIED',
      },
    });

    return reply.send({ campaignId: id, total, byStatus: stats, replies });
  });

  // ─── List prospects (with reply filter) ───────────────────────────────────
  app.get('/campaigns/:id/prospects', async (request) => {
    const { id } = request.params as { id: string };
    const { status, page = '1', pageSize = '50' } = request.query as Record<string, string>;

    // Support comma-separated statuses: e.g. status=CONTACTED,OPENED,REPLIED,CONVERTED
    const statusFilter = status
      ? status.includes(',')
        ? { status: { in: status.split(',') as never[] } }
        : { status: status as never }
      : {};

    const where = {
      campaignId: id,
      ...statusFilter,
    };

    const [items, total] = await Promise.all([
      db.prospectBusiness.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true, sentAt: true, openedAt: true, repliedAt: true, replyBody: true },
          },
        },
      }),
      db.prospectBusiness.count({ where }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // ─── Mark prospect converted ──────────────────────────────────────────────
  app.patch('/prospects/:id/convert', async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await db.prospectBusiness.update({
      where: { id },
      data: { status: 'CONVERTED' },
    });
    log.info({ prospectId: id }, 'Prospect marked converted');
    return reply.send(prospect);
  });

  // ─── Send email to prospect now (bypass queue delay) ──────────────────────
  app.post('/prospects/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!env.SENDGRID_API_KEY || env.SENDGRID_API_KEY.startsWith('SG....')) {
      return reply.code(400).send({ error: 'SENDGRID_API_KEY not configured — set it in .env.local' });
    }

    const prospect = await db.prospectBusiness.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!prospect) throw new NotFoundError('Prospect', id);
    if (!prospect.email) return reply.code(400).send({ error: 'Prospect has no email address' });
    if (prospect.status === 'CONTACTED' || prospect.status === 'OPENED' || prospect.status === 'REPLIED') {
      return reply.code(400).send({ error: `Already contacted (status: ${prospect.status})` });
    }

    try {
      const messageId = await sendColdEmail(prospect, prospect.campaign);
      log.info({ prospectId: id, messageId }, 'Manual email send triggered');
      return reply.code(200).send({ ok: true, messageId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Extract SendGrid body if present
      const sgBody = (err as { response?: { body?: { errors?: { message: string }[] } } }).response?.body;
      const sgMsg = sgBody?.errors?.[0]?.message ?? msg;
      log.error({ prospectId: id, err }, 'Manual send failed');
      return reply.code(500).send({ error: sgMsg });
    }
  });

  // ─── Get single prospect with full message history ────────────────────────
  app.get('/prospects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await db.prospectBusiness.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true, targetCity: true, targetIndustry: true } },
        messages: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!prospect) throw new NotFoundError('Prospect', id);
    return reply.send(prospect);
  });

  // ─── Get outreach messages for a prospect ─────────────────────────────────
  app.get('/prospects/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const messages = await db.outreachMessage.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(messages);
  });
}
