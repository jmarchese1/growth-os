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
  googleAnalyticsId?: string;
  metaPixelId?: string;
  contactFormEndpoint?: string;
  chatbotEnabled?: boolean;
  chatbotBusinessId?: string;
}

/**
 * AI generates the COMPLETE website HTML from scratch.
 * No rigid template — the AI decides layout, CSS, and HTML structure
 * based on the business data and inspiration site source code.
 */
export async function generateFullWebsite(params: {
  siteData: SiteData;
  inspirationStyleNotes: string;
  industryType: string;
}, anthropicKey: string): Promise<string> {
  const { siteData, inspirationStyleNotes, industryType } = params;

  const client = new Anthropic({ apiKey: anthropicKey });

  const enabledSections = siteData.sections?.filter(s => s.enabled).map(s => s.id) ?? ['about', 'features', 'menu', 'testimonials', 'hours'];
  const enabledPages = siteData.extraPages ?? [];

  const menuData = siteData.menuItems?.length
    ? siteData.menuItems.slice(0, 12).map(i => `${i.name}${i.price ? ` — ${i.price}` : ''}${i.description ? `: ${i.description}` : ''} [${i.category ?? 'Main'}]`).join('\n')
    : '';

  const hoursData = siteData.hours && Object.keys(siteData.hours).length > 0
    ? Object.entries(siteData.hours).map(([d, t]) => `${d}: ${t}`).join('\n')
    : '';

  const galleryUrls = siteData.galleryImages?.filter(Boolean) ?? [];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are a senior front-end developer at a top design agency. Build a complete, production-quality website.

## YOUR #1 RULE
Study the inspiration site CSS and HTML below. Your output must VISUALLY MATCH the inspiration — same color palette, same layout patterns, same typography feel, same spacing rhythm, same visual weight. If the inspiration uses a light background, YOUR site uses a light background. If it uses photo grids, YOU use photo grids. If it uses bold sans-serif, YOU use bold sans-serif. DO NOT default to a dark background with centered serif text.

## INSPIRATION SITE SOURCE CODE & ANALYSIS
${inspirationStyleNotes}

## BUSINESS DATA
Name: ${siteData.businessName}
Industry: ${industryType}
${siteData.cuisine ? `Type: ${siteData.cuisine}` : ''}
${siteData.city ? `City: ${siteData.city}` : ''}
${siteData.phone ? `Phone: ${siteData.phone}` : ''}
${siteData.address ? `Address: ${siteData.address}` : ''}
${siteData.heroImage ? `Hero image: ${siteData.heroImage}` : 'No hero image — use a CSS gradient or solid color hero'}
${siteData.bookingUrl ? `Booking URL: ${siteData.bookingUrl}` : ''}
Hero heading: ${siteData.heroHeading}
Hero subtitle: ${siteData.heroSubheading}
About heading: ${siteData.aboutHeading}
About body: ${siteData.aboutBody}
CTA: ${siteData.ctaText}
${siteData.tagline ? `Tagline: ${siteData.tagline}` : ''}

${menuData ? `## MENU ITEMS\n${menuData}` : ''}
${hoursData ? `## HOURS\n${hoursData}` : ''}
${galleryUrls.length > 0 ? `## GALLERY IMAGES\n${galleryUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}` : ''}

${siteData.features?.length ? `## FEATURES\n${siteData.features.map(f => `- ${f.title}: ${f.description}`).join('\n')}` : ''}
${siteData.testimonials?.length ? `## TESTIMONIALS\n${siteData.testimonials.map(t => `"${t.quote}" — ${t.author}, ${t.detail}`).join('\n')}` : ''}

## SECTIONS TO INCLUDE
${enabledSections.join(', ')}
${enabledPages.length > 0 ? `Extra pages: ${enabledPages.map(p => p.label).join(', ')}` : ''}

## REQUIREMENTS
1. Output a COMPLETE <!DOCTYPE html> document. Self-contained — all CSS in a <style> tag, no external CSS files (Google Fonts link is OK)
2. COPY the visual style from the inspiration site — colors, layout structure, typography, spacing, card styles, image treatment
3. Use the ACTUAL business data above — real name, phone, hours, menu items, etc.
4. If a hero image URL is given, use it. If gallery image URLs are given, use them.
5. If NO images are provided, use Unsplash for placeholder images. Use specific queries like: https://images.unsplash.com/photo-SPECIFIC-ID?w=800 or use https://source.unsplash.com/800x600/?restaurant,food (adjust the query to match the industry)
6. Make it fully responsive (mobile-friendly)
7. Include hover effects, smooth transitions, and scroll behavior
8. The CTA should link to the booking URL or phone number
9. Do NOT generate a generic dark template with centered text. Be creative. Match the inspiration.
10. Include proper meta tags (title, description, viewport, og:title, og:description)

${siteData.googleAnalyticsId ? `Include Google Analytics: ${siteData.googleAnalyticsId}` : ''}
${siteData.metaPixelId ? `Include Meta Pixel: ${siteData.metaPixelId}` : ''}
${enabledPages.some(p => p.id === 'contact') && siteData.contactFormEndpoint ? `Include a contact form that POSTs JSON to ${siteData.contactFormEndpoint} with fields: name, email, phone, message, businessName, businessId` : ''}

Output ONLY the HTML. No markdown fences, no explanation. Start with <!DOCTYPE html>.`,
    }],
  });

  const block = response.content[0];
  let html = block && block.type === 'text' ? block.text.trim() : '';

  // Clean up markdown fencing
  html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '').trim();

  if (!html.startsWith('<!DOCTYPE') && !html.startsWith('<html')) {
    const match = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    if (match) {
      html = match[0];
    } else {
      throw new Error('AI did not generate valid HTML');
    }
  }

  // Inject chatbot if enabled
  if (siteData.chatbotEnabled && siteData.chatbotBusinessId) {
    const script = `<script>window.EmbledoChatConfig={businessId:"${siteData.chatbotBusinessId}",businessName:"${siteData.businessName.replace(/"/g, '\\"')}",welcomeMessage:"Hi! How can I help you today?"};</script><script src="https://chat.embedo.ai/widget.js" async></script>`;
    html = html.replace('</body>', `${script}\n</body>`);
  }

  logger.info({ htmlLength: html.length }, 'Full website generated');
  return html;
}
