import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@embedo/db';
import { NotFoundError, ValidationError } from '@embedo/utils';
import { scrapeWebsite, scrapeForInspiration } from './scraper/scrape.js';
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
      industryType?: string;
      sections?: Array<{ id: string; enabled: boolean }>;
      inspirationUrls?: string[];
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

    // Scrape inspiration sites in parallel (fire-and-forget style, no error if they fail)
    let inspirationStyleNotes: string | undefined;
    if (body.inspirationUrls?.length && env.ANTHROPIC_API_KEY) {
      const notes = await Promise.all(
        body.inspirationUrls.filter(Boolean).slice(0, 3).map((u) => scrapeForInspiration(u, env.ANTHROPIC_API_KEY!))
      );
      const joined = notes.filter(Boolean).join('\n\n');
      if (joined) inspirationStyleNotes = joined;
    }

    // Generate AI copy
    let copy = {
      heroHeading: `Welcome to ${body.businessName}`,
      heroSubheading: body.tagline ?? body.description ?? '',
      aboutHeading: 'Our Story',
      aboutBody: body.description ?? '',
      ctaText: 'Reserve a Table',
      tagline: body.tagline ?? '',
      suggestedHours: {} as Record<string, string>,
      suggestedMenuItems: [] as Array<{ name: string; description: string; price: string; category: string }>,
      features: [] as Array<{ title: string; description: string }>,
      testimonials: [] as Array<{ quote: string; author: string; detail: string }>,
    };
    if (env.ANTHROPIC_API_KEY) {
      copy = await generateWebsiteCopy({
        ...merged,
        businessName: body.businessName,
        ...(body.industryType ? { industryType: body.industryType } : {}),
        ...(inspirationStyleNotes ? { inspirationStyleNotes } : {}),
      }, env.ANTHROPIC_API_KEY);
    }

    const s = scraped as Record<string, unknown>;
    // Render HTML — cast via unknown to satisfy exactOptionalPropertyTypes
    // Use user-provided data first, then scraped data, then AI-generated fallbacks
    const premiumConfig = {
      businessName: body.businessName,
      tagline: body.tagline ?? s['tagline'] ?? copy.tagline,
      description: body.description ?? s['description'],
      cuisine: body.cuisine ?? s['cuisine'],
      phone: body.phone ?? s['phone'],
      address: body.address ?? s['address'],
      city: body.city ?? s['city'],
      hours: (body.hours && Object.keys(body.hours).length > 0)
        ? body.hours
        : (s['hours'] as Record<string, string> | undefined) ?? copy.suggestedHours,
      menuItems: (body.menuItems && body.menuItems.length > 0)
        ? body.menuItems
        : (s['menuItems'] as typeof body.menuItems | undefined) ?? copy.suggestedMenuItems,
      galleryImages: body.galleryImages ?? s['imageUrls'],
      heroImage: body.heroImage,
      bookingUrl: body.bookingUrl ?? s['bookingUrl'],
      colorScheme: body.colorScheme ?? 'midnight',
      fontPairing: body.fontPairing ?? 'modern',
      heroHeading: copy.heroHeading,
      heroSubheading: copy.heroSubheading,
      aboutHeading: copy.aboutHeading,
      aboutBody: copy.aboutBody,
      ctaText: copy.ctaText,
      features: copy.features,
      testimonials: copy.testimonials,
      chatbotEnabled: body.chatbotEnabled ?? false,
      chatbotBusinessId: body.businessId,
      ...(body.sections ? { sections: body.sections } : {}),
    };
    const html = renderRestaurantPremium(premiumConfig as unknown as import('./templates/restaurant/premium.js').PremiumWebsiteConfig);

    // Always create a new GeneratedWebsite record — users manage multiple sites from the list view
    const slug = `embedo-${body.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}-${body.businessId.slice(-6)}`;

    let websiteRecord = await db.generatedWebsite.create({
      data: {
        businessId: body.businessId,
        template: 'restaurant-premium',
        config: premiumConfig as unknown as object,
        status: 'GENERATING',
      },
    });

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
        deployUrl: deployedUrl || null,
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

  // POST /extract-menu — extract structured menu items from text, image, or PDF
  app.post<{ Body: { content: string; mimeType: string } }>('/extract-menu', async (req, reply) => {
    const { content, mimeType } = req.body;
    if (!content) return reply.code(400).send({ success: false, error: 'content is required' });
    if (!env.ANTHROPIC_API_KEY) return reply.code(400).send({ success: false, error: 'ANTHROPIC_API_KEY required' });

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const extractPrompt = 'Extract all menu items from this content. Return ONLY a valid JSON array with this structure — no markdown, no explanation:\n[\n  { "name": "Item Name", "description": "1-2 sentence description", "price": "$XX", "category": "Category" }\n]\nInclude as many items as you find. If no price is visible, use an empty string. Infer reasonable categories (Starters, Mains, Desserts, Drinks, etc.).';

    type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const messageContent = mimeType.startsWith('image/')
      ? [
          { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType as MediaType, data: content } },
          { type: 'text' as const, text: extractPrompt },
        ]
      : mimeType === 'application/pdf'
      ? [
          { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: content } },
          { type: 'text' as const, text: extractPrompt },
        ]
      : `${extractPrompt}\n\nContent:\n${content}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: messageContent as Parameters<typeof client.messages.create>[0]['messages'][0]['content'] }],
    });

    try {
      const raw = (response.content[0] as { type: string; text: string }).text.trim();
      const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const menuItems = JSON.parse(jsonText) as Array<{ name: string; description: string; price: string; category: string }>;
      return reply.send({ success: true, menuItems });
    } catch {
      return reply.code(422).send({ success: false, error: 'Could not parse menu items from content' });
    }
  });

  // POST /websites/:websiteId/edit — AI chat to modify an existing website
  app.post<{ Params: { websiteId: string }; Body: { message: string } }>('/websites/:websiteId/edit', async (req, reply) => {
    const { websiteId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return reply.code(400).send({ success: false, error: 'message is required' });
    }

    const website = await db.generatedWebsite.findUnique({ where: { id: websiteId } });
    if (!website) throw new NotFoundError('GeneratedWebsite', websiteId);

    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(400).send({ success: false, error: 'AI editing requires ANTHROPIC_API_KEY' });
    }

    const currentConfig = website.config as Record<string, unknown>;

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `You are a website configuration editor. Given the current website config JSON and a user request, return ONLY a valid JSON object containing ONLY the fields that need to change. Do not include unchanged fields. No explanation, no markdown — pure JSON only.

