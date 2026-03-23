import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import Anthropic from '@anthropic-ai/sdk';

const log = createLogger('api:competitors');

export async function competitorRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /businesses/:id/competitors
   * List all competitors for a business, including their latest report.
   */
  app.get<{ Params: { id: string } }>(
    '/businesses/:id/competitors',
    async (request, _reply) => {
      const { id } = request.params;

      const competitors = await db.competitor.findMany({
        where: { businessId: id },
        include: {
          reports: {
            orderBy: { reportDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, competitors };
    },
  );

  /**
   * POST /businesses/:id/competitors
   * Create a competitor for a business.
   */
  app.post<{ Params: { id: string } }>(
    '/businesses/:id/competitors',
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as {
        name?: string;
        googleMapsUrl?: string;
        yelpUrl?: string;
        websiteUrl?: string;
        instagramUrl?: string;
        notes?: string;
      };

      if (!body.name?.trim()) {
        return reply.code(400).send({ success: false, error: 'name is required' });
      }

      // Verify business exists
      const business = await db.business.findUnique({ where: { id } });
      if (!business) throw new NotFoundError('Business', id);

      const competitor = await db.competitor.create({
        data: {
          businessId: id,
          name: body.name.trim(),
          googleMapsUrl: body.googleMapsUrl?.trim() || null,
          yelpUrl: body.yelpUrl?.trim() || null,
          websiteUrl: body.websiteUrl?.trim() || null,
          instagramUrl: body.instagramUrl?.trim() || null,
          notes: body.notes?.trim() || null,
        },
      });

      log.info({ competitorId: competitor.id, businessId: id }, 'Competitor created');
      return reply.code(201).send({ success: true, competitor });
    },
  );

  /**
   * DELETE /competitors/:id
   * Delete a competitor (cascades reports).
   */
  app.delete<{ Params: { id: string } }>(
    '/competitors/:id',
    async (request, _reply) => {
      const { id } = request.params;

      const existing = await db.competitor.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Competitor', id);

      await db.competitor.delete({ where: { id } });

      log.info({ competitorId: id }, 'Competitor deleted');
      return { success: true };
    },
  );

  /**
   * POST /competitors/:id/analyze
   * AI-powered competitor analysis using Claude.
   */
  app.post<{ Params: { id: string } }>(
    '/competitors/:id/analyze',
    async (request, reply) => {
      const { id } = request.params;

      const competitor = await db.competitor.findUnique({
        where: { id },
        include: { business: { select: { id: true, name: true, type: true } } },
      });
      if (!competitor) throw new NotFoundError('Competitor', id);

      let websiteHtml = '';
      if (competitor.websiteUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(competitor.websiteUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Embedo Competitor Analyzer/1.0' },
          });
          clearTimeout(timeout);
          const text = await res.text();
          // Truncate to avoid token limits
          websiteHtml = text.slice(0, 15000);
        } catch (err) {
          log.warn({ competitorId: id, url: competitor.websiteUrl, err }, 'Failed to fetch competitor website');
          websiteHtml = '(Could not fetch website)';
        }
      }

      const anthropic = new Anthropic();
      const prompt = `Analyze this competitor for a ${competitor.business.type} business called "${competitor.business.name}".
Competitor name: ${competitor.name}
Website URL: ${competitor.websiteUrl ?? 'N/A'}
Google Maps: ${competitor.googleMapsUrl ?? 'N/A'}
Yelp: ${competitor.yelpUrl ?? 'N/A'}
Instagram: ${competitor.instagramUrl ?? 'N/A'}
Website content: ${websiteHtml || '(No website provided)'}

Generate:
1) A brief summary of the competitor (2-3 sentences)
2) Key highlights (new offerings, pricing, strengths, weaknesses) as an array
3) Overall sentiment about the competitor's market position

Return JSON only, no markdown: { "summary": "string", "highlights": [{ "type": "new_review" | "social_post" | "menu_change" | "price_change", "detail": "string" }], "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" }`;

      try {
        const message = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });

        const textBlock = message.content.find((b) => b.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          return reply.code(500).send({ success: false, error: 'No text in AI response' });
        }

        let parsed: { summary: string; highlights: Array<{ type: string; detail: string }>; sentiment: string };
        try {
          parsed = JSON.parse(textBlock.text);
        } catch {
          // Try extracting JSON from the response
          const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            return reply.code(500).send({ success: false, error: 'Failed to parse AI response' });
          }
        }

        const report = await db.competitorReport.create({
          data: {
            competitorId: id,
            summary: parsed.summary,
            highlights: parsed.highlights as unknown as Record<string, unknown>[],
            sentiment: parsed.sentiment,
            rawData: { websiteHtml: websiteHtml.slice(0, 5000) },
          },
        });

        log.info({ competitorId: id, reportId: report.id }, 'Competitor analysis report created');
        return reply.code(201).send({ success: true, report });
      } catch (err) {
        log.error({ competitorId: id, err }, 'Failed to analyze competitor');
        return reply.code(500).send({ success: false, error: 'Failed to generate competitor analysis' });
      }
    },
  );

  /**
   * GET /competitors/:id/reports
   * List reports for a competitor (last 10, ordered by date desc).
   */
  app.get<{ Params: { id: string } }>(
    '/competitors/:id/reports',
    async (request, _reply) => {
      const { id } = request.params;

      const existing = await db.competitor.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Competitor', id);

      const reports = await db.competitorReport.findMany({
        where: { competitorId: id },
        orderBy: { reportDate: 'desc' },
        take: 10,
      });

      return { success: true, reports };
    },
  );
}
