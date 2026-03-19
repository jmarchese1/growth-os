import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@embedo/db';
import { NotFoundError, ValidationError, createLogger } from '@embedo/utils';
import { scrapeWebsite, scrapeForInspiration } from './scraper/scrape.js';
import { getInsightsForIndustry } from './training/knowledge-base.js';
import { generateWebsiteCopy } from './generator/content.js';
import { generateStyleOverrides } from './generator/style-generator.js';
import { generateFullWebsite } from './generator/full-site-generator.js';
import { renderRestaurantPremium } from './templates/restaurant/premium.js';
import { renderBoldTemplate } from './templates/restaurant/bold.js';
import { renderEditorialTemplate } from './templates/restaurant/editorial.js';
import { deployToVercel, addCustomDomain } from './deploy/vercel.js';
import { env } from './config.js';
import type { ColorScheme, FontPairing, AnimationPreset } from './templates/restaurant/premium.js';
import type { PremiumWebsiteConfig } from './templates/restaurant/premium.js';

const logger = createLogger('website-gen:routes');

// ── AI Self-Review Loop ─────────────────────────────────────────────────────
async function screenshotUrl(url: string): Promise<string | null> {
  try {
    const pw = await import('playwright');
    const browser = await pw.chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(2000);
    // Scroll down to trigger animations and see more content
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight / 3)');
    await page.waitForTimeout(1000);
    await page.evaluate('window.scrollTo(0, 0)');
    await page.waitForTimeout(500);
    const screenshot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 65 });
    await browser.close();
    return screenshot.toString('base64');
  } catch (err) {
    logger.warn({ url, error: String(err) }, 'Self-review screenshot failed');
    return null;
  }
}

