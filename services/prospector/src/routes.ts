import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger, validate, NotFoundError } from '@embedo/utils';
import { db } from '@embedo/db';
import { prospectDiscoveredQueue, outreachSendQueue } from '@embedo/queue';
import { searchRestaurants, geocodeCity } from './scraper/geoapify.js';
import { sendColdEmail } from './outreach/email-sender.js';
import { generatePersonalizedEmail } from './outreach/ai-personalizer.js';
import { findEmailViaHunter, extractDomain as extractHunterDomain } from './scraper/hunter.js';
import { env } from './config.js';

const log = createLogger('prospector:routes');

const updateCampaignSchema = z.object({
  emailSubject: z.string().min(5).optional(),
  emailBodyHtml: z.string().min(20).optional(),
  smsBody: z.string().optional(),
  sequenceSteps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    delayHours: z.number().min(0),
    subject: z.string().min(2).optional(),
    bodyHtml: z.string().min(20).optional(),
  })).optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(2),
  targetCity: z.string().min(2),
  targetState: z.string().optional(),
  targetCountry: z.string().optional(),
  targetLat: z.number().optional(),
  targetLon: z.number().optional(),
  targetIndustry: z.enum(['RESTAURANT', 'SALON', 'RETAIL', 'FITNESS', 'MEDICAL', 'OTHER']).default('RESTAURANT'),
  emailSubject: z.string().min(5),
  emailBodyHtml: z.string().min(20),
  smsBody: z.string().optional(),
  maxProspects: z.number().int().positive().nullable().optional(),
  sequenceSteps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    delayHours: z.number().min(0),
    subject: z.string().min(2).optional(),
    bodyHtml: z.string().min(20).optional(),
  })).optional(),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true, service: 'prospector' }));

  // ─── Geocode autocomplete (proxied to keep API key server-side) ───────────
  app.get('/geocode/autocomplete', async (request, reply) => {
    const { q, state } = request.query as { q?: string; state?: string };
    if (!q || q.length < 2) return reply.send([]);
    if (!env.GEOAPIFY_API_KEY) return reply.send([]);

    // Use the search endpoint (same one used by geocodeCity — confirmed working)
    // with format=json so we get a flat results array with lon/lat directly.
    const text = state ? `${q}, ${state}` : q;
    const params = new URLSearchParams({
      text,
      type: 'city',
      filter: 'countrycode:us',
      format: 'json',
      limit: '6',
      apiKey: env.GEOAPIFY_API_KEY,
    });

    try {
      const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
      if (!res.ok) return reply.send([]);
      const data = (await res.json()) as {
        results?: Array<{ city?: string; state?: string; state_code?: string; lon: number; lat: number }>;
      };
      const seen = new Set<string>();
      const results = (data.results ?? [])
        .map((r) => ({
          label: [r.city, r.state_code ?? r.state].filter(Boolean).join(', '),
          city: r.city ?? '',
          state: r.state_code ?? r.state ?? '',
          lon: r.lon,
          lat: r.lat,
        }))
        .filter((r) => {
          if (!r.city) return false;
          const key = r.label;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      return reply.send(results);
    } catch {
      return reply.send([]);
    }
  });

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
      { name: name ?? 'Acme Restaurant', city: city ?? 'New York', website: website ?? null, googleRating: googleRating ?? null, googleReviewCount: googleReviewCount ?? null },
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
    if (parsed.targetState !== undefined) createData['targetState'] = parsed.targetState;
    if (parsed.targetCountry !== undefined) createData['targetCountry'] = parsed.targetCountry;
    if (parsed.targetLat !== undefined) createData['targetLat'] = parsed.targetLat;
    if (parsed.targetLon !== undefined) createData['targetLon'] = parsed.targetLon;
    if (parsed.smsBody !== undefined) createData['smsBody'] = parsed.smsBody;
    if (parsed.maxProspects != null) createData['maxProspects'] = parsed.maxProspects;
    if (parsed.sequenceSteps !== undefined) {
      createData['sequenceSteps'] = parsed.sequenceSteps.sort((a: { stepNumber: number }, b: { stepNumber: number }) => a.stepNumber - b.stepNumber);
    }
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
        ...(parsed.sequenceSteps !== undefined && { sequenceSteps: parsed.sequenceSteps.sort((a: { stepNumber: number }, b: { stepNumber: number }) => a.stepNumber - b.stepNumber) }),
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

    // Use stored coords if available (set at campaign creation via autocomplete).
    // Fall back to geocoding only for campaigns created before this feature was added.
    let coords: { lon: number; lat: number };
    if (campaign.targetLat != null && campaign.targetLon != null) {
      coords = { lon: campaign.targetLon, lat: campaign.targetLat };
      log.info({ campaignId: id, coords }, 'Using stored campaign coords — skipping geocode');
    } else {
      try {
        coords = await geocodeCity(campaign.targetCity, env.GEOAPIFY_API_KEY!);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn({ campaignId: id, city: campaign.targetCity, err }, 'Geocode failed');
        return reply.code(400).send({ error: msg });
      }
    }

    // Scrape places in background — return 202 immediately
    setImmediate(async () => {
      try {
        // Start from after already-scraped prospects so each run returns fresh results
        const existingCount = await db.prospectBusiness.count({ where: { campaignId: id } });
        const fetchLimit = campaign.maxProspects ?? 200;
        const allPlaces = await searchRestaurants(campaign.targetCity, env.GEOAPIFY_API_KEY!, fetchLimit, coords, existingCount);
        log.info({ campaignId: id, total: allPlaces.length, startOffset: existingCount }, 'Places scraped, queuing prospects');

        for (const place of allPlaces) {
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
        log.error({ err, campaignId: id }, 'Campaign scrape failed');
      }
    });

    return reply.code(202).send({ message: 'Campaign started', campaignId: id, city: campaign.targetCity, coords });
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

    const stats = Object.fromEntries(byStatus.map((s: { status: string; _count: { _all: number } }) => [s.status, s._count._all]));

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
            select: { status: true, stepNumber: true, subject: true, body: true, sentAt: true, openedAt: true, repliedAt: true, replyBody: true, replyCategory: true },
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
    const prospect = await db.prospectBusiness.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!prospect) throw new NotFoundError('Prospect', id);

    if (prospect.convertedToBusinessId) {
      const existing = await db.business.findUnique({ where: { id: prospect.convertedToBusinessId } });
      return reply.send({ prospect, business: existing });
    }

    const baseSlug = prospect.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let suffix = 1;
    while (await db.business.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const business = await db.business.create({
      data: {
        name: prospect.name,
        slug,
        type: prospect.campaign.targetIndustry,
        status: 'PENDING',
        phone: prospect.phone ?? null,
        email: prospect.email ?? null,
        website: prospect.website ?? null,
        ...(prospect.address != null && { address: prospect.address }),
        timezone: 'America/New_York',
      },
    });

    const updated = await db.prospectBusiness.update({
      where: { id },
      data: { status: 'CONVERTED', convertedToBusinessId: business.id },
    });

    log.info({ prospectId: id, businessId: business.id }, 'Prospect converted to business');
    return reply.send({ prospect: updated, business });
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
      if (msg.toLowerCase().includes('suppressed')) {
        return reply.code(400).send({ error: 'Email is suppressed for this prospect' });
      }
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
        campaign: { select: { id: true, name: true, targetCity: true, targetIndustry: true, sequenceSteps: true } },
        messages: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!prospect) throw new NotFoundError('Prospect', id);
    return reply.send(prospect);
  });

  // ─── Retroactively queue follow-up steps for contacted prospects ──────────
  app.post('/campaigns/:id/requeue-followups', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const campaign = await db.outboundCampaign.findUnique({ where: { id } });
      if (!campaign) throw new NotFoundError('Campaign', id);

      const steps = (campaign.sequenceSteps as Array<{ stepNumber: number; delayHours: number }> | null) ?? [];
      const followUpSteps = steps.filter((s) => s.stepNumber > 1);

      if (followUpSteps.length === 0) {
        return reply.code(400).send({ error: 'No follow-up steps configured on this campaign. Add steps first, then apply.' });
      }

      // Prospects that got step 1 but have no follow-up scheduled
      const prospects = await db.prospectBusiness.findMany({
        where: {
          campaignId: id,
          status: { in: ['CONTACTED', 'OPENED'] as never[] },
          nextFollowUpAt: null,
          email: { not: null },
        },
      });

      const firstStep = followUpSteps[0];
      let queued = 0;

      for (const prospect of prospects) {
        const baseTime = prospect.createdAt.getTime();

        for (const step of followUpSteps) {
          const fireAt = baseTime + step.delayHours * 60 * 60 * 1000;
          const delay = Math.max(0, fireAt - Date.now());
          await outreachSendQueue().add(
            `requeue:${prospect.id}:step${step.stepNumber}:${Date.now()}`,
            { prospectId: prospect.id, campaignId: id, channel: 'email', stepNumber: step.stepNumber },
            { delay },
          );
        }

        const nextAt = new Date(baseTime + firstStep!.delayHours * 60 * 60 * 1000);
        await db.prospectBusiness.update({
          where: { id: prospect.id },
          data: { nextFollowUpAt: nextAt > new Date() ? nextAt : null },
        });

        queued++;
      }

      log.info({ campaignId: id, queued }, 'Follow-up steps requeued');
      return reply.send({ queued, stepsPerProspect: followUpSteps.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err, campaignId: id }, 'Requeue follow-ups failed');
      return reply.code(500).send({ error: msg });
    }
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

  // ─── Enrich NEW prospects with Hunter.io ──────────────────────────────────
  // Targets prospects with status=NEW (no email found) that have a website.
  // Calls Hunter domain search, saves email + contact info, queues outreach.
  app.post('/campaigns/:id/enrich-hunter', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!env.HUNTER_API_KEY) {
      return reply.code(400).send({ error: 'HUNTER_API_KEY not configured — add it to .env.local' });
    }

    try {
      const campaign = await db.outboundCampaign.findUnique({ where: { id } });
      if (!campaign) throw new NotFoundError('Campaign', id);

      // Find prospects with no email that have a website to search against
      const prospects = await db.prospectBusiness.findMany({
        where: {
          campaignId: id,
          status: 'NEW',
          website: { not: null },
          email: null,
        },
      });

      if (prospects.length === 0) {
        return reply.send({ enriched: 0, message: 'No NEW prospects without emails found' });
      }

      const steps = (campaign.sequenceSteps as Array<{ stepNumber: number; delayHours: number }> | null) ?? [];
      const baseDelayMs = 5 * 60 * 1000;
      let enriched = 0;

      for (const prospect of prospects) {
        const domain = extractHunterDomain(prospect.website!);
        if (!domain) continue;

        const result = await findEmailViaHunter(domain, env.HUNTER_API_KEY!);
        if (!result) continue;

        await db.prospectBusiness.update({
          where: { id: prospect.id },
          data: {
            email: result.email,
            emailSource: 'hunter',
            contactFirstName: result.firstName,
            contactLastName: result.lastName,
            contactTitle: result.position,
            contactLinkedIn: result.linkedin,
            emailVerificationScore: result.confidence,
            status: 'ENRICHED',
            nextFollowUpAt: new Date(Date.now() + baseDelayMs),
          },
        });

        // Queue the full outreach sequence
        await outreachSendQueue().add(
          `outreach:${prospect.id}:step1`,
          { prospectId: prospect.id, campaignId: id, channel: 'email', stepNumber: 1 },
          { delay: baseDelayMs },
        );
        for (const step of steps) {
          if (step.stepNumber <= 1) continue;
          const delayMs = baseDelayMs + step.delayHours * 60 * 60 * 1000;
          await outreachSendQueue().add(
            `outreach:${prospect.id}:step${step.stepNumber}`,
            { prospectId: prospect.id, campaignId: id, channel: 'email', stepNumber: step.stepNumber },
            { delay: delayMs },
          );
        }

        enriched++;
        log.info({ prospectId: prospect.id, domain, email: result.email }, 'Hunter enriched prospect');
      }

      log.info({ campaignId: id, enriched, checked: prospects.length }, 'Hunter enrichment complete');
      return reply.send({ enriched, checked: prospects.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err, campaignId: id }, 'Hunter enrichment failed');
      return reply.code(500).send({ error: msg });
    }
  });
}