Editable fields:
- businessName, tagline, description, cuisine, phone, address, city
- hours: Record<string, string> e.g. {"Monday":"11am–10pm","Tuesday":"Closed"}
- heroImage (URL string), bookingUrl (URL string)
- colorScheme: "midnight" | "warm" | "forest" | "ocean" | "ivory" | "rose" | "slate" | "emerald" | "amber" | "crimson" | "navy" | "sage"
- fontPairing: "modern" | "classic" | "minimal" | "elegant" | "luxury" | "editorial" | "tech" | "literary"
- heroHeading, heroSubheading, aboutHeading, aboutBody, ctaText
- menuItems: Array<{name,description?,price?,category?}>`,
      messages: [{
        role: 'user',
        content: `Current config:\n${JSON.stringify(currentConfig, null, 2)}\n\nUser request: "${message}"\n\nReturn ONLY the changed fields as JSON.`,
      }],
    });

    let patch: Record<string, unknown> = {};
    try {
      const raw = (response.content[0] as { type: string; text: string }).text.trim();
      const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      patch = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      return reply.code(422).send({ success: false, error: 'Could not parse AI response. Try rephrasing your request.' });
    }

    const updatedConfig = { ...currentConfig, ...patch };
    const html = renderRestaurantPremium(updatedConfig as unknown as import('./templates/restaurant/premium.js').PremiumWebsiteConfig);

    let deployedUrl = website.deployUrl ?? '';
    let deploymentId = website.vercelDeploymentId ?? '';

    if (env.VERCEL_API_TOKEN) {
      const bName = String(updatedConfig.businessName ?? 'site');
      const slug = `embedo-${bName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}-${website.businessId.slice(-6)}`;
      const deployed = await deployToVercel({ projectName: slug, html, businessId: website.businessId });
      deployedUrl = deployed.url;
      deploymentId = deployed.deploymentId;
    }

    await db.generatedWebsite.update({
      where: { id: websiteId },
      data: {
        config: updatedConfig as object,
        deployUrl: deployedUrl || null,
        vercelDeploymentId: deploymentId || null,
      },
    });

    return reply.send({ success: true, html, url: deployedUrl });
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
    const cfg = website.config as unknown as Parameters<typeof renderRestaurantPremium>[0];
    const html = renderRestaurantPremium(cfg);
    return reply.type('text/html').send(html);
  });
}
