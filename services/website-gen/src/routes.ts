import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { NotFoundError, ValidationError } from '@embedo/utils';
import { scrapeWebsite } from './scraper/scrape.js';
import { generateWebsiteCopy } from './generator/content.js';
import { renderRestaurantPremium } from './templates/restaurant/premium.js';
import { deployToVercel } from './deploy/vercel.js';
import { env } from './config.js';
import type { ColorScheme, FontPairing } from './templates/restaurant/premium.js';

export async function websiteRoutes(app: FastifyInstance) {
  // POST /scrape — scrape an existing website and return extracted info
  app.post<{ Body: { url: string } }>('/scrape', async (req, reply) => {
    const { url } = req.body;
    if (!url) throw new ValidationError('url is required', {});
    if (!env.ANTHROPIC_API_KEY) return reply.send({ data: {} });
    const data = await scrapeWebsite(url, env.ANTHROPIC_API_KEY);
    return reply.send({ data });
  });

  // POST /generate — generate + deploy a website
  app.post<{
    Body: {
      businessId: string;
      businessName: string;
      tagline?: string;
      description?: string;
      cuisine?: string;
      phone?: string;
      address?: string;
      city?: string;
      hours?: Record<string, string>;
      menuItems?: Array<{ name: string; description?: string; price?: string; category?: string }>;
      galleryImages?: string[];
      heroImage?: string;
      bookingUrl?: string;
      colorScheme: ColorScheme;
      fontPairing: FontPairing;
      existingWebsiteUrl?: string;
      chatbotEnabled?: boolean;
    };
  }>('/generate', async (req, reply) => {
    const body = req.body;
    if (!body.businessId || !body.businessName) {
      throw new ValidationError('businessId and businessName are required', {});
    }

    // Scrape existing site if URL provided
    let scraped = {};
    if (body.existingWebsiteUrl && env.ANTHROPIC_API_KEY) {
      scraped = await scrapeWebsite(body.existingWebsiteUrl, env.ANTHROPIC_API_KEY);
    }

    // Merge scraped data with user-provided data (user inputs take precedence)
    const merged = { ...scraped, ...body };

    // Generate AI copy
    let copy = {
      heroHeading: `Welcome to ${body.businessName}`,
      heroSubheading: body.tagline ?? body.description ?? '',
      aboutHeading: 'Our Story',
      aboutBody: body.description ?? '',
      ctaText: 'Reserve a Table',
      tagline: body.tagline ?? '',
    };
    if (env.ANTHROPIC_API_KEY) {
      copy = await generateWebsiteCopy({ ...merged, businessName: body.businessName }, env.ANTHROPIC_API_KEY);
    }

    const s = scraped as Record<string, unknown>;
    // Render HTML
    const html = renderRestaurantPremium({
      businessName: body.businessName,
      tagline: body.tagline ?? (s['tagline'] as string | undefined),
      description: body.description ?? (s['description'] as string | undefined),
      cuisine: body.cuisine ?? (s['cuisine'] as string | undefined),
      phone: body.phone ?? (s['phone'] as string | undefined),
      address: body.address ?? (s['address'] as string | undefined),
      city: body.city ?? (s['city'] as string | undefined),
      hours: body.hours ?? (s['hours'] as Record<string, string> | undefined),
      menuItems: body.menuItems ?? (s['menuItems'] as typeof body.menuItems | undefined),
      galleryImages: body.galleryImages ?? (s['imageUrls'] as string[] | undefined),
      heroImage: body.heroImage,
      bookingUrl: body.bookingUrl ?? (s['bookingUrl'] as string | undefined),
      colorScheme: body.colorScheme ?? 'midnight',
      fontPairing: body.fontPairing ?? 'modern',
      heroHeading: copy.heroHeading,
      heroSubheading: copy.heroSubheading,
      aboutHeading: copy.aboutHeading,
      aboutBody: copy.aboutBody,
      ctaText: copy.ctaText,
      chatbotEnabled: body.chatbotEnabled ?? false,
      chatbotBusinessId: body.businessId,
    });

    // Create or update GeneratedWebsite record
    const existing = await db.generatedWebsite.findFirst({ where: { businessId: body.businessId } });
    const slug = `embedo-${body.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}-${body.businessId.slice(-6)}`;

    let websiteRecord = existing;
    if (!websiteRecord) {
      websiteRecord = await db.generatedWebsite.create({
        data: {
          businessId: body.businessId,
          template: 'restaurant-premium',
          config: body as object,
          status: 'GENERATING',
          slug,
        },
      });
    } else {
      websiteRecord = await db.generatedWebsite.update({
        where: { id: existing!.id },
        data: { status: 'GENERATING', config: body as object },
      });
    }

    // Deploy to Vercel
    let deployedUrl = '';
    let deploymentId = '';
    let vercelProjectId = '';

    if (env.VERCEL_API_TOKEN) {
      const deployed = await deployToVercel({ projectName: slug, html, businessId: body.businessId });
      deployedUrl = deployed.url;
      deploymentId = deployed.deploymentId;
      vercelProjectId = deployed.projectId;
    } else {
      // No Vercel token — return the HTML for preview only
      deployedUrl = '';
    }

    await db.generatedWebsite.update({
      where: { id: websiteRecord.id },
      data: {
        status: deployedUrl ? 'LIVE' : 'GENERATING',
        deploymentUrl: deployedUrl || null,
        vercelDeploymentId: deploymentId || null,
        vercelProjectId: vercelProjectId || null,
      },
    });

    return reply.send({
      success: true,
      websiteId: websiteRecord.id,
      url: deployedUrl,
      html, // Always return HTML for preview iframe
    });
  });

  // GET /websites/:businessId — get current website for a business
  app.get<{ Params: { businessId: string } }>('/websites/:businessId', async (req, reply) => {
    const website = await db.generatedWebsite.findFirst({
      where: { businessId: req.params.businessId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!website) throw new NotFoundError('GeneratedWebsite', req.params.businessId);
    return reply.send({ data: website });
  });

  // GET /preview/:websiteId — return raw HTML for iframe preview
  app.get<{ Params: { websiteId: string } }>('/preview/:websiteId', async (req, reply) => {
    const website = await db.generatedWebsite.findUnique({ where: { id: req.params.websiteId } });
    if (!website) throw new NotFoundError('GeneratedWebsite', req.params.websiteId);

    // Regenerate HTML from stored config
    const cfg = website.config as Parameters<typeof renderRestaurantPremium>[0];
    const html = renderRestaurantPremium(cfg);
    return reply.type('text/html').send(html);
  });
}
