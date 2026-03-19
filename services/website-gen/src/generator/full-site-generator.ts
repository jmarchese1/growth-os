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

// Unsplash image queries by industry + cuisine
function getImageQueries(industryType: string, cuisine?: string): string[] {
  const base: Record<string, string[]> = {
    restaurant: ['restaurant interior dining', 'gourmet food plating', 'restaurant ambiance candlelight', 'chef cooking kitchen', 'cocktail bar drinks'],
    gym: ['modern gym equipment', 'fitness training workout', 'yoga class studio', 'crossfit athletes', 'gym interior design'],
    salon: ['hair salon interior', 'hairstylist working', 'luxury salon chairs', 'hair color treatment', 'salon products display'],
    spa: ['spa treatment massage', 'wellness zen stones', 'luxury spa interior', 'facial treatment skincare', 'spa pool relaxation'],
    cafe: ['coffee latte art', 'cozy cafe interior', 'fresh pastries bakery', 'barista making coffee', 'cafe window morning light'],
    retail: ['boutique fashion store', 'clothing rack display', 'luxury retail interior', 'shopping bags lifestyle', 'product display minimal'],
  };

  const cuisineQueries: Record<string, string[]> = {
    italian: ['italian pasta homemade', 'pizza wood oven fire', 'italian restaurant rustic', 'tiramisu dessert', 'bruschetta appetizer'],
    pizza: ['pizza wood fired oven', 'pizza dough making', 'pepperoni pizza slice', 'pizzeria interior', 'pizza ingredients fresh'],
    sushi: ['sushi platter japanese', 'sushi chef preparing', 'japanese restaurant zen', 'sashimi fresh fish', 'ramen noodles bowl'],
    mexican: ['tacos mexican food', 'mexican restaurant colorful', 'guacamole chips salsa', 'burrito fresh ingredients', 'margarita cocktail'],
    american: ['burger gourmet american', 'bbq ribs smokehouse', 'american diner retro', 'steak grilled dinner', 'milkshake classic'],
    french: ['french cuisine elegant', 'croissant paris cafe', 'french wine cheese', 'bistro paris street', 'souffle dessert french'],
    chinese: ['chinese dim sum', 'wok cooking flames', 'chinese restaurant lanterns', 'noodles chopsticks', 'peking duck chinese'],
    indian: ['indian curry spices', 'naan bread tandoori', 'indian restaurant colorful', 'biryani rice dish', 'chai tea masala'],
    thai: ['thai food pad thai', 'thai curry coconut', 'thai restaurant tropical', 'spring rolls fresh', 'mango sticky rice'],
    cookies: ['fresh baked cookies', 'chocolate chip cookies close up', 'cookie dough baking', 'bakery cookies display', 'warm cookies milk glass'],
    bakery: ['artisan bread bakery', 'pastry display case', 'baker kneading dough', 'croissant golden flaky', 'cupcakes frosting colorful'],
    seafood: ['fresh seafood platter', 'lobster dinner elegant', 'oysters ice lemon', 'grilled fish herbs', 'seafood restaurant ocean view'],
    steakhouse: ['steak ribeye grilled', 'steakhouse dark interior', 'meat aging dry', 'wine cellar restaurant', 'steak dinner candles'],
  };

  const industry = base[industryType] ?? base['restaurant']!;
  if (cuisine) {
    const lower = cuisine.toLowerCase();
    for (const [key, queries] of Object.entries(cuisineQueries)) {
      if (lower.includes(key)) return queries;
    }
  }
  return industry;
}