async function selfReviewAndFix(
  config: PremiumWebsiteConfig,
  deployUrl: string,
  anthropicKey: string,
  businessId: string,
): Promise<{ html: string; config: PremiumWebsiteConfig; deployUrl: string; fixes: string[] }> {
  const fixes: string[] = [];
  let currentConfig = { ...config };
  let currentUrl = deployUrl;
  const MAX_ROUNDS = 2;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (!currentUrl) break;

    // Wait a moment for deployment to propagate
    await new Promise(r => setTimeout(r, 3000));

    const screenshot = await screenshotUrl(currentUrl);
    if (!screenshot) break;

    const client = new Anthropic({ apiKey: anthropicKey });
    const reviewResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: screenshot },
          },
          {
            type: 'text',
            text: `You are a senior web designer reviewing a generated website. Look at this full-page screenshot and evaluate it.

Current website config: ${JSON.stringify({
  businessName: currentConfig.businessName,
  colorScheme: currentConfig.colorScheme,
  fontPairing: currentConfig.fontPairing,
  heroHeading: currentConfig.heroHeading,
  heroSubheading: currentConfig.heroSubheading,
  ctaText: currentConfig.ctaText,
  animationPreset: currentConfig.animationPreset,
}, null, 2)}

Check for these issues:
1. **Text readability**: Is text readable against backgrounds? Low contrast?
2. **Layout issues**: Overlapping elements, broken grids, empty sections?
3. **Visual balance**: Is the hero too empty or too cramped?
4. **Copy quality**: Does the headline sound generic or AI-ish?
5. **Color harmony**: Do the colors work together?
6. **Overall polish**: Does this look professional and premium?

If the site looks GOOD (7/10 or better), respond with exactly: {"quality": "good", "score": N}

If there are issues, respond with a JSON patch to fix them. ONLY include fields that need changing:
{
  "quality": "needs_fix",
  "score": N,
  "issues": ["brief description of each issue"],
  "patch": {
    "heroHeading": "Better heading if current one is generic",
    "heroSubheading": "Better subheading if needed",
    "colorScheme": "different scheme if colors clash",
    "fontPairing": "different font if hard to read"
  }
}

Return ONLY valid JSON, no markdown.`,
          },
        ],
      }],
    });

    let reviewResult: { quality: string; score: number; issues?: string[]; patch?: Record<string, unknown> } = { quality: 'good', score: 8 };
    try {
      const block = reviewResponse.content[0];
      const text = block && block.type === 'text' ? block.text.trim() : '{}';
      const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      reviewResult = JSON.parse(jsonText) as typeof reviewResult;
    } catch {
      logger.warn('Failed to parse self-review response');
      break;
    }

    logger.info({ round: round + 1, quality: reviewResult.quality, score: reviewResult.score, issues: reviewResult.issues }, 'Self-review result');

    if (reviewResult.quality === 'good' || !reviewResult.patch || Object.keys(reviewResult.patch).length === 0) {
      break;
    }

    // Apply the patch
    fixes.push(...(reviewResult.issues ?? []));
    currentConfig = { ...currentConfig, ...reviewResult.patch } as PremiumWebsiteConfig;

    // Re-render and re-deploy
    const newHtml = renderRestaurantPremium(currentConfig);

    if (env.VERCEL_API_TOKEN) {
      const bName = currentConfig.businessName;
      const slug = `embedo-${bName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}-${businessId.slice(-6)}`;
      const deployed = await deployToVercel({ projectName: slug, html: newHtml, businessId });
      currentUrl = deployed.url;
    }

    logger.info({ round: round + 1, fixes: reviewResult.issues }, 'Applied self-review fixes');
  }

  const finalHtml = renderRestaurantPremium(currentConfig);
  return { html: finalHtml, config: currentConfig, deployUrl: currentUrl, fixes };
}

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
      animationPreset?: AnimationPreset;
      existingWebsiteUrl?: string;
      chatbotEnabled?: boolean;
      industryType?: string;
      sections?: Array<{ id: string; enabled: boolean }>;
      inspirationUrls?: string[];
      extraPages?: Array<{ id: string; label: string; slug: string }>;
      googleAnalyticsId?: string;
      metaPixelId?: string;
      template?: string;
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

    // Build inspiration context: training KB (always present) + user inspiration sites
    const trainingInsights = getInsightsForIndustry(body.industryType);
    let inspirationStyleNotes: string = trainingInsights;

    if (body.inspirationUrls?.length && env.ANTHROPIC_API_KEY) {
      const userNotes = await Promise.all(
        body.inspirationUrls.filter(Boolean).slice(0, 3).map((u) => scrapeForInspiration(u, env.ANTHROPIC_API_KEY!))
      );
      const joined = userNotes.filter(Boolean).join('\n\n');
      if (joined) {
        inspirationStyleNotes = trainingInsights
          ? `${trainingInsights}\n\n---\n\n## User-Provided Reference Sites\n${joined}`
          : joined;
      }
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

    // Generate AI style overrides based on inspiration analysis
    let styleOverrides: Partial<import('./templates/restaurant/premium.js').StyleOverrides> = {};
    if (env.ANTHROPIC_API_KEY) {
      try {
        styleOverrides = await generateStyleOverrides({
          inspirationStyleNotes,
          industryType: body.industryType ?? 'restaurant',
          colorScheme: body.colorScheme ?? 'midnight',
          fontPairing: body.fontPairing ?? 'modern',
          businessName: body.businessName,
          hasHeroImage: !!(body.heroImage || (scraped as Record<string, unknown>)['imageUrls']),
          hasManyMenuItems: (body.menuItems?.length ?? 0) >= 8 || (copy.suggestedMenuItems?.length ?? 0) >= 8,
          hasGallery: (body.galleryImages?.length ?? 0) >= 2,
        }, env.ANTHROPIC_API_KEY);
      } catch (err) {
        logger.warn({ error: String(err) }, 'Style override generation failed — using defaults');
      }
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
      animationPreset: body.animationPreset ?? 'fade-up',
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
      ...(body.extraPages?.length ? { extraPages: body.extraPages } : {}),
      // Analytics
      ...(body.googleAnalyticsId ? { googleAnalyticsId: body.googleAnalyticsId } : {}),
      ...(body.metaPixelId ? { metaPixelId: body.metaPixelId } : {}),
      // Contact form — auto-enable if contact page is included
      contactFormEnabled: body.extraPages?.some(p => p.id === 'contact') ?? false,
      contactFormEndpoint: `${env.WEBSITE_GEN_URL ?? `http://localhost:${env.PORT}`}/contact-form`,
      // AI-generated style overrides (unique per site)
      styleOverrides,
    };

    // ── Choose generation path ──
    // Path A: Full AI generation (when inspiration URLs exist) — AI writes the entire HTML
    // Path B: Template-based (no inspiration) — uses rigid templates with style overrides
    let html: string;
    const hasInspiration = !!(body.inspirationUrls?.some(Boolean));
    logger.info({ hasInspiration, inspirationUrls: body.inspirationUrls, hasApiKey: !!env.ANTHROPIC_API_KEY }, 'Generation path decision');

    if (hasInspiration && env.ANTHROPIC_API_KEY) {
      try {
        // Fetch actual HTML source of inspiration sites — more reliable than Playwright screenshots
        const inspirationSources: string[] = [];
        for (const url of (body.inspirationUrls ?? []).filter(Boolean).slice(0, 2)) {
          try {
            const res = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html' },
              signal: AbortSignal.timeout(10000),
              redirect: 'follow',
            });
            if (res.ok) {
              const rawHtml = await res.text();
              // Extract just the <style> blocks and first 3000 chars of <body> structure
              const styleBlocks = Array.from(rawHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)).map(m => m[1]).join('\n').slice(0, 8000);
              const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
              const bodyStructure = bodyMatch ? bodyMatch[1]!
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<!--[\s\S]*?-->/g, '')
                .slice(0, 4000) : '';
              inspirationSources.push(`## Source: ${url}\n### CSS:\n\`\`\`css\n${styleBlocks.slice(0, 6000)}\n\`\`\`\n### HTML Structure (first 4000 chars):\n\`\`\`html\n${bodyStructure}\n\`\`\``);
              logger.info({ url, cssLength: styleBlocks.length, htmlLength: bodyStructure.length }, 'Fetched inspiration source');
            }
          } catch (err) {
            logger.warn({ url, error: String(err) }, 'Failed to fetch inspiration source');
          }
        }

        const siteData = {
          businessName: body.businessName,
          tagline: String(premiumConfig.tagline ?? ''),
          description: String(premiumConfig.description ?? ''),
          cuisine: String(premiumConfig.cuisine ?? ''),
          phone: String(premiumConfig.phone ?? ''),
          address: String(premiumConfig.address ?? ''),
          city: String(premiumConfig.city ?? ''),
          ...(premiumConfig.hours ? { hours: premiumConfig.hours as Record<string, string> } : {}),
          ...(premiumConfig.menuItems ? { menuItems: premiumConfig.menuItems as Array<{ name: string; description?: string; price?: string; category?: string }> } : {}),
          ...(premiumConfig.galleryImages ? { galleryImages: premiumConfig.galleryImages as string[] } : {}),
          ...(premiumConfig.heroImage ? { heroImage: premiumConfig.heroImage as string } : {}),
          ...(premiumConfig.bookingUrl ? { bookingUrl: premiumConfig.bookingUrl as string } : {}),
          features: copy.features,
          testimonials: copy.testimonials,
          heroHeading: copy.heroHeading,
          heroSubheading: copy.heroSubheading,
          aboutHeading: copy.aboutHeading,
          aboutBody: copy.aboutBody,
          ctaText: copy.ctaText,
          ...(body.sections ? { sections: body.sections } : {}),
          ...(body.extraPages ? { extraPages: body.extraPages } : {}),
          ...(body.googleAnalyticsId ? { googleAnalyticsId: body.googleAnalyticsId } : {}),
          ...(body.metaPixelId ? { metaPixelId: body.metaPixelId } : {}),
          contactFormEndpoint: premiumConfig.contactFormEndpoint,
          ...(premiumConfig.chatbotEnabled ? { chatbotEnabled: true } : {}),
          ...(premiumConfig.chatbotBusinessId ? { chatbotBusinessId: premiumConfig.chatbotBusinessId } : {}),
        };

        // Combine text analysis + raw source code for maximum context
        const fullInspirationContext = [
          inspirationStyleNotes,
          inspirationSources.length > 0 ? '\n\n---\n\n## Actual Source Code from Inspiration Sites\n' + inspirationSources.join('\n\n') : '',
        ].filter(Boolean).join('\n');

        logger.info({ inspirationContextLength: fullInspirationContext.length, sourceCount: inspirationSources.length }, 'Calling full AI generation');

        html = await generateFullWebsite({
          siteData,
          inspirationStyleNotes: fullInspirationContext,
          industryType: body.industryType ?? 'restaurant',
        }, env.ANTHROPIC_API_KEY);
        logger.info({ htmlLength: html.length }, 'Full AI website generation succeeded');
      } catch (err) {
        logger.warn({ error: String(err) }, 'Full AI generation failed — falling back to template');
        const cfgCast = premiumConfig as unknown as PremiumWebsiteConfig;
        html = renderRestaurantPremium(cfgCast);
      }
    } else {
      // Template-based path (no inspiration — use rigid templates)
      const cfgCast = premiumConfig as unknown as PremiumWebsiteConfig;
      const tmplId = body.template ?? 'premium';
      html = tmplId === 'bold' ? renderBoldTemplate(cfgCast)
        : tmplId === 'editorial' ? renderEditorialTemplate(cfgCast)
        : renderRestaurantPremium(cfgCast);
    }

    // Always create a new GeneratedWebsite record — users manage multiple sites from the list view
    const slug = `embedo-${body.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}-${body.businessId.slice(-6)}`;

    let websiteRecord = await db.generatedWebsite.create({
      data: {
        businessId: body.businessId,
        template: hasInspiration ? 'ai-generated' : `restaurant-${body.template ?? 'premium'}`,
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

    // AI Self-Review Loop: screenshot the deployed site, evaluate, and auto-fix
    let finalHtml = html;
    let finalUrl = deployedUrl;
    let finalConfig = premiumConfig;
    let reviewFixes: string[] = [];

    if (deployedUrl && env.ANTHROPIC_API_KEY) {
      try {
        const reviewed = await selfReviewAndFix(
          premiumConfig as unknown as PremiumWebsiteConfig,
          deployedUrl,
          env.ANTHROPIC_API_KEY,
          body.businessId,
        );
        finalHtml = reviewed.html;
        finalUrl = reviewed.deployUrl;
        finalConfig = reviewed.config as unknown as typeof premiumConfig;
        reviewFixes = reviewed.fixes;
      } catch (err) {
        logger.warn({ error: String(err) }, 'Self-review failed — using initial generation');
      }
    }

    await db.generatedWebsite.update({
      where: { id: websiteRecord.id },
      data: {
        status: finalUrl ? 'LIVE' : 'GENERATING',
        deployUrl: finalUrl || null,
        vercelDeploymentId: deploymentId || null,
        vercelProjectId: vercelProjectId || null,
        config: finalConfig as unknown as object,
      },
    });

    return reply.send({
      success: true,
      websiteId: websiteRecord.id,
      url: finalUrl,
      html: finalHtml,
      reviewFixes: reviewFixes.length > 0 ? reviewFixes : undefined,
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

    // Save version snapshot before making changes
    await db.websiteVersion.create({
      data: {
        websiteId,
        config: currentConfig as object,
        label: `Before: ${message.slice(0, 60)}${message.length > 60 ? '...' : ''}`,
      },
    });

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
- animationPreset: "none" | "fade-up" | "slide-in" | "scale-reveal" | "blur-in" | "stagger-cascade" | "parallax-drift"
- heroHeading, heroSubheading, aboutHeading, aboutBody, ctaText
- styleOverrides: object with keys like heroLayout, buttonRadius, cardRadius, sectionPadding, heroHeadingSize, etc. — allows fine-grained visual control
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

    // AI Self-Review after edit: screenshot and auto-fix if needed (1 round)
    let finalHtml = html;
    let finalUrl = deployedUrl;
    let finalEditConfig = updatedConfig;

    if (deployedUrl && env.ANTHROPIC_API_KEY) {
      try {
        const reviewed = await selfReviewAndFix(
          updatedConfig as unknown as PremiumWebsiteConfig,
          deployedUrl,
          env.ANTHROPIC_API_KEY,
          website.businessId,
        );
        finalHtml = reviewed.html;
        finalUrl = reviewed.deployUrl;
        finalEditConfig = reviewed.config as unknown as Record<string, unknown>;
      } catch {
        // Fallback to un-reviewed version
      }
    }

    await db.generatedWebsite.update({
      where: { id: websiteId },
      data: {
        config: finalEditConfig as object,
        deployUrl: finalUrl || null,
        vercelDeploymentId: deploymentId || null,
      },
    });

    // Generate smart suggestions based on current site state
    let suggestions: string[] = [];
    try {
      const sugClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const sugResponse = await sugClient.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are a web design assistant. A user just edited their business website. Based on the current config, suggest 4 short, specific things they could change next to improve their site. Each suggestion should be a ready-to-use command they can paste — not a question, not vague advice.

Current config summary:
- Business: ${String(finalEditConfig['businessName'])} (${String(finalEditConfig['cuisine'] ?? 'local business')})
- Color scheme: ${String(finalEditConfig['colorScheme'])}
- Font: ${String(finalEditConfig['fontPairing'])}
- Animation: ${String(finalEditConfig['animationPreset'] ?? 'fade-up')}
- Hero heading: "${String(finalEditConfig['heroHeading'])}"
- Has hero image: ${Boolean(finalEditConfig['heroImage'])}
- Has booking URL: ${Boolean(finalEditConfig['bookingUrl'])}
- Has gallery images: ${Array.isArray(finalEditConfig['galleryImages']) && (finalEditConfig['galleryImages'] as unknown[]).length > 0}
- Menu items: ${Array.isArray(finalEditConfig['menuItems']) ? (finalEditConfig['menuItems'] as unknown[]).length : 0}
- Hours filled: ${finalEditConfig['hours'] && typeof finalEditConfig['hours'] === 'object' ? Object.keys(finalEditConfig['hours'] as object).length : 0} days
- Extra pages: ${Array.isArray(finalEditConfig['extraPages']) ? (finalEditConfig['extraPages'] as Array<{label: string}>).map(p => p.label).join(', ') : 'none'}
- User just asked: "${message}"

Return ONLY a JSON array of 4 strings. Each string is a short imperative command (under 60 chars). Mix different types: copy changes, style changes, structural additions, content tweaks. Make them specific to THIS business, not generic.

Example format: ["Change the about section to be more personal", "Try the editorial font for a magazine feel", "Add a seasonal specials section to the menu", "Switch to the scale-reveal scroll animation"]`,
        }],
      });

      const sugBlock = sugResponse.content[0];
      const sugText = sugBlock && sugBlock.type === 'text' ? sugBlock.text.trim() : '[]';
      const sugJson = sugText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      suggestions = JSON.parse(sugJson) as string[];
    } catch {
      // Non-critical — silently skip suggestions
    }

    return reply.send({ success: true, html: finalHtml, url: finalUrl, suggestions });
  });

  // POST /generate-image — generate an image using DALL-E 3
  app.post<{ Body: { prompt: string; size?: string; quality?: string } }>('/generate-image', async (req, reply) => {
    const { prompt, size = '1024x1024', quality = 'standard' } = req.body;
    if (!prompt?.trim()) return reply.code(400).send({ success: false, error: 'prompt is required' });
    if (!env.OPENAI_API_KEY) return reply.code(400).send({ success: false, error: 'OPENAI_API_KEY required for image generation' });

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: ['1024x1024', '1792x1024', '1024x1792'].includes(size) ? size : '1024x1024',
          quality: quality === 'hd' ? 'hd' : 'standard',
          response_format: 'url',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        return reply.code(response.status).send({
          success: false,
          error: errorData.error?.message ?? 'Image generation failed',
        });
      }

      const data = await response.json() as {
        data: Array<{ url: string; revised_prompt: string }>;
      };

      return reply.send({
        success: true,
        imageUrl: data.data[0]?.url ?? '',
        revisedPrompt: data.data[0]?.revised_prompt ?? '',
      });
    } catch (err) {
      return reply.code(500).send({ success: false, error: String(err) });
    }
  });

  // GET /websites/:websiteId/versions — list version history
  app.get<{ Params: { websiteId: string } }>('/websites/:websiteId/versions', async (req, reply) => {
    const versions = await db.websiteVersion.findMany({
      where: { websiteId: req.params.websiteId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, label: true, createdAt: true },
    });
    return reply.send({ success: true, versions });
  });

  // POST /websites/:websiteId/revert/:versionId — revert to a previous version
  app.post<{ Params: { websiteId: string; versionId: string } }>('/websites/:websiteId/revert/:versionId', async (req, reply) => {
    const { websiteId, versionId } = req.params;

    const version = await db.websiteVersion.findUnique({ where: { id: versionId } });
    if (!version || version.websiteId !== websiteId) throw new NotFoundError('WebsiteVersion', versionId);

    const website = await db.generatedWebsite.findUnique({ where: { id: websiteId } });
    if (!website) throw new NotFoundError('GeneratedWebsite', websiteId);

    // Save current state as a version before reverting
    await db.websiteVersion.create({
      data: {
        websiteId,
        config: website.config as object,
        label: 'Before revert',
      },
    });

    const revertedConfig = version.config as Record<string, unknown>;
    const html = renderRestaurantPremium(revertedConfig as unknown as PremiumWebsiteConfig);

    // Redeploy
    let deployedUrl = website.deployUrl ?? '';
    if (env.VERCEL_API_TOKEN) {
      const bName = String(revertedConfig['businessName'] ?? 'site');
      const slug = `embedo-${bName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}-${website.businessId.slice(-6)}`;
      const deployed = await deployToVercel({ projectName: slug, html, businessId: website.businessId });
      deployedUrl = deployed.url;
    }

    await db.generatedWebsite.update({
      where: { id: websiteId },
      data: { config: revertedConfig as object, deployUrl: deployedUrl || null },
    });

    return reply.send({ success: true, html, url: deployedUrl });
  });

  // POST /websites/:websiteId/domain — add a custom domain to a website
  app.post<{ Params: { websiteId: string }; Body: { domain: string } }>('/websites/:websiteId/domain', async (req, reply) => {
    const { websiteId } = req.params;
    const { domain } = req.body;
    if (!domain?.trim()) return reply.code(400).send({ success: false, error: 'domain is required' });
    if (!env.VERCEL_API_TOKEN) return reply.code(400).send({ success: false, error: 'Vercel token required for custom domains' });

    const website = await db.generatedWebsite.findUnique({ where: { id: websiteId } });
    if (!website) throw new NotFoundError('GeneratedWebsite', websiteId);
    if (!website.vercelProjectId) return reply.code(400).send({ success: false, error: 'Website must be deployed to Vercel first' });

    const result = await addCustomDomain({ projectId: website.vercelProjectId, domain: domain.trim() });

    await db.generatedWebsite.update({
      where: { id: websiteId },
      data: { customDomain: domain.trim() },
    });

    return reply.send({
      success: true,
      domain: result.domain,
      configured: result.configured,
      dnsRecords: result.dnsRecords,
    });
  });

  // POST /contact-form — handle contact form submissions from generated websites
  app.post<{ Body: { name: string; email: string; phone?: string; message: string; businessName?: string; businessId?: string } }>('/contact-form', async (req, reply) => {
    const { name, email, message, phone, businessName, businessId } = req.body;
    if (!name || !email || !message) return reply.code(400).send({ success: false, error: 'name, email, and message are required' });

    // Store as a lead if businessId is provided
    if (businessId) {
      try {
        await db.lead.create({
          data: {
            businessId,
            source: 'WEBSITE',
            rawData: { name, email, phone: phone ?? '', message, source: 'contact_form' },
            status: 'NEW',
          },
        });
      } catch (err) {
        logger.warn({ error: String(err) }, 'Failed to create lead from contact form');
      }
    }

    logger.info({ businessName, email }, 'Contact form submission received');
    return reply.send({ success: true });
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
