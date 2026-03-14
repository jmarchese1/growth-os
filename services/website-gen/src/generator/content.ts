import Anthropic from '@anthropic-ai/sdk';
import type { ScrapedBusinessInfo } from '../scraper/scrape.js';
import { createLogger } from '@embedo/utils';

const logger = createLogger('website-gen:content');

export interface GeneratedCopy {
  heroHeading: string;
  heroSubheading: string;
  aboutHeading: string;
  aboutBody: string;
  ctaText: string;
  tagline: string;
}

export async function generateWebsiteCopy(
  business: ScrapedBusinessInfo & { businessName: string },
  anthropicKey: string,
): Promise<GeneratedCopy> {
  logger.info({ businessName: business.businessName }, 'Generating AI copy');

  const client = new Anthropic({ apiKey: anthropicKey });

  const context = [
    `Business name: ${business.businessName}`,
    business.cuisine ? `Cuisine: ${business.cuisine}` : '',
    business.city ? `City: ${business.city}` : '',
    business.description ? `Description: ${business.description}` : '',
    business.tagline ? `Tagline: ${business.tagline}` : '',
    business.address ? `Address: ${business.address}` : '',
  ].filter(Boolean).join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `You are writing website copy for a restaurant. Be evocative, warm, and elegant — like a Michelin Guide description. Short punchy sentences. No clichés.

${context}

Return ONLY valid JSON:
{
  "heroHeading": "1-6 word powerful headline (NOT the business name, make it atmospheric and compelling)",
  "heroSubheading": "1-2 sentences that make you want to visit. Mention the city if known.",
  "aboutHeading": "3-6 word warm heading for the about section",
  "aboutBody": "2-3 sentences telling the story of this restaurant. Warm, genuine, specific where possible.",
  "ctaText": "3-5 word call to action button text (e.g. Reserve Your Table, Book a Table, Call Us)",
  "tagline": "5-8 word tagline that captures the essence of this restaurant"
}`,
      },
    ],
  });

  const defaults: GeneratedCopy = {
    heroHeading: 'Where Every Meal Tells a Story',
    heroSubheading: `Experience exceptional cuisine at ${business.businessName}${business.city ? ` in ${business.city}` : ''}.`,
    aboutHeading: 'Crafted With Intention',
    aboutBody: `At ${business.businessName}, we believe great food brings people together. Every dish is made with care, using quality ingredients and time-honoured techniques.`,
    ctaText: 'Reserve a Table',
    tagline: `Exceptional food, unforgettable moments`,
  };

  try {
    const block = message.content[0];
    const text = block && block.type === 'text' ? block.text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedCopy;
      return { ...defaults, ...parsed };
    }
  } catch {
    logger.warn('Failed to parse AI copy response, using defaults');
  }

  return defaults;
}
