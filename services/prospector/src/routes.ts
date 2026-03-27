import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger, validate, NotFoundError } from '@embedo/utils';
import { db, Prisma } from '@embedo/db';
import { prospectDiscoveredQueue, outreachSendQueue, businessOnboardedQueue } from '@embedo/queue';
import { searchRestaurants, geocodeCity } from './scraper/geoapify.js';
import { sendColdEmail } from './outreach/email-sender.js';
import { generatePersonalizedEmail } from './outreach/ai-personalizer.js';
import { findEmailViaHunter, extractDomain as extractHunterDomain } from './scraper/hunter.js';
import { findEmailViaApollo, extractDomain as extractApolloDomain, discoverViaApollo } from './scraper/apollo.js';
import { isDuplicate } from './dedup/isDuplicate.js';
import { scoreWebsite } from './scraper/website-score.js';
import { env } from './config.js';

const log = createLogger('prospector:routes');

interface SequenceStep {
  stepNumber: number;
  delayHours: number;
  subject?: string;
  bodyHtml?: string;
}

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
  discoverySource: z.enum(['geoapify', 'apollo']).default('geoapify'),
  apolloIndustries: z.array(z.string()).optional(),       // Apollo keyword tags (e.g. ['restaurants'])
  apolloSicCodes: z.array(z.string()).optional(),         // SIC codes (e.g. ['5812'])
  apolloEmployeeRanges: z.array(z.string()).optional(),   // e.g. ['1-10', '11-50']
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

  // ─── AI generate follow-up / compose email ─────────────────────────────────
  app.post('/ai/generate-email', async (request, reply) => {
    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(400).send({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const { prospectId, prompt, type } = request.body as {
      prospectId?: string;
      prompt?: string;
      type?: 'followup' | 'compose' | 'rewrite';
    };

    // If prospectId given, load context
    let prospectContext = '';
    let prospectName = 'the business';
    if (prospectId) {
      const prospect = await db.prospectBusiness.findUnique({
        where: { id: prospectId },
        include: {
          campaign: { select: { name: true, targetCity: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 3, select: { subject: true, body: true, replyBody: true, stepNumber: true } },
        },
      });
      if (prospect) {
        prospectName = prospect.name;
        const city = (prospect.address as Record<string, string> | null)?.['city'] ?? prospect.campaign.targetCity;
        prospectContext = [
          `Business: ${prospect.name}`,
          `City: ${city}`,
          prospect.website ? `Website: ${prospect.website}` : null,
          prospect.email ? `Email: ${prospect.email}` : null,
          prospect.contactFirstName ? `Contact: ${prospect.contactFirstName} ${prospect.contactLastName ?? ''}` : null,
          prospect.googleRating ? `Google rating: ${prospect.googleRating} (${prospect.googleReviewCount} reviews)` : null,
          prospect.messages.length > 0 ? `\nPrevious emails sent (most recent first):\n${prospect.messages.map((m) =>
            `- Step ${m.stepNumber}: "${m.subject}"${m.replyBody ? ` → They replied: "${m.replyBody.slice(0, 100)}"` : ''}`
          ).join('\n')}` : null,
        ].filter(Boolean).join('\n');
      }
    }

    const typeInstructions: Record<string, string> = {
      followup: `Write a follow-up email for a cold outreach sequence. It should reference that you've reached out before without being pushy. Keep it short (2-3 sentences), casual, and conversational. Include a soft CTA.`,
      compose: `Write a personalized email to this business. It should feel like a genuine 1-on-1 message, not a mass email. Keep it short (2-3 paragraphs max), casual, and conversational.`,
      rewrite: `Rewrite/improve the email content based on the user's instructions below. Keep the same general intent but apply the requested changes.`,
    };

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are Jason Marchese, a data scientist who runs Embedo — an AI infrastructure platform for local businesses (restaurants, etc.). Embedo embeds a full AI ecosystem: voice receptionist, chatbot, lead engine, social media automation, surveys, website generation, SMS/email sequences — all woven into how the business already operates.

${typeInstructions[type ?? 'compose'] ?? typeInstructions['compose']}

${prospectContext ? `Business context:\n${prospectContext}\n` : ''}
${prompt ? `User instructions: ${prompt}\n` : ''}
Output format:
- Return a JSON object: { "subject": "...", "body": "..." }
- Subject: short, casual, no caps lock
- Body: plain text only (no HTML). Use \\n for paragraph breaks.
- Sign off as "Jason" only, no title or company
- Do NOT include greeting line — that gets added separately
- Keep it under 100 words for follow-ups, under 150 for compose`,
        }],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.code(500).send({ error: 'AI did not return valid JSON' });
      }

      const parsed = JSON.parse(jsonMatch[0]) as { subject: string; body: string };

      // Convert body to HTML
      const htmlBody = parsed.body
        .split(/\n{2,}/)
        .map((p: string) => p.trim())
        .filter(Boolean)
        .map((p: string) => `<p style="margin:0 0 12px;font-family:sans-serif;font-size:14px;color:#333;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('\n');

      return reply.send({
        subject: parsed.subject,
        bodyText: parsed.body,
        bodyHtml: htmlBody,
        prospectName,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err }, 'AI email generation failed');
      return reply.code(500).send({ error: msg });
    }
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
    if (parsed.discoverySource) createData['discoverySource'] = parsed.discoverySource;
    if (parsed.apolloIndustries || parsed.apolloEmployeeRanges || parsed.apolloSicCodes) {
      createData['apolloConfig'] = {
        industries: parsed.apolloIndustries ?? [],
        sicCodes: parsed.apolloSicCodes ?? [],
        employeeRanges: parsed.apolloEmployeeRanges ?? ['1-10'],
      };
    }
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
    const campaigns = await db.outboundCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { prospects: true } } },
    });

    // Fetch stats for each campaign in parallel
    const withStats = await Promise.all(campaigns.map(async (c) => {
      const [byStatus, openCount, replyCount] = await Promise.all([
        db.prospectBusiness.groupBy({
          by: ['status'],
          where: { campaignId: c.id },
          _count: { _all: true },
        }),
        db.outreachMessage.count({
          where: { prospect: { campaignId: c.id }, openedAt: { not: null } },
        }),
        db.outreachMessage.count({
          where: { prospect: { campaignId: c.id }, status: 'REPLIED' },
        }),
      ]);
      const stats = Object.fromEntries(byStatus.map((s: { status: string; _count: { _all: number } }) => [s.status, s._count._all]));
      const emailed = (stats['CONTACTED'] ?? 0) + (stats['OPENED'] ?? 0) + (stats['REPLIED'] ?? 0) + (stats['CONVERTED'] ?? 0);
      return {
        ...c,
        stats: {
          emailed,
          opened: openCount,
          replied: replyCount,
          converted: stats['CONVERTED'] ?? 0,
          openRate: emailed > 0 ? Math.round((openCount / emailed) * 100) : 0,
          replyRate: emailed > 0 ? Math.round((replyCount / emailed) * 100) : 0,
        },
      };
    }));

    return withStats;
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

  // ─── Clone campaign ────────────────────────────────────────────────────────
  app.post('/campaigns/:id/clone', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { targetCity?: string; targetState?: string; name?: string } | undefined;

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const cloneName = body?.name ?? `${campaign.name} (copy)`;
    const cloned = await db.outboundCampaign.create({
      data: {
        name: cloneName,
        targetCity: body?.targetCity ?? campaign.targetCity,
        targetState: body?.targetState ?? campaign.targetState,
        targetCountry: campaign.targetCountry,
        targetLat: campaign.targetLat,
        targetLon: campaign.targetLon,
        targetIndustry: campaign.targetIndustry,
        discoverySource: campaign.discoverySource,
        apolloConfig: campaign.apolloConfig ?? Prisma.DbNull,
        emailSubject: campaign.emailSubject,
        emailBodyHtml: campaign.emailBodyHtml,
        smsBody: campaign.smsBody,
        maxProspects: campaign.maxProspects,
        sequenceSteps: campaign.sequenceSteps ?? Prisma.DbNull,
        active: true,
      },
    });

    log.info({ originalId: id, clonedId: cloned.id, city: cloned.targetCity }, 'Campaign cloned');
    return reply.send(cloned);
  });

  // ─── Run campaign (scrape + queue) ────────────────────────────────────────
  app.post('/campaigns/:id/run', async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);
    if (!campaign.active) return reply.code(400).send({ error: 'Campaign is inactive' });

    const source = campaign.discoverySource ?? 'geoapify';

    if (source === 'apollo') {
      // ── Apollo Discovery Mode ──────────────────────────────────────────────
      if (!env.APOLLO_API_KEY) {
        return reply.code(400).send({ error: 'APOLLO_API_KEY not configured' });
      }

      const apolloConfig = (campaign.apolloConfig as { industries?: string[]; sicCodes?: string[]; employeeRanges?: string[] } | null) ?? {};
      const maxResults = campaign.maxProspects ?? 50;

      log.info({ campaignId: id, city: campaign.targetCity, apolloConfig, source: 'apollo' }, 'Running Apollo campaign');

      // Apollo discovery runs in background — return 202 immediately
      setImmediate(async () => {
        try {
          const apolloOpts: import('./scraper/apollo.js').ApolloDiscoveryOptions = {
            city: campaign.targetCity.split(',')[0]?.trim() ?? campaign.targetCity,
            industries: apolloConfig.industries ?? [],
            sicCodes: apolloConfig.sicCodes ?? [],
            employeeRanges: apolloConfig.employeeRanges ?? ['1-10'],
            maxResults,
          };
          if (campaign.targetState) apolloOpts.state = campaign.targetState;
          if (env.BRAVE_SEARCH_API_KEY) apolloOpts.braveApiKey = env.BRAVE_SEARCH_API_KEY;
          const prospects = await discoverViaApollo(env.APOLLO_API_KEY!, apolloOpts);

          let created = 0;
          let skippedDedup = 0;
          for (const p of prospects) {
            // Cross-source dedup — check by name, email, phone, website, placeId across ALL campaigns
            const dupCheck = await isDuplicate({
              name: p.organizationName,
              phone: p.organizationPhone ?? undefined,
              email: p.contact?.email ?? undefined,
              website: p.organizationDomain ? `https://${p.organizationDomain}` : undefined,
            });
            if (dupCheck.isDuplicate) { skippedDedup++; continue; }

            const hasEmail = !!p.contact?.email;

            await db.prospectBusiness.create({
              data: {
                campaignId: id,
                name: p.organizationName,
                address: {
                  city: p.organizationCity,
                  state: p.organizationState,
                  formatted: [p.organizationName, p.organizationCity, p.organizationState].filter(Boolean).join(', '),
                },
                phone: p.organizationPhone,
                phoneSource: p.organizationPhone ? 'apollo' : null,
                website: p.organizationDomain ? `https://${p.organizationDomain}` : null,
                email: p.contact?.email ?? null,
                emailSource: p.emailSource,
                contactFirstName: p.contact?.firstName ?? null,
                contactLastName: p.contact?.lastName ?? null,
                contactTitle: p.contact?.position ?? null,
                contactLinkedIn: p.contact?.linkedin ?? null,
                linkedinUrl: p.organizationLinkedin,
                facebookUrl: p.organizationFacebook,
                twitterUrl: p.organizationTwitter,
                logoUrl: p.organizationLogo,
                revenue: p.organizationRevenue,
                foundedYear: p.organizationFoundedYear,
                ...(p.organizationSicCodes.length > 0 || p.organizationNaicsCodes.length > 0
                  ? { industryCodes: { sic: p.organizationSicCodes, naics: p.organizationNaicsCodes } }
                  : {}),
                googlePlaceId: `apollo_${p.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${id.slice(-6)}`,
                status: hasEmail ? 'ENRICHED' : 'NEW',
              },
            });
            created++;

            // Score website in background (non-blocking)
            if (p.organizationDomain) {
              scoreWebsite(`https://${p.organizationDomain}`).then(async (result) => {
                const prospect = await db.prospectBusiness.findFirst({ where: { campaignId: id, name: p.organizationName }, select: { id: true } });
                if (prospect) {
                  await db.prospectBusiness.update({
                    where: { id: prospect.id },
                    data: {
                      websiteScore: result.score,
                      websiteScorecard: result.scorecard as object ?? undefined,
                      websiteScoringMethod: result.scoringMethod,
                      websiteHasChatbot: result.hasChatbot,
                      websiteChatbotProvider: result.chatbotProvider,
                      websiteScoredAt: new Date(),
                    },
                  });
                }
              }).catch(() => {});
            }
          }

          log.info({ campaignId: id, discovered: prospects.length, created, skippedDedup }, 'Apollo campaign complete');
        } catch (err) {
          log.error({ err, campaignId: id }, 'Apollo campaign failed');
        }
      });

      return reply.code(202).send({ message: 'Apollo campaign started', campaignId: id, city: campaign.targetCity, source: 'apollo' });
    }

    // ── Geoapify Discovery Mode (default) ──────────────────────────────────
    if (!env.GEOAPIFY_API_KEY) {
      return reply.code(400).send({ error: 'GEOAPIFY_API_KEY not configured' });
    }

    log.info({ campaignId: id, city: campaign.targetCity, source: 'geoapify' }, 'Running campaign');

    // Use stored coords if available (set at campaign creation via autocomplete).
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

  // ─── Send outreach for all enriched prospects in a campaign ───────────────
  app.post('/campaigns/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    // Find all ENRICHED prospects that haven't been contacted yet
    const prospects = await db.prospectBusiness.findMany({
      where: {
        campaignId: id,
        status: 'ENRICHED',
        email: { not: null },
      },
      select: { id: true },
    });

    if (prospects.length === 0) {
      return reply.code(400).send({ error: 'No enriched prospects ready to send' });
    }

    // Stagger sends: space emails 2-5 min apart to protect domain reputation.
    // During warmup keep campaigns small (5-10/day week 1, ramp over 4 weeks).
    const staggerMs = 3 * 60 * 1000; // 3 min between each email
    const baseDelayMs = 5 * 60 * 1000; // first email fires 5 min from now
    let queued = 0;
    for (const p of prospects) {
      const delay = baseDelayMs + queued * staggerMs;
      await outreachSendQueue().add(
        `outreach:${p.id}:step1`,
        { prospectId: p.id, campaignId: id, channel: 'email', stepNumber: 1 },
        { delay },
      );
      // Set nextFollowUpAt so the UI shows the countdown
      await db.prospectBusiness.update({
        where: { id: p.id },
        data: { nextFollowUpAt: new Date(Date.now() + delay) },
      });
      queued++;
    }

    log.info({ campaignId: id, queued }, 'Outreach queued for campaign');
    return reply.send({ ok: true, queued });
  });

  // ─── Campaign stats ───────────────────────────────────────────────────────
  app.get('/campaigns/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    try {
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
    } catch (err) {
      log.error({ err, campaignId: id }, 'Stats query failed — returning empty stats');
      const total = await db.prospectBusiness.count({ where: { campaignId: id } }).catch(() => 0);
      return reply.send({ campaignId: id, total, byStatus: {}, replies: 0 });
    }
  });

  // ─── List prospects (with reply filter) ───────────────────────────────────
  app.get('/campaigns/:id/prospects', async (request, reply) => {
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

    try {
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
    } catch (err) {
      log.error({ err, campaignId: id }, 'Prospects query failed');
      return reply.send({ items: [], total: 0, page: parseInt(page), pageSize: parseInt(pageSize) });
    }
  });

  // ─── Re-enrich prospects via Apollo ──────────────────────────────────────
  app.post('/campaigns/:id/re-enrich', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!env.APOLLO_API_KEY) {
      return reply.code(400).send({ success: false, error: 'APOLLO_API_KEY not configured' });
    }

    const prospects = await db.prospectBusiness.findMany({
      where: { campaignId: id, status: 'NEW' },
    });

    let enriched = 0;
    let failed = 0;

    for (const p of prospects) {
      try {
        const domain = p.website ? extractApolloDomain(p.website) : null;
        if (!domain) { failed++; continue; }

        const result = await findEmailViaApollo(domain, env.APOLLO_API_KEY!);
        if (result) {
          await db.prospectBusiness.update({
            where: { id: p.id },
            data: {
              email: result.email,
              emailSource: 'apollo',
              contactFirstName: result.firstName,
              contactLastName: result.lastName,
              contactTitle: result.position,
              contactLinkedIn: result.linkedin,
              status: 'ENRICHED',
            },
          });
          enriched++;
          log.info({ prospectId: p.id, email: result.email }, 'Re-enriched via Apollo');
        } else {
          failed++;
        }
        // Rate limit — Apollo allows ~5 req/sec on Basic
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        log.warn({ err, prospectId: p.id }, 'Re-enrich failed');
        failed++;
      }
    }

    return reply.send({ success: true, total: prospects.length, enriched, failed });
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
        status: 'PROVISIONING',
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

    // Fire business.onboarded event to provision services
    await businessOnboardedQueue().add(
      `onboard:${business.id}`,
      {
        businessId: business.id,
        businessName: business.name,
        businessType: business.type,
        ...(business.email != null ? { email: business.email } : {}),
        ...(business.phone != null ? { phone: business.phone } : {}),
      },
      {
        jobId: `onboard:${business.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );

    log.info({ prospectId: id, businessId: business.id }, 'Prospect converted to business and onboarding started');
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
        campaign: { select: { id: true, name: true, targetCity: true, targetIndustry: true, emailSubject: true, emailBodyHtml: true, sequenceSteps: true } },
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

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL MANAGER — cross-campaign email overview
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Email stats (aggregate across all campaigns) ──────────────────────────
  app.get('/emails/stats', async () => {
    const [totalContacted, totalMessages, byStatus, byChannel] = await Promise.all([
      db.prospectBusiness.count({
        where: { status: { in: ['CONTACTED', 'OPENED', 'REPLIED', 'MEETING_BOOKED', 'CONVERTED', 'BOUNCED', 'UNSUBSCRIBED'] as never[] } },
      }),
      db.outreachMessage.count(),
      db.outreachMessage.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      db.prospectBusiness.groupBy({
        by: ['status'],
        where: { status: { in: ['CONTACTED', 'OPENED', 'REPLIED', 'MEETING_BOOKED', 'CONVERTED', 'BOUNCED', 'UNSUBSCRIBED'] as never[] } },
        _count: { _all: true },
      }),
    ]);

    const msgStats = Object.fromEntries(byStatus.map((s: { status: string; _count: { _all: number } }) => [s.status, s._count._all]));
    const prospectStats = Object.fromEntries(byChannel.map((s: { status: string; _count: { _all: number } }) => [s.status, s._count._all]));

    const sent = (msgStats['SENT'] ?? 0) + (msgStats['DELIVERED'] ?? 0) + (msgStats['OPENED'] ?? 0) + (msgStats['REPLIED'] ?? 0);
    const opened = (msgStats['OPENED'] ?? 0) + (msgStats['REPLIED'] ?? 0);
    const replied = prospectStats['REPLIED'] ?? 0;
    const meetingBooked = prospectStats['MEETING_BOOKED'] ?? 0;
    const bounced = prospectStats['BOUNCED'] ?? 0;

    return {
      totalContacted,
      totalMessages,
      sent,
      opened,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      replied,
      meetingBooked,
      replyRate: totalContacted > 0 ? Math.round((replied / totalContacted) * 100) : 0,
      bounced,
      bounceRate: totalContacted > 0 ? Math.round((bounced / totalContacted) * 100) : 0,
    };
  });

  // ─── All emailed businesses (master table) ────────────────────────────────
  app.get('/emails/all', async (request) => {
    const { search, status, page = '1', pageSize = '50' } = request.query as Record<string, string>;

    const where: Record<string, unknown> = {
      messages: { some: {} }, // only prospects that have at least one message
    };

    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactFirstName: { contains: search, mode: 'insensitive' } },
        { contactLastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      if (status.includes(',')) {
        where['status'] = { in: status.split(',') };
      } else {
        where['status'] = status;
      }
    }

    const [items, total] = await Promise.all([
      db.prospectBusiness.findMany({
        where: where as never,
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { updatedAt: 'desc' },
        include: {
          campaign: { select: { id: true, name: true, targetCity: true, targetIndustry: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, stepNumber: true, subject: true, sentAt: true, openedAt: true, repliedAt: true, replyBody: true, replyCategory: true },
          },
        },
      }),
      db.prospectBusiness.count({ where: where as never }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // ─── Compose & send custom email to a prospect ─────────────────────────────
  const composeSchema = z.object({
    subject: z.string().min(1),
    bodyHtml: z.string().min(1),
  });

  app.post('/prospects/:id/compose', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!env.SENDGRID_API_KEY || env.SENDGRID_API_KEY.startsWith('SG....')) {
      return reply.code(400).send({ error: 'SENDGRID_API_KEY not configured' });
    }

    const parsed = validate(composeSchema, request.body);
    const prospect = await db.prospectBusiness.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!prospect) throw new NotFoundError('Prospect', id);
    if (!prospect.email) return reply.code(400).send({ error: 'Prospect has no email address' });

    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(env.SENDGRID_API_KEY);

      const trackingPixelId = randomUUID();
      const fromEmail = env.SENDGRID_FROM_EMAIL ?? 'jason@embedo.io';
      const fromName = process.env['SENDGRID_FROM_NAME'] ?? 'Jason at Embedo';
      const replyTo = env.REPLY_TRACKING_EMAIL ?? fromEmail;

      const pixelUrl = `${env.API_BASE_URL}/track/open/${trackingPixelId}`;
      const htmlWithPixel = `${parsed.bodyHtml}\n<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="">`;

      const [response] = await sgMail.default.send({
        to: prospect.email,
        from: { email: fromEmail, name: fromName },
        replyTo,
        subject: parsed.subject,
        html: htmlWithPixel,
        customArgs: { trackingPixelId, prospectId: prospect.id },
      });

      const messageId = (response.headers as Record<string, string>)['x-message-id'] ?? trackingPixelId;

      // Get the highest step number to set the next one
      const lastMsg = await db.outreachMessage.findFirst({
        where: { prospectId: id },
        orderBy: { stepNumber: 'desc' },
        select: { stepNumber: true },
      });
      const nextStep = (lastMsg?.stepNumber ?? 0) + 1;

      await db.outreachMessage.create({
        data: {
          prospectId: id,
          channel: 'EMAIL',
          subject: parsed.subject,
          body: htmlWithPixel,
          status: 'SENT',
          stepNumber: nextStep,
          sentAt: new Date(),
          externalId: messageId,
          trackingPixelId,
        },
      });

      if (prospect.status === 'NEW' || prospect.status === 'ENRICHED') {
        await db.prospectBusiness.update({
          where: { id },
          data: { status: 'CONTACTED' },
        });
      }

      log.info({ prospectId: id, subject: parsed.subject }, 'Custom email composed and sent');
      return reply.send({ ok: true, messageId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ prospectId: id, err }, 'Compose email failed');
      return reply.code(500).send({ error: msg });
    }
  });

  // ─── Cancel pending follow-ups for a prospect ──────────────────────────────
  app.patch('/prospects/:id/cancel-followups', async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await db.prospectBusiness.findUnique({ where: { id } });
    if (!prospect) throw new NotFoundError('Prospect', id);

    await db.prospectBusiness.update({
      where: { id },
      data: { nextFollowUpAt: null },
    });

    log.info({ prospectId: id }, 'Follow-up sequence cancelled for prospect');
    return reply.send({ ok: true, message: 'Follow-up sequence cancelled' });
  });

  // ─── Edit a specific sequence step on the campaign ─────────────────────────
  const editStepSchema = z.object({
    stepNumber: z.number().int().positive(),
    subject: z.string().min(2).optional(),
    bodyHtml: z.string().min(10).optional(),
    delayHours: z.number().min(0).optional(),
  });

  app.patch('/campaigns/:id/sequence-step', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = validate(editStepSchema, request.body);

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const steps = (campaign.sequenceSteps as SequenceStep[] | null) ?? [];
    const stepIndex = steps.findIndex((s: SequenceStep) => s.stepNumber === parsed.stepNumber);

    if (stepIndex === -1) {
      return reply.code(404).send({ error: `Step ${parsed.stepNumber} not found in sequence` });
    }

    // Merge updates into the step
    if (parsed.subject !== undefined) steps[stepIndex]!.subject = parsed.subject;
    if (parsed.bodyHtml !== undefined) steps[stepIndex]!.bodyHtml = parsed.bodyHtml;
    if (parsed.delayHours !== undefined) steps[stepIndex]!.delayHours = parsed.delayHours;

    await db.outboundCampaign.update({
      where: { id },
      data: { sequenceSteps: steps as never },
    });

    log.info({ campaignId: id, stepNumber: parsed.stepNumber }, 'Sequence step updated');
    return reply.send({ ok: true, step: steps[stepIndex] });
  });

  // ─── Remove a specific sequence step from the campaign ─────────────────────
  app.delete('/campaigns/:id/sequence-step/:stepNumber', async (request, reply) => {
    const { id, stepNumber } = request.params as { id: string; stepNumber: string };
    const stepNum = parseInt(stepNumber);

    const campaign = await db.outboundCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);

    const steps = (campaign.sequenceSteps as SequenceStep[] | null) ?? [];
    const filtered = steps.filter((s: SequenceStep) => s.stepNumber !== stepNum);

    if (filtered.length === steps.length) {
      return reply.code(404).send({ error: `Step ${stepNum} not found` });
    }

    // Renumber remaining steps
    filtered.forEach((s: SequenceStep, i: number) => { s.stepNumber = i + 2; }); // steps start at 2 (1 is cold email)

    await db.outboundCampaign.update({
      where: { id },
      data: { sequenceSteps: filtered as never },
    });

    log.info({ campaignId: id, removedStep: stepNum }, 'Sequence step removed');
    return reply.send({ ok: true, remainingSteps: filtered });
  });

  // ─── Delete a prospect ────────────────────────────────────────────────────
  app.delete('/prospects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const prospect = await db.prospectBusiness.findUnique({ where: { id } });
    if (!prospect) throw new NotFoundError('Prospect', id);

    // Delete messages first (FK constraint)
    await db.outreachMessage.deleteMany({ where: { prospectId: id } });
    await db.prospectBusiness.delete({ where: { id } });

    log.info({ prospectId: id, name: prospect.name }, 'Prospect deleted');
    return reply.send({ ok: true });
  });

  // ─── Seed a test lead (dev only) ──────────────────────────────────────────
  app.post('/seed/test-lead', async (_request, reply) => {
    // Find or create a test campaign
    let campaign = await db.outboundCampaign.findFirst({
      where: { name: 'Test Campaign — Seed' },
    });

    if (!campaign) {
      campaign = await db.outboundCampaign.create({
        data: {
          name: 'Test Campaign — Seed',
          targetCity: 'Miami',
          targetState: 'FL',
          targetCountry: 'US',
          targetIndustry: 'RESTAURANT',
          emailSubject: 'Quick question about {{businessName}}',
          emailBodyHtml: '<p>Hey {{businessName}},</p><p>Wanted to reach out about automating your front-of-house operations.</p><p>Jason</p>',
          active: true,
        },
      });
    }

    // Create a test prospect that looks like a real replied lead
    const prospect = await db.prospectBusiness.create({
      data: {
        campaignId: campaign.id,
        name: 'La Rosa Ristorante',
        email: 'marco@larosamiami.com',
        phone: '+1 (305) 555-0142',
        website: 'https://larosamiami.com',
        emailSource: 'apollo',
        contactFirstName: 'Marco',
        contactLastName: 'DeLuca',
        contactTitle: 'Owner',
        googleRating: 4.7,
        googleReviewCount: 328,
        status: 'REPLIED',
        address: { street: '1420 Collins Ave', city: 'Miami Beach', state: 'FL', zip: '33139' },
      },
    });

    // Create the cold email that was "sent"
    await db.outreachMessage.create({
      data: {
        prospectId: prospect.id,
        channel: 'EMAIL',
        subject: 'Quick question about La Rosa Ristorante',
        body: '<p>Hey La Rosa Ristorante,</p><p>I noticed you have great reviews on Google (4.7 stars!) but I couldn\'t find an easy way to book a table or ask a question after hours. A lot of restaurants in Miami Beach are losing 20-30% of potential reservations from missed calls.</p><p>We built an AI system that handles phone calls, takes reservations, and captures leads 24/7 — all sounding completely natural. Would it be worth a quick chat to see if it\'d work for La Rosa?</p><p>Jason</p>',
        status: 'DELIVERED',
        stepNumber: 1,
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        openedAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000), // opened 12h later
        trackingPixelId: randomUUID(),
      },
    });

    // Create the reply
    await db.outreachMessage.create({
      data: {
        prospectId: prospect.id,
        channel: 'EMAIL',
        subject: 'Re: Quick question about La Rosa Ristorante',
        body: '',
        status: 'REPLIED',
        stepNumber: 1,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        repliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        replyBody: 'Hey Jason, yeah we definitely lose reservations from missed calls especially on weekends. How does the AI phone thing work exactly? Can it handle our specials and private dining inquiries? Would love to learn more. — Marco',
        replyCategory: 'POSITIVE',
        trackingPixelId: randomUUID(),
      },
    });

    log.info({ prospectId: prospect.id, campaignId: campaign.id }, 'Test lead seeded');
    return reply.send({ ok: true, prospectId: prospect.id, campaignId: campaign.id });
  });

  // ─── Analytics ─────────────────────────────────────────────────────────────
  app.get('/analytics', async () => {
    // 1. City performance ranking
    const campaigns = await db.outboundCampaign.findMany({
      select: {
        id: true,
        name: true,
        targetCity: true,
        targetState: true,
        emailSubject: true,
        emailBodyHtml: true,
        createdAt: true,
        _count: { select: { prospects: true } },
      },
    });

    const cityStats: Record<string, { city: string; state: string | null; campaigns: number; prospects: number; emailed: number; opened: number; replied: number; converted: number }> = {};
    const templateStats: Array<{ campaignId: string; name: string; city: string; subject: string; bodyPreview: string; emailed: number; opened: number; replied: number; openRate: number; replyRate: number; createdAt: string }> = [];

    for (const c of campaigns) {
      const [byStatus, openCount, replyCount] = await Promise.all([
        db.prospectBusiness.groupBy({
          by: ['status'],
          where: { campaignId: c.id },
          _count: { _all: true },
        }),
        db.outreachMessage.count({
          where: { prospect: { campaignId: c.id }, openedAt: { not: null } },
        }),
        db.outreachMessage.count({
          where: { prospect: { campaignId: c.id }, status: 'REPLIED' },
        }),
      ]);

      const stats = Object.fromEntries(byStatus.map((s: { status: string; _count: { _all: number } }) => [s.status, s._count._all]));
      const emailed = (stats['CONTACTED'] ?? 0) + (stats['OPENED'] ?? 0) + (stats['REPLIED'] ?? 0) + (stats['CONVERTED'] ?? 0);

      // City aggregation
      const cityKey = `${c.targetCity}|${c.targetState ?? ''}`;
      if (!cityStats[cityKey]) {
        cityStats[cityKey] = { city: c.targetCity, state: c.targetState, campaigns: 0, prospects: 0, emailed: 0, opened: 0, replied: 0, converted: 0 };
      }
      cityStats[cityKey].campaigns++;
      cityStats[cityKey].prospects += c._count.prospects;
      cityStats[cityKey].emailed += emailed;
      cityStats[cityKey].opened += openCount;
      cityStats[cityKey].replied += replyCount;
      cityStats[cityKey].converted += stats['CONVERTED'] ?? 0;

      // Template stats
      const bodyPlain = c.emailBodyHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      templateStats.push({
        campaignId: c.id,
        name: c.name,
        city: c.targetCity,
        subject: c.emailSubject,
        bodyPreview: bodyPlain.length > 120 ? bodyPlain.slice(0, 120) + '...' : bodyPlain,
        emailed,
        opened: openCount,
        replied: replyCount,
        openRate: emailed > 0 ? Math.round((openCount / emailed) * 100) : 0,
        replyRate: emailed > 0 ? Math.round((replyCount / emailed) * 100) : 0,
        createdAt: c.createdAt.toISOString(),
      });
    }

    // 2. Send time analysis — which hours get the most opens
    const openedMessages = await db.outreachMessage.findMany({
      where: { openedAt: { not: null } },
      select: { sentAt: true, openedAt: true },
    });

    const hourlyOpens: Record<number, { sent: number; opened: number }> = {};
    for (let h = 0; h < 24; h++) hourlyOpens[h] = { sent: 0, opened: 0 };

    const allSent = await db.outreachMessage.findMany({
      where: { sentAt: { not: null } },
      select: { sentAt: true },
    });

    for (const msg of allSent) {
      if (msg.sentAt) {
        const hour = new Date(msg.sentAt).getUTCHours();
        hourlyOpens[hour]!.sent++;
      }
    }
    for (const msg of openedMessages) {
      if (msg.sentAt) {
        const hour = new Date(msg.sentAt).getUTCHours();
        hourlyOpens[hour]!.opened++;
      }
    }

    const sendTimeAnalysis = Object.entries(hourlyOpens)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        sent: data.sent,
        opened: data.opened,
        openRate: data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0,
      }))
      .sort((a, b) => a.hour - b.hour);

    // 3. Overall totals
    const [totalProspects, totalEmailed, totalOpened, totalReplied, totalConverted, totalBounced] = await Promise.all([
      db.prospectBusiness.count(),
      db.prospectBusiness.count({ where: { status: { in: ['CONTACTED', 'OPENED', 'REPLIED', 'CONVERTED'] } } }),
      db.outreachMessage.count({ where: { openedAt: { not: null } } }),
      db.outreachMessage.count({ where: { status: 'REPLIED' } }),
      db.prospectBusiness.count({ where: { status: 'CONVERTED' } }),
      db.prospectBusiness.count({ where: { status: 'BOUNCED' } }),
    ]);

    return {
      totals: {
        prospects: totalProspects,
        emailed: totalEmailed,
        opened: totalOpened,
        replied: totalReplied,
        converted: totalConverted,
        bounced: totalBounced,
        openRate: totalEmailed > 0 ? Math.round((totalOpened / totalEmailed) * 100) : 0,
        replyRate: totalEmailed > 0 ? Math.round((totalReplied / totalEmailed) * 100) : 0,
      },
      cityRanking: Object.values(cityStats)
        .map((c) => ({
          ...c,
          openRate: c.emailed > 0 ? Math.round((c.opened / c.emailed) * 100) : 0,
          replyRate: c.emailed > 0 ? Math.round((c.replied / c.emailed) * 100) : 0,
        }))
        .sort((a, b) => b.replyRate - a.replyRate),
      templatePerformance: templateStats.sort((a, b) => b.replyRate - a.replyRate),
      sendTimeAnalysis,
    };
  });

  // ── Notifications ──────────────────────────────────────────────────────
  app.get('/notifications', async (_request, reply) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [replies, bounces, meetingsBooked, recentOpens] = await Promise.all([
      db.outreachMessage.findMany({
        where: { status: 'REPLIED', updatedAt: { gte: since } },
        include: { prospect: { select: { name: true, email: true, campaignId: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      db.outreachMessage.findMany({
        where: { status: 'BOUNCED', updatedAt: { gte: since } },
        include: { prospect: { select: { name: true, email: true, campaignId: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      db.prospectBusiness.findMany({
        where: { status: 'MEETING_BOOKED', updatedAt: { gte: since } },
        select: { id: true, name: true, email: true, campaignId: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      db.outreachMessage.findMany({
        where: { status: 'OPENED', openedAt: { gte: last24h } },
        include: { prospect: { select: { name: true, email: true, campaignId: true } } },
        orderBy: { openedAt: 'desc' },
        take: 50,
      }),
    ]);

    const notifications = [
      ...replies.map((r) => ({
        id: r.id,
        type: 'reply' as const,
        title: `Reply from ${r.prospect.name}`,
        description: r.subject ? `Re: ${r.subject}` : 'Email reply received',
        prospectName: r.prospect.name,
        campaignId: r.prospect.campaignId,
        createdAt: r.updatedAt.toISOString(),
      })),
      ...bounces.map((b) => ({
        id: b.id,
        type: 'bounce' as const,
        title: `Bounce: ${b.prospect.name}`,
        description: b.prospect.email ? `Email to ${b.prospect.email} bounced` : 'Email bounced',
        prospectName: b.prospect.name,
        campaignId: b.prospect.campaignId,
        createdAt: b.updatedAt.toISOString(),
      })),
      ...meetingsBooked.map((m) => ({
        id: m.id,
        type: 'meeting_booked' as const,
        title: `Meeting booked: ${m.name}`,
        description: m.email ? `${m.name} (${m.email})` : m.name,
        prospectName: m.name,
        campaignId: m.campaignId,
        createdAt: m.updatedAt.toISOString(),
      })),
      ...recentOpens.map((o) => ({
        id: o.id,
        type: 'open' as const,
        title: `Opened by ${o.prospect.name}`,
        description: o.subject ? `Opened: ${o.subject}` : 'Email opened',
        prospectName: o.prospect.name,
        campaignId: o.prospect.campaignId,
        createdAt: (o.openedAt ?? o.updatedAt).toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return reply.send(notifications);
  });

  // ── Daily Report ───────────────────────────────────────────────────────
  app.get('/daily-report', async (_request, reply) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Gather stats for last 24 hours
    const [
      newProspectsDiscovered,
      emailsSent,
      opens,
      repliesCount,
      bouncesCount,
      meetingsBookedCount,
      activeCampaigns,
    ] = await Promise.all([
      db.prospectBusiness.count({ where: { createdAt: { gte: yesterday } } }),
      db.outreachMessage.count({ where: { sentAt: { gte: yesterday } } }),
      db.outreachMessage.count({ where: { openedAt: { gte: yesterday } } }),
      db.outreachMessage.count({ where: { status: 'REPLIED', updatedAt: { gte: yesterday } } }),
      db.outreachMessage.count({ where: { status: 'BOUNCED', updatedAt: { gte: yesterday } } }),
      db.prospectBusiness.count({ where: { status: 'MEETING_BOOKED', updatedAt: { gte: yesterday } } }),
      db.outboundCampaign.findMany({
        where: { active: true },
        select: { id: true, name: true, targetCity: true },
      }),
    ]);

    const stats = {
      newProspectsDiscovered,
      emailsSent,
      opens,
      replies: repliesCount,
      bounces: bouncesCount,
      meetingsBooked: meetingsBookedCount,
    };

    // Per-campaign stats for last 24 hours
    const campaigns = await Promise.all(
      activeCampaigns.map(async (c) => {
        const [sent, campaignOpens, campaignReplies] = await Promise.all([
          db.outreachMessage.count({ where: { prospect: { campaignId: c.id }, sentAt: { gte: yesterday } } }),
          db.outreachMessage.count({ where: { prospect: { campaignId: c.id }, openedAt: { gte: yesterday } } }),
          db.outreachMessage.count({ where: { prospect: { campaignId: c.id }, status: 'REPLIED', updatedAt: { gte: yesterday } } }),
        ]);
        return { name: c.name, sent, opens: campaignOpens, replies: campaignReplies };
      })
    );

    // Try to generate AI summary if Anthropic key is available
    let aiSummary: string | null = null;
    const anthropicKey = process.env['ANTHROPIC_API_KEY'];
    if (anthropicKey) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey: anthropicKey });
        const prompt = `You are an outbound sales analytics assistant for Embedo, a B2B SaaS platform. Generate a brief executive summary (3-5 bullet points) with recommendations based on these last 24-hour stats:

New prospects discovered: ${stats.newProspectsDiscovered}
Emails sent: ${stats.emailsSent}
Opens: ${stats.opens}
Replies: ${stats.replies}
Bounces: ${stats.bounces}
Meetings booked: ${stats.meetingsBooked}

Campaign breakdown (last 24h):
${campaigns.map((c) => `- ${c.name}: ${c.sent} sent, ${c.opens} opens, ${c.replies} replies`).join('\n')}

Include:
1. What campaigns are performing well
2. What to push more / scale up
3. What to reduce or adjust

Keep it concise and actionable. Use plain text, no markdown headers.`;

        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        });
        const textBlock = response.content.find((b) => b.type === 'text');
        if (textBlock && textBlock.type === 'text') aiSummary = textBlock.text;
      } catch (err) {
        log.warn({ err }, 'Failed to generate AI daily report');
      }
    }

    return reply.send({
      generatedAt: now.toISOString(),
      period: '24h',
      stats,
      campaigns,
      aiSummary,
    });
  });
}
