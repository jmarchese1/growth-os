import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';

const logger = createLogger('website-gen:full-site');

export interface SiteData {
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
  features?: Array<{ title: string; description: string }>;
  testimonials?: Array<{ quote: string; author: string; detail: string }>;
  heroHeading: string;
  heroSubheading: string;
  aboutHeading: string;
  aboutBody: string;
  ctaText: string;
  sections?: Array<{ id: string; enabled: boolean; isPage?: boolean }>;
  extraPages?: Array<{ id: string; label: string; slug: string }>;
  // Analytics
  googleAnalyticsId?: string;
  metaPixelId?: string;
  // Contact form
  contactFormEndpoint?: string;
  // Chatbot
  chatbotEnabled?: boolean;
  chatbotBusinessId?: string;
}

/**
 * AI generates the COMPLETE website HTML from scratch.
 * No rigid template — the AI decides layout, CSS, and HTML structure
 * based on the business data and inspiration analysis.
 */
export async function generateFullWebsite(params: {
  siteData: SiteData;
  inspirationStyleNotes: string;
  industryType: string;
  inspirationScreenshots?: string[]; // base64 screenshots for vision
}, anthropicKey: string): Promise<string> {
  const { siteData, inspirationStyleNotes, industryType } = params;

  const client = new Anthropic({ apiKey: anthropicKey });

  // Build the data context
  const enabledSections = siteData.sections?.filter(s => s.enabled).map(s => s.id) ?? ['about', 'features', 'menu', 'testimonials', 'hours'];
  const enabledPages = siteData.extraPages ?? [];

  const menuJson = siteData.menuItems?.length
    ? JSON.stringify(siteData.menuItems.slice(0, 12), null, 2)
    : 'No menu items provided — skip menu section or generate sample items';

  const hoursJson = siteData.hours && Object.keys(siteData.hours).length > 0
    ? JSON.stringify(siteData.hours, null, 2)
    : 'No hours provided';

  const galleryUrls = siteData.galleryImages?.filter(Boolean) ?? [];
  const testimonialsJson = siteData.testimonials?.length
    ? JSON.stringify(siteData.testimonials, null, 2)
    : 'No testimonials provided — generate 2-3 realistic ones';

  const featuresJson = siteData.features?.length
    ? JSON.stringify(siteData.features, null, 2)
    : 'No features provided — generate 3 compelling ones';

  // Build the message content — include screenshots if available
  const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }> = [];

  if (params.inspirationScreenshots?.length) {
    for (const screenshot of params.inspirationScreenshots.slice(0, 2)) {
      messageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: screenshot },
      });
    }
    messageContent.push({
      type: 'text',
      text: 'Above: Screenshots of inspiration websites the user wants their site to look like. Study every visual detail — layout structure, color palette, typography, spacing, card styles, image treatment, nav style, hero design, section rhythm.',
    });
  }

  messageContent.push({
    type: 'text',
    text: `You are a world-class web designer and front-end developer. Generate a COMPLETE, production-ready single-page HTML website.

## CRITICAL RULE
Do NOT use a generic dark-background centered-text template. Every site you generate must have UNIQUE layout, structure, and visual design based on the inspiration below. If the inspiration shows a light site with photo grids — build that. If it shows a moody dark site with giant typography — build that. MATCH THE INSPIRATION.

## Inspiration & Style Analysis
${inspirationStyleNotes || `No specific inspiration provided. Create a distinctive, high-end ${industryType} website with creative layout choices. Don't default to the same dark-background centered layout every time. Vary between: light/dark themes, left-aligned/centered heroes, card-based/list-based menus, photo-heavy/text-forward designs.`}

## Business Data
- **Name:** ${siteData.businessName}
- **Industry:** ${industryType}
${siteData.cuisine ? `- **Type:** ${siteData.cuisine}` : ''}
${siteData.city ? `- **City:** ${siteData.city}` : ''}
${siteData.phone ? `- **Phone:** ${siteData.phone}` : ''}
${siteData.address ? `- **Address:** ${siteData.address}` : ''}
${siteData.bookingUrl ? `- **Booking URL:** ${siteData.bookingUrl}` : ''}
${siteData.heroImage ? `- **Hero Image URL:** ${siteData.heroImage}` : ''}
- **Hero Heading:** ${siteData.heroHeading}
- **Hero Subtitle:** ${siteData.heroSubheading}
- **About Heading:** ${siteData.aboutHeading}
- **About Body:** ${siteData.aboutBody}
- **CTA Text:** ${siteData.ctaText}
${siteData.tagline ? `- **Tagline:** ${siteData.tagline}` : ''}

## Content Sections to Include
${enabledSections.map(id => `- ${id}`).join('\n')}
${enabledPages.length > 0 ? `\n## Extra Pages\n${enabledPages.map(p => `- ${p.label} (/${p.slug})`).join('\n')}` : ''}

## Menu Items
${menuJson}

## Hours
${hoursJson}

## Gallery Images
${galleryUrls.length > 0 ? galleryUrls.map((u, i) => `${i + 1}. ${u}`).join('\n') : 'No gallery images'}

## Features
${featuresJson}

## Testimonials
${testimonialsJson}

## Requirements
1. Output a COMPLETE <!DOCTYPE html> document — fully self-contained with inline <style> and no external dependencies except Google Fonts
2. The design must be RESPONSIVE (mobile-friendly)
3. Include smooth scroll behavior
4. Nav should be fixed/sticky with the business name and section links
5. Use the actual business data above — real name, real phone, real hours, real menu items
6. If a hero image URL is provided, use it as the hero background
7. Make the CTA button link to the booking URL (or phone if no booking URL)
8. The design should look like it was built by a premium agency — not a template
9. Include hover effects, transitions, and micro-interactions
10. Every section should have unique visual treatment — NOT the same card-grid pattern repeated

${siteData.googleAnalyticsId ? `## Analytics\nInclude Google Analytics: ${siteData.googleAnalyticsId}` : ''}
${siteData.metaPixelId ? `Include Meta Pixel: ${siteData.metaPixelId}` : ''}

${enabledPages.some(p => p.id === 'contact') && siteData.contactFormEndpoint ? `## Contact Form\nThe contact page must include a working form that POSTs JSON to: ${siteData.contactFormEndpoint}\nFields: name (required), email (required), phone (optional), message (required), businessName: "${siteData.businessName}", businessId: "${siteData.chatbotBusinessId ?? ''}"\nShow success/error messages after submission.` : ''}

## Output
Return ONLY the complete HTML document. No markdown, no explanation, no \`\`\` code fences. Just the raw HTML starting with <!DOCTYPE html>.`,
  });

  logger.info({ businessName: siteData.businessName, sectionsCount: enabledSections.length, hasInspiration: !!inspirationStyleNotes }, 'Generating full website HTML via AI');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 12000,
    messages: [{
      role: 'user',
      content: messageContent,
    }],
  });

  const block = response.content[0];
  let html = block && block.type === 'text' ? block.text.trim() : '';

  // Clean up any markdown fencing the AI might add
  html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '').trim();

  // Validate it's actual HTML
  if (!html.startsWith('<!DOCTYPE') && !html.startsWith('<html')) {
    // Try to find HTML in the response
    const match = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    if (match) {
      html = match[0];
    } else {
      throw new Error('AI did not generate valid HTML');
    }
  }

  // Inject chatbot widget if enabled
  if (siteData.chatbotEnabled && siteData.chatbotBusinessId) {
    const chatbotScript = `
<script>
  window.EmbledoChatConfig = {
    businessId: "${siteData.chatbotBusinessId}",
    businessName: "${siteData.businessName.replace(/"/g, '\\"')}",
    welcomeMessage: "Hi! How can I help you today?"
  };
</script>
<script src="https://chat.embedo.ai/widget.js" async></script>`;
    html = html.replace('</body>', `${chatbotScript}\n</body>`);
  }

  logger.info({ htmlLength: html.length }, 'Full website HTML generated');
  return html;
}