/**
 * AI generates the COMPLETE website HTML using Tailwind CSS CDN.
 * Includes auto-sourced Unsplash images based on business type.
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
  const imageQueries = getImageQueries(industryType, siteData.cuisine);

  // Build Unsplash image URLs for the AI to use
  const unsplashImages = imageQueries.map((q, i) =>
    `Image ${i + 1}: https://images.unsplash.com/photo-${1550000000000 + i * 100000000}?w=800&q=80 (search: "${q}")\nAlt: Use src="https://source.unsplash.com/800x600/?${encodeURIComponent(q)}" for this image`
  ).join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You are a senior front-end developer building a premium website. Use Tailwind CSS for ALL styling.

## TECH STACK
- Use the Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
- Use Google Fonts via <link> tag
- Write clean semantic HTML with Tailwind utility classes
- NO inline styles. ALL styling via Tailwind classes.
- Add a <script> block with tailwind.config to customize colors and fonts

## YOUR #1 RULE
Study the inspiration source code below. MATCH its visual style — same color tones, layout patterns, typography weight, spacing rhythm. If the inspiration is light and airy, yours is light and airy. If it's dark and moody, yours is dark and moody. DO NOT default to dark background + centered serif text.

## IMAGES — CRITICAL
Every section needs relevant imagery. Use these Unsplash URLs based on the business type:
${unsplashImages}

Rules for images:
- Hero MUST have a background image (use the first relevant Unsplash URL if no hero image provided)
- Include at least 3-4 images throughout the page (food shots, interior, ambiance)
- Use object-cover and proper aspect ratios
- Gallery section should have 4-6 images in a grid
${siteData.heroImage ? `- Hero image provided: ${siteData.heroImage}` : '- No hero image provided — use: https://source.unsplash.com/1600x900/?' + encodeURIComponent(imageQueries[0] ?? 'restaurant')}
${galleryUrls.length > 0 ? `- Gallery images provided: ${galleryUrls.join(', ')}` : `- No gallery images — use Unsplash: ${imageQueries.slice(1, 5).map(q => 'https://source.unsplash.com/800x600/?' + encodeURIComponent(q)).join(', ')}`}

## INSPIRATION
${inspirationStyleNotes || 'No specific inspiration. Create a premium, modern design with lots of imagery.'}

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
About heading: ${siteData.aboutHeading}
About: ${siteData.aboutBody}
CTA: ${siteData.ctaText}
${siteData.tagline ? `Tagline: ${siteData.tagline}` : ''}

${menuData ? `## MENU\n${menuData}` : ''}
${hoursData ? `## HOURS\n${hoursData}` : ''}
${siteData.features?.length ? `## FEATURES\n${siteData.features.map(f => `- ${f.title}: ${f.description}`).join('\n')}` : ''}
${siteData.testimonials?.length ? `## TESTIMONIALS\n${siteData.testimonials.map(t => `"${t.quote}" — ${t.author}`).join('\n')}` : ''}

## SECTIONS: ${enabledSections.join(', ')}
${enabledPages.length > 0 ? `Extra pages: ${enabledPages.map(p => p.label).join(', ')}` : ''}

## QUALITY REQUIREMENTS
1. Use Tailwind CSS classes exclusively — no inline styles
2. Responsive: mobile-first with sm:, md:, lg: breakpoints
3. Include hover effects (hover:scale-105, hover:opacity-80, etc.)
4. Smooth scroll (scroll-smooth on html)
5. Fixed/sticky nav with backdrop-blur
6. Proper image treatment — object-cover, rounded corners where appropriate, overlay gradients on hero
7. Add subtle animations with transition-all, duration-300
8. The site must look like it was designed by a premium agency
9. Include proper meta tags
10. Use semantic HTML (header, main, section, footer, nav)
11. FILL the page with content and images — no empty white sections

${siteData.googleAnalyticsId ? `Include GA: ${siteData.googleAnalyticsId}` : ''}
${siteData.metaPixelId ? `Include Meta Pixel: ${siteData.metaPixelId}` : ''}
${enabledPages.some(p => p.id === 'contact') && siteData.contactFormEndpoint ? `Contact form POSTs to: ${siteData.contactFormEndpoint}` : ''}

Output ONLY the HTML starting with <!DOCTYPE html>. No explanation.`,
    }],
  });

  const block = response.content[0];
  let html = block && block.type === 'text' ? block.text.trim() : '';
  html = html.replace(/^```(?:html)?\n?/, '').replace(/\n?```$/, '').trim();

  if (!html.startsWith('<!DOCTYPE') && !html.startsWith('<html')) {
    const match = html.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    if (match) html = match[0];
    else throw new Error('AI did not generate valid HTML — response starts with: ' + html.slice(0, 100));
  }

  if (siteData.chatbotEnabled && siteData.chatbotBusinessId) {
    const script = `<script>window.EmbledoChatConfig={businessId:"${siteData.chatbotBusinessId}",businessName:"${siteData.businessName.replace(/"/g, '\\"')}"};</script><script src="https://chat.embedo.ai/widget.js" async></script>`;
    html = html.replace('</body>', `${script}\n</body>`);
  }

  logger.info({ htmlLength: html.length }, 'Full Tailwind website generated');
  return html;
}
