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
  suggestedHours: Record<string, string>;
  suggestedMenuItems: Array<{ name: string; description: string; price: string; category: string }>;
  features: Array<{ title: string; description: string }>;
  testimonials: Array<{ quote: string; author: string; detail: string }>;
}

export async function generateWebsiteCopy(
  business: ScrapedBusinessInfo & { businessName: string },
  anthropicKey: string,
): Promise<GeneratedCopy> {
  logger.info({ businessName: business.businessName }, 'Generating AI copy');

  const client = new Anthropic({ apiKey: anthropicKey });

  const context = [
    `Business name: ${business.businessName}`,
    business.cuisine ? `Cuisine type: ${business.cuisine}` : 'Cuisine type: Restaurant',
    business.city ? `City: ${business.city}` : '',
    business.description ? `Description: ${business.description}` : '',
    business.tagline ? `Tagline: ${business.tagline}` : '',
    business.address ? `Address: ${business.address}` : '',
  ].filter(Boolean).join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [
      {
        role: 'user',
        content: `You are a world-class restaurant copywriter and brand strategist. Create compelling, realistic, specific content for this restaurant. Write like a Michelin Guide editor — evocative, warm, elegant. NO clichés. Be specific to the cuisine type.

${context}

Return ONLY valid JSON with this exact structure:
{
  "heroHeading": "1-6 word atmospheric headline (NOT the business name, make it poetic and specific to the cuisine)",
  "heroSubheading": "2 sentences that transport you to the restaurant. Mention city if known. Make you want to visit tonight.",
  "aboutHeading": "3-6 word warm section heading",
  "aboutBody": "3-4 sentences about the restaurant's story, philosophy, and what makes it special. Be specific and warm. Reference cuisine traditions.",
  "ctaText": "3-5 word call to action (e.g. 'Reserve Your Table', 'Book Tonight')",
  "tagline": "5-8 word tagline capturing the restaurant's essence",
  "suggestedHours": {
    "Monday": "11:30 AM – 10:00 PM",
    "Tuesday": "11:30 AM – 10:00 PM",
    "Wednesday": "11:30 AM – 10:00 PM",
    "Thursday": "11:30 AM – 11:00 PM",
    "Friday": "11:30 AM – 11:30 PM",
    "Saturday": "10:00 AM – 11:30 PM",
    "Sunday": "10:00 AM – 9:00 PM"
  },
  "suggestedMenuItems": [
    { "name": "Dish Name", "description": "Appetizing 1-2 sentence description of ingredients and preparation", "price": "$18", "category": "Starters" },
    { "name": "Dish Name", "description": "...", "price": "$24", "category": "Starters" },
    { "name": "Dish Name", "description": "...", "price": "$32", "category": "Mains" },
    { "name": "Dish Name", "description": "...", "price": "$38", "category": "Mains" },
    { "name": "Dish Name", "description": "...", "price": "$28", "category": "Mains" },
    { "name": "Dish Name", "description": "...", "price": "$36", "category": "Mains" },
    { "name": "Dish Name", "description": "...", "price": "$12", "category": "Desserts" },
    { "name": "Dish Name", "description": "...", "price": "$14", "category": "Desserts" }
  ],
  "features": [
    { "title": "Feature title (3-5 words)", "description": "One compelling sentence about why this makes dining here special." },
    { "title": "Feature title", "description": "One compelling sentence." },
    { "title": "Feature title", "description": "One compelling sentence." }
  ],
  "testimonials": [
    { "quote": "A genuine-sounding 1-2 sentence customer review. Specific and enthusiastic.", "author": "First Name L.", "detail": "Regular Guest" },
    { "quote": "Another genuine review from a different angle — maybe about the atmosphere or service.", "author": "First Name L.", "detail": "OpenTable Review" },
    { "quote": "A third review focusing on a specific dish or the overall experience.", "author": "First Name L.", "detail": "Yelp Review" }
  ]
}

Make ALL content specific to the cuisine type. Menu items should be authentic dishes you'd actually find at this type of restaurant with realistic prices. Hours should be realistic for the cuisine/city. Features should highlight genuine strengths (freshness, ambiance, technique, sourcing, etc.).`,
      },
    ],
  });

  const defaults: GeneratedCopy = {
    heroHeading: 'Where Every Meal Tells a Story',
    heroSubheading: `Experience exceptional cuisine at ${business.businessName}${business.city ? ` in ${business.city}` : ''}. A dining experience crafted with care.`,
    aboutHeading: 'Crafted With Intention',
    aboutBody: `At ${business.businessName}, we believe great food brings people together. Every dish is made with care, using quality ingredients and time-honoured techniques passed down through generations.`,
    ctaText: 'Reserve a Table',
    tagline: 'Exceptional food, unforgettable moments',
    suggestedHours: {
      Monday: '11:30 AM – 9:30 PM',
      Tuesday: '11:30 AM – 9:30 PM',
      Wednesday: '11:30 AM – 9:30 PM',
      Thursday: '11:30 AM – 10:00 PM',
      Friday: '11:30 AM – 11:00 PM',
      Saturday: '10:00 AM – 11:00 PM',
      Sunday: '10:00 AM – 9:00 PM',
    },
    suggestedMenuItems: [
      { name: 'House Salad', description: 'Fresh seasonal greens with house vinaigrette.', price: '$12', category: 'Starters' },
      { name: 'Soup of the Day', description: 'Freshly made daily with local ingredients.', price: '$10', category: 'Starters' },
      { name: 'Chef\'s Special', description: 'Our signature dish, crafted from the finest ingredients.', price: '$32', category: 'Mains' },
      { name: 'Grilled Salmon', description: 'Line-caught salmon with seasonal vegetables.', price: '$28', category: 'Mains' },
      { name: 'Braised Short Rib', description: 'Slow-braised beef with root vegetables and red wine jus.', price: '$36', category: 'Mains' },
      { name: 'Roasted Chicken', description: 'Free-range chicken with herbs and roasted potatoes.', price: '$26', category: 'Mains' },
      { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with vanilla ice cream.', price: '$12', category: 'Desserts' },
      { name: 'Crème Brûlée', description: 'Classic French custard with caramelized sugar crust.', price: '$11', category: 'Desserts' },
    ],
    features: [
      { title: 'Locally Sourced Ingredients', description: 'We partner with local farms and purveyors to bring you the freshest seasonal ingredients on every plate.' },
      { title: 'Warm, Inviting Atmosphere', description: 'From the moment you walk in, our thoughtfully designed space makes every visit feel like a special occasion.' },
      { title: 'Culinary Craftsmanship', description: 'Our chefs bring years of training and passion to every dish, elevating familiar flavors into memorable experiences.' },
    ],
    testimonials: [
      { quote: 'An absolutely wonderful dining experience. The food was outstanding and the service impeccable — we\'ll be back soon!', author: 'Sarah M.', detail: 'Regular Guest' },
      { quote: 'The atmosphere is perfect for a special night out. Everything from the ambiance to the desserts exceeded our expectations.', author: 'James T.', detail: 'OpenTable Review' },
      { quote: 'Best meal we\'ve had in years. The chef clearly has a passion for quality — every dish was a revelation.', author: 'Emily R.', detail: 'Yelp Review' },
    ],
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
