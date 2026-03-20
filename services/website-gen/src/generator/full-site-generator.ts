import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';
import { fetchImages } from './image-sourcer.js';

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
 * AI generates the COMPLETE website HTML using Tailwind CSS.
 * Pre-fetches real images from Pexels, passes them to the AI.
 */
export async function generateFullWebsite(params: {
  siteData: SiteData;
  inspirationStyleNotes: string;
  industryType: string;
  pexelsApiKey?: string;
}, anthropicKey: string): Promise<string> {
  const { siteData, inspirationStyleNotes, industryType } = params;
  const client = new Anthropic({ apiKey: anthropicKey });

  // Pre-fetch REAL working images from Pexels
  const images = await fetchImages({
    industryType,
    ...(siteData.cuisine ? { cuisine: siteData.cuisine } : {}),
    count: 6,
    ...(params.pexelsApiKey ? { pexelsApiKey: params.pexelsApiKey } : {}),
  });

  const heroImg = siteData.heroImage || images[0]?.url || '';
  const galleryImgs = siteData.galleryImages?.filter(Boolean).length
    ? siteData.galleryImages.filter(Boolean)
    : images.slice(1, 5).map(i => i.url);

  logger.info({ imageCount: images.length, heroImg: !!heroImg, galleryCount: galleryImgs.length }, 'Images ready for generation');

  const enabledSections = siteData.sections?.filter(s => s.enabled).map(s => s.id) ?? ['about', 'features', 'menu', 'testimonials', 'hours'];
  const enabledPages = siteData.extraPages ?? [];

  const menuData = siteData.menuItems?.length
    ? siteData.menuItems.slice(0, 12).map(i => `${i.name}${i.price ? ` — ${i.price}` : ''}${i.description ? `: ${i.description}` : ''} [${i.category ?? 'Main'}]`).join('\n')
    : '';

  const hoursData = siteData.hours && Object.keys(siteData.hours).length > 0
    ? Object.entries(siteData.hours).map(([d, t]) => `${d}: ${t}`).join('\n')
    : '';

  // Build the image list for the AI
  const imageList = images.map((img, i) => `  ${i + 1}. ${img.url} — "${img.alt}"`).join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are a senior front-end developer at a premium design agency. Build a complete, stunning website using Tailwind CSS.

## TECH STACK (MANDATORY)
- Include: <script src="https://cdn.tailwindcss.com"></script>
- Include a <script> block to configure tailwind with custom colors/fonts
- Use Google Fonts via <link> tag — pick fonts that match the inspiration
- ALL styling via Tailwind utility classes — zero inline styles
- Use semantic HTML5 (header, main, nav, section, footer)

## RULE #1: MATCH THE INSPIRATION
Study the CSS and HTML structure below. Your output must use the SAME color palette, layout approach, typography weight, and visual rhythm. If the inspiration has a light cream background — yours does too. If it has photo grids — yours does too.

${inspirationStyleNotes}

## RULE #2: USE THESE IMAGES (THEY ARE VERIFIED WORKING)
These image URLs are pre-verified and will load correctly. USE THEM:
${imageList}

- Hero background: ${heroImg}
- Gallery/feature images: ${galleryImgs.join(', ')}
- EVERY section should include at least one image where appropriate
- Use object-cover, aspect-ratio utilities, and overlay gradients on hero

## BUSINESS DATA
Name: ${siteData.businessName}
Industry: ${industryType}
${siteData.cuisine ? `Type: ${siteData.cuisine}` : ''}
${siteData.city ? `City: ${siteData.city}` : ''}
${siteData.phone ? `Phone: ${siteData.phone}` : ''}
${siteData.address ? `Address: ${siteData.address}` : ''}
${siteData.bookingUrl ? `Booking: ${siteData.bookingUrl}` : ''}
Hero heading: ${siteData.heroHeading}
Hero subtitle: ${siteData.heroSubheading}
About: ${siteData.aboutBody}
CTA: ${siteData.ctaText}
${siteData.tagline ? `Tagline: ${siteData.tagline}` : ''}

${menuData ? `## MENU\n${menuData}` : ''}
${hoursData ? `## HOURS\n${hoursData}` : ''}
${siteData.features?.length ? `## FEATURES\n${siteData.features.map(f => `- ${f.title}: ${f.description}`).join('\n')}` : ''}
${siteData.testimonials?.length ? `## TESTIMONIALS\n${siteData.testimonials.map(t => `"${t.quote}" — ${t.author}`).join('\n')}` : ''}

## SECTIONS: ${enabledSections.join(', ')}
${enabledPages.length > 0 ? `\n## EXTRA PAGES (these should be full separate views, not just sections)\nThese pages should be accessible via nav links. When clicked, hide the main content and show only that page. Use JavaScript to toggle visibility based on URL hash (#menu, #contact, etc.). Each page should feel like its own full page with a back-to-home link.\n${enabledPages.map(p => `- ${p.label} (/${p.slug})`).join('\n')}` : ''}

## NAV BEHAVIOR
- Nav links for sections (about, features, hours) should smooth-scroll to that section
- If the business has many menu items, the Menu nav link should scroll to a dedicated full-width menu section with all items beautifully laid out — not a cramped card grid
- If extra pages exist (Contact, Careers, etc.), those nav links should use hash-based routing to show/hide page content

## QUALITY CHECKLIST
1. Tailwind CSS CDN loaded — NO inline styles
2. Custom tailwind.config in <script> with theme colors matching inspiration
3. Hero with background image, gradient overlay, and compelling CTA
4. Responsive: mobile-first with sm: md: lg: breakpoints
5. Fixed/sticky nav with backdrop-blur-md
6. hover: effects on buttons, cards, images (scale, opacity, shadow)
7. transition-all duration-300 on interactive elements
8. Images throughout — hero, about, features, gallery sections
9. Proper spacing — not cramped, not too empty
10. Footer with business name, contact info, credits

${siteData.googleAnalyticsId ? `Include GA: ${siteData.googleAnalyticsId}` : ''}
${siteData.contactFormEndpoint ? `Contact form POSTs JSON to: ${siteData.contactFormEndpoint}` : ''}

Output ONLY the HTML. No markdown fences. Start with <!DOCTYPE html>.`,
    }],
  });

  const block = response.content[0];
  let html = block && block.type === 'text' ? block.text.trim() : '';
  html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '').trim();

  if (!html.startsWith('<!DOCTYPE') && !html.startsWith('<html')) {
    const match = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    if (match) html = match[0];
    else throw new Error('AI did not generate valid HTML — starts with: ' + html.slice(0, 100));
  }

  // Verify Tailwind CDN is included
  if (!html.includes('tailwindcss.com')) {
    logger.warn('AI output missing Tailwind CDN — injecting');
    html = html.replace('<head>', '<head>\n<script src="https://cdn.tailwindcss.com"></script>');
  }

  // Inject chatbot if enabled
  if (siteData.chatbotEnabled && siteData.chatbotBusinessId) {
    const script = `<script>window.EmbledoChatConfig={businessId:"${siteData.chatbotBusinessId}",businessName:"${siteData.businessName.replace(/"/g, '\\"')}"};</script><script src="https://chat.embedo.ai/widget.js" async></script>`;
    html = html.replace('</body>', `${script}\n</body>`);
  }

  logger.info({ htmlLength: html.length, hasTailwind: html.includes('tailwindcss.com'), imageCount: images.length }, 'Full Tailwind website generated');
  return html;
}
