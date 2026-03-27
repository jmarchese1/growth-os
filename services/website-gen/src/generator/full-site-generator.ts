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
      content: `You are a senior front-end developer and designer at a premium agency known for creating DISTINCTIVE, memorable websites. Build a complete website using Tailwind CSS that feels genuinely hand-crafted — not generic AI output.

## DESIGN PHILOSOPHY
You must create a website with a BOLD, intentional aesthetic direction. Before writing code, commit to a clear visual identity:

**Typography**: Choose distinctive Google Fonts — NEVER use generic fonts like Inter, Roboto, Arial, or system fonts. Pick unexpected, characterful pairings: a striking display font for headings with a refined body font. Examples: Playfair Display + DM Sans, Sora + Outfit, Space Mono + Satoshi, Cormorant Garant + Work Sans.

**Color & Theme**: Commit to a cohesive palette with dominant colors and sharp accents. Avoid timid, evenly-distributed palettes. Avoid the cliched purple-gradient-on-white pattern. Draw colors from the business's identity and industry.

**Spatial Composition**: Use unexpected layouts — asymmetry, overlap, diagonal flow, grid-breaking elements. Generous negative space OR controlled density. Not everything needs to be centered in a container.

**Backgrounds & Texture**: Create atmosphere with gradient meshes, noise textures, geometric patterns, layered transparencies, or dramatic shadows. Never default to flat solid colors.

**Motion**: Add CSS animations for high-impact moments — staggered reveals on scroll, hover states that surprise, subtle background animations. Focus on a few well-orchestrated effects over scattered micro-interactions.

**CRITICAL**: Each website must feel uniquely designed for THIS specific business. No two sites should look the same. Vary between light and dark themes, different font pairings, different layout approaches. Make unexpected creative choices.

## TECH STACK (MANDATORY)
- Include: <script src="https://cdn.tailwindcss.com"></script>
- Include a <script> block to configure tailwind with custom colors/fonts matching your chosen aesthetic
- Use Google Fonts via <link> tag — pick DISTINCTIVE fonts (never Inter/Roboto/Arial)
- ALL styling via Tailwind utility classes — zero inline styles
- Use semantic HTML5 (header, main, nav, section, footer)
- Add CSS @keyframes animations in a <style> block for scroll reveals, hover effects, and ambient motion

## RULE #1: MATCH THE INSPIRATION (BUT ELEVATE IT)
Study the CSS and HTML structure below. Use it as a starting point for color palette, layout approach, and visual rhythm — but ELEVATE it with better typography, more intentional spacing, creative backgrounds, and polished micro-interactions. If the inspiration has a light cream background — yours does too but with added texture. If it has photo grids — yours does too but with unexpected compositions.

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
2. Custom tailwind.config in <script> with theme colors AND fonts matching your aesthetic
3. Hero with background image, gradient overlay, and compelling CTA — creative composition, not just centered text on image
4. Responsive: mobile-first with sm: md: lg: breakpoints
5. Fixed/sticky nav with backdrop-blur — minimal, elegant, not generic
6. Hover effects that surprise: scale transforms, color shifts, shadow reveals, underline animations
7. transition-all duration-300 on interactive elements
8. Images throughout with creative treatments — overlapping, asymmetric crops, parallax hints, gradient overlays
9. Generous, intentional spacing — use whitespace as a design element
10. Footer that matches the overall aesthetic, not an afterthought
11. DISTINCTIVE typography — display font for headings, body font for text, proper hierarchy
12. At least one scroll-triggered animation (fade-up, stagger children, count-up)

## ANTI-PATTERNS TO AVOID
- Generic card grids with equal spacing (use bento grids, overlapping layouts, or asymmetric compositions instead)
- Purple-gradient-on-white colorscheme (be more creative)
- Inter / Roboto / Arial / system-ui fonts (use distinctive Google Fonts)
- Flat solid-color backgrounds (add texture, gradients, or patterns)
- Cookie-cutter hero with centered text (try split layouts, asymmetric positioning, or editorial styles)
- Identical section layouts repeated (vary the visual rhythm section to section)

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

  // Inject chatbot widget — always inject if businessId available
  const chatbotBusinessId = siteData.chatbotBusinessId;
  if (chatbotBusinessId) {
    const chatbotUrl = process.env['CHATBOT_API_URL'] ?? 'https://chatbot-agent-production-e735.up.railway.app';
    // Try to extract the site's accent/primary color from the generated HTML
    const colorMatch = html.match(/(?:--primary|--accent|accent|primary)[\s]*[:\s]+[\s]*(['"]?)(#[0-9a-fA-F]{3,8})\1/);
    const btnColorMatch = html.match(/(?:bg-|background[:\s]+[\s]*)(\[#[0-9a-fA-F]{3,8}\]|#[0-9a-fA-F]{3,8})/);
    let widgetColor = '#7c3aed'; // default violet
    if (colorMatch?.[2]) widgetColor = colorMatch[2];
    else if (btnColorMatch?.[1]) widgetColor = btnColorMatch[1].replace(/[\[\]]/g, '');
    const script = `\n<!-- Embedo Chat Widget -->\n<script>window.EmbledoChatConfig={businessId:"${chatbotBusinessId}",apiUrl:"${chatbotUrl}",businessName:"${siteData.businessName.replace(/"/g, '\\"')}",welcomeMessage:"Hi! How can I help you today?",primaryColor:"${widgetColor}",position:"bottom-right"};</script>\n<script src="${chatbotUrl}/widget.js?v=${Date.now()}" async></script>\n`;
    // Try multiple injection points (case-insensitive)
    if (html.match(/<\/body>/i)) {
      html = html.replace(/<\/body>/i, `${script}</body>`);
    } else if (html.match(/<\/html>/i)) {
      html = html.replace(/<\/html>/i, `${script}</html>`);
    } else {
      html += script;
    }
    logger.info({ chatbotUrl, businessId: chatbotBusinessId }, 'Chatbot widget injected');
  }

  logger.info({ htmlLength: html.length, hasTailwind: html.includes('tailwindcss.com'), imageCount: images.length }, 'Full Tailwind website generated');
  return html;
}
