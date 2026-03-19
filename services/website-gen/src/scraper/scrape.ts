import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@embedo/utils';

const logger = createLogger('website-gen:scraper');

export interface ScrapedBusinessInfo {
  businessName?: string;
  tagline?: string;
  description?: string;
  cuisine?: string;
  phone?: string;
  address?: string;
  city?: string;
  hours?: Record<string, string>;
  menuItems?: Array<{ name: string; description?: string; price?: string; category?: string }>;
  imageUrls?: string[];
  socialLinks?: { instagram?: string; facebook?: string; yelp?: string };
  bookingUrl?: string;
}

// Full browser headers to avoid blocks
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Try multiple URL forms to maximize success rate
async function fetchWithFallbacks(rawUrl: string): Promise<{ html: string; base: string } | null> {
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const parsed = new URL(url);

  const candidates = [
    url,
    // try www if not already
    !parsed.hostname.startsWith('www.') ? `${parsed.protocol}//www.${parsed.hostname}${parsed.pathname}` : null,
    // try http if https fails
    url.startsWith('https://') ? url.replace('https://', 'http://') : null,
  ].filter((u): u is string => u !== null);

  for (const candidate of candidates) {
    try {
      const html = await fetchPage(candidate);
      return { html, base: new URL(candidate).origin };
    } catch {
      // try next
    }
  }
  return null;
}

// Fetch additional subpages that often have the richest data
async function fetchSubpages(base: string, homeHtml: string): Promise<string[]> {
  // Find internal links likely to have menu/hours/contact info
  const linkPattern = /href=["']([^"'#?]+?)["']/gi;
  const links = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = linkPattern.exec(homeHtml)) !== null) {
    const href = m[1];
    if (!href) continue;
    const lower = href.toLowerCase();
    if (/\b(menu|food|drinks|hours|contact|about|location|reserv|order|services|classes|pricing|treatments)\b/.test(lower)) {
      try {
        const full = href.startsWith('http') ? href : `${base}${href.startsWith('/') ? '' : '/'}${href}`;
        links.add(full);
      } catch { /* ignore invalid URLs */ }
    }
  }

  const results: string[] = [];
  for (const link of Array.from(links).slice(0, 3)) {
    try {
      const html = await fetchPage(link);
      results.push(html);
    } catch { /* skip failed subpages */ }
  }
  return results;
}

// Extract JSON-LD structured data (restaurants often have rich schema)
function extractJsonLd(html: string): Record<string, unknown> {
  const matches = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const match of matches) {
    try {
      const data = JSON.parse(match[1] ?? '{}') as Record<string, unknown>;
      if (data['@type'] && typeof data['@type'] === 'string') return data;
    } catch { /* ignore */ }
  }
  return {};
}

// Extract meta tags (og:, twitter:, standard)
function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const metaPattern = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  const metaPattern2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi;

  let m: RegExpExecArray | null;
  while ((m = metaPattern.exec(html)) !== null) { meta[m[1] ?? ''] = m[2] ?? ''; }
  while ((m = metaPattern2.exec(html)) !== null) { meta[m[2] ?? ''] = m[1] ?? ''; }
  return meta;
}

// Extract all image URLs with priority on og/twitter images
function extractImages(html: string): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  // Priority: og:image and twitter:image first
  const ogImages = Array.from(html.matchAll(/(?:og:image|twitter:image)[^>]*content=["']([^"']+)["']/gi))
    .concat(Array.from(html.matchAll(/content=["']([^"']+)["'][^>]*(?:og:image|twitter:image)/gi)));
  for (const m of ogImages) {
    const src = m[1];
    if (src && src.startsWith('http') && !seen.has(src)) { seen.add(src); images.push(src); }
  }

  // Then src attrs of img tags
  const srcImages = Array.from(html.matchAll(/\bsrc=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)/gi));
  for (const m of srcImages) {
    const src = m[1];
    if (src && src.startsWith('http') && !seen.has(src) && !src.includes('icon') && !src.includes('logo')) {
      seen.add(src); images.push(src);
    }
  }

  return images.slice(0, 8);
}

