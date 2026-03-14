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

export async function scrapeWebsite(url: string, anthropicKey: string): Promise<ScrapedBusinessInfo> {
  logger.info({ url }, 'Scraping website');

  // Fetch the page HTML
  let html = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Embedo/1.0; +https://embedo.io)' },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
  } catch (err) {
    logger.warn({ url, err }, 'Failed to fetch website — proceeding without scrape data');
    return {};
  }

  // Strip scripts/styles, keep visible text + image srcs
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 8000); // keep under Claude's token budget

  // Pull image URLs from og:image and src attrs
  const imageMatches = Array.from(html.matchAll(/(?:og:image[^>]+content|src)=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)/gi));
  const rawImages = imageMatches.map((m) => m[1]).filter((u) => u.startsWith('http')).slice(0, 6);

  const client = new Anthropic({ apiKey: anthropicKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract business information from this restaurant website text. Return ONLY valid JSON matching this structure (omit fields you cannot find):

{
  "businessName": "string",
  "tagline": "string",
  "description": "1-2 sentence about the restaurant",
  "cuisine": "string (e.g. Italian, American, Japanese)",
  "phone": "string",
  "address": "string",
  "city": "string",
  "hours": { "Monday": "11am-10pm", ... },
  "menuItems": [{ "name": "string", "description": "string", "price": "string", "category": "string" }],
  "bookingUrl": "string (if reservation link found)",
  "socialLinks": { "instagram": "url", "facebook": "url", "yelp": "url" }
}

Website text:
${cleaned}`,
      },
    ],
  });

  let extracted: ScrapedBusinessInfo = {};
  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) extracted = JSON.parse(jsonMatch[0]) as ScrapedBusinessInfo;
  } catch {
    logger.warn('Failed to parse Claude extraction response');
  }

  if (rawImages.length > 0) {
    extracted.imageUrls = rawImages;
  }

  logger.info({ businessName: extracted.businessName }, 'Scrape complete');
  return extracted;
}