// Clean HTML to plain text for Claude
function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function scrapeWebsite(url: string, anthropicKey: string): Promise<ScrapedBusinessInfo> {
  logger.info({ url }, 'Scraping website');

  const fetched = await fetchWithFallbacks(url);
  if (!fetched) {
    logger.warn({ url }, 'Failed to fetch website — proceeding without scrape data');
    return {};
  }

  const { html: homeHtml, base } = fetched;

  // Fetch additional subpages in parallel
  const subpageHtmls = await fetchSubpages(base, homeHtml);

  // Extract structured data
  const jsonLd = extractJsonLd(homeHtml);
  const meta = extractMeta(homeHtml);
  const imageUrls = extractImages([homeHtml, ...subpageHtmls].join('\n'));

  // Combine and clean text from all pages
  const allHtml = [homeHtml, ...subpageHtmls].join('\n\n--- PAGE BREAK ---\n\n');
  const cleanedText = cleanHtml(allHtml).slice(0, 12000);

  // Build structured context from JSON-LD and meta to help Claude
  const structuredContext = [
    jsonLd['name'] ? `Schema.org name: ${String(jsonLd['name'])}` : '',
    jsonLd['description'] ? `Schema.org description: ${String(jsonLd['description'])}` : '',
    jsonLd['telephone'] ? `Schema.org phone: ${String(jsonLd['telephone'])}` : '',
    jsonLd['address'] ? `Schema.org address: ${JSON.stringify(jsonLd['address'])}` : '',
    jsonLd['openingHoursSpecification'] ? `Schema.org hours: ${JSON.stringify(jsonLd['openingHoursSpecification'])}` : '',
    jsonLd['servesCuisine'] ? `Schema.org cuisine: ${String(jsonLd['servesCuisine'])}` : '',
    meta['og:title'] ? `OG title: ${meta['og:title']}` : '',
    meta['og:description'] ? `OG description: ${meta['og:description']}` : '',
    meta['description'] ? `Meta description: ${meta['description']}` : '',
  ].filter(Boolean).join('\n');

  const client = new Anthropic({ apiKey: anthropicKey });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are extracting business information from a website to help build a new website for them. Extract every piece of useful information you can find.

${structuredContext ? `## Structured Data (high confidence)\n${structuredContext}\n\n` : ''}## Page Text (may span multiple pages)\n${cleanedText}

Return ONLY valid JSON. Include all fields you can find, omit ones you cannot find:

{
  "businessName": "string",
  "tagline": "string",
  "description": "2-3 sentence description of the business",
  "cuisine": "string (food type for restaurants, service type for others)",
  "phone": "string (formatted)",
  "address": "full street address string",
  "city": "city, state",
  "hours": {
    "Monday": "11am–10pm or Closed",
    "Tuesday": "...",
    "Wednesday": "...",
    "Thursday": "...",
    "Friday": "...",
    "Saturday": "...",
    "Sunday": "..."
  },
  "menuItems": [
    { "name": "item name", "description": "brief description", "price": "$XX", "category": "category" }
  ],
  "bookingUrl": "full URL if found",
  "socialLinks": {
    "instagram": "full URL",
    "facebook": "full URL",
    "yelp": "full URL"
  }
}

Extract as many menu/service items as you can find (up to 20). Be precise with hours format. If you see a phone number anywhere, include it.`,
      },
    ],
  });

  let extracted: ScrapedBusinessInfo = {};
  try {
    const block = message.content[0];
    const text = block && block.type === 'text' ? block.text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) extracted = JSON.parse(jsonMatch[0]) as ScrapedBusinessInfo;
  } catch {
    logger.warn('Failed to parse Claude extraction response');
  }

  if (imageUrls.length > 0) {
    extracted.imageUrls = imageUrls;
  }

  logger.info({ businessName: extracted.businessName, fields: Object.keys(extracted) }, 'Scrape complete');
  return extracted;
}

// Extract CSS design tokens from raw HTML/CSS for deeper style analysis
function extractDesignTokens(html: string): string {
  const tokens: string[] = [];

  // Extract inline style colors
  const colorMatches = html.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)/g) ?? [];
  const uniqueColors = [...new Set(colorMatches)].slice(0, 15);
  if (uniqueColors.length) tokens.push(`Colors found: ${uniqueColors.join(', ')}`);

  // Extract font families from CSS
  const fontMatches = html.match(/font-family:\s*([^;}"]+)/gi) ?? [];
  const uniqueFonts = [...new Set(fontMatches.map(f => f.replace(/font-family:\s*/i, '').trim()))].slice(0, 8);
  if (uniqueFonts.length) tokens.push(`Fonts: ${uniqueFonts.join(' | ')}`);

  // Extract font sizes
  const sizeMatches = html.match(/font-size:\s*([^;}"]+)/gi) ?? [];
  const uniqueSizes = [...new Set(sizeMatches.map(s => s.replace(/font-size:\s*/i, '').trim()))].slice(0, 10);
  if (uniqueSizes.length) tokens.push(`Font sizes: ${uniqueSizes.join(', ')}`);

  // Extract background colors
  const bgMatches = html.match(/background(?:-color)?:\s*([^;}"]+)/gi) ?? [];
  const uniqueBgs = [...new Set(bgMatches.map(b => b.replace(/background(?:-color)?:\s*/i, '').trim()))].filter(b => !b.includes('url(')).slice(0, 8);
  if (uniqueBgs.length) tokens.push(`Backgrounds: ${uniqueBgs.join(', ')}`);

  // Extract border-radius values (rounded corners style)
  const radiusMatches = html.match(/border-radius:\s*([^;}"]+)/gi) ?? [];
  const uniqueRadii = [...new Set(radiusMatches.map(r => r.replace(/border-radius:\s*/i, '').trim()))].slice(0, 5);
  if (uniqueRadii.length) tokens.push(`Border radius: ${uniqueRadii.join(', ')}`);

  // Extract CSS animations/transitions
  const animMatches = html.match(/(?:animation|transition):\s*([^;}"]+)/gi) ?? [];
  if (animMatches.length) tokens.push(`Animations: ${animMatches.length} animation/transition rules found`);

  // Extract layout patterns (grid/flex)
  const gridCount = (html.match(/display:\s*grid/gi) ?? []).length;
  const flexCount = (html.match(/display:\s*flex/gi) ?? []).length;
  if (gridCount || flexCount) tokens.push(`Layout: ${gridCount} grid + ${flexCount} flex containers`);

  return tokens.join('\n');
}

// Scrape an inspiration site via HTTP and return a style description
export async function scrapeForInspiration(url: string, anthropicKey: string): Promise<string> {
  logger.info({ url }, 'Scraping inspiration site via HTTP');
  try {
    const fetched = await fetchWithFallbacks(url);
    if (!fetched) return '';

    const { html } = fetched;
    const meta = extractMeta(html);
    const ogTitle = meta['og:title'] ?? '';
    const cleanedText = cleanHtml(html).slice(0, 5000);
    const designTokens = extractDesignTokens(html);

    const client = new Anthropic({ apiKey: anthropicKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Analyze this website and write 5-8 sentences describing its visual design style. Be VERY specific about exact colors, fonts, layout patterns, and spacing — someone will use this to recreate the look.

Include:
1. Color palette with hex codes if visible (e.g. "warm ivory #f5f0e8 background, dark charcoal #2a2420 text, burnt orange #e07a3b accent")
2. Typography (serif/sans-serif, weight, size hierarchy)
3. Layout (centered/asymmetric, full-width/contained, grid patterns)
4. Hero style (full-bleed image, split layout, text overlay approach)
5. Card/component style (rounded/sharp, bordered/shadow, spacing)
6. Overall mood (warm/cool, minimal/rich, dark/light)
${ogTitle ? `\nSite title: ${ogTitle}` : ''}
${designTokens ? `\n## Design tokens extracted from CSS:\n${designTokens}` : ''}

Page content preview:\n${cleanedText}

Style description only, no preamble:`,
      }],
    });

    const block = message.content[0];
    const result = block && block.type === 'text' ? block.text.trim() : '';
    logger.info({ url, resultLength: result.length }, 'Inspiration analysis complete');
    return result;
  } catch (err) {
    logger.warn({ url, error: String(err) }, 'Failed to scrape inspiration site');
    return '';
  }
}
