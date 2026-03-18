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

type IndustryId = 'restaurant' | 'gym' | 'salon' | 'spa' | 'cafe' | 'retail';

interface IndustryMeta {
  writerRole: string;
  hoursContext: string;
  itemsInstruction: string;
  featuresContext: string;
  ctaDefault: string;
  testimonialsContext: string;
}

const INDUSTRY_META: Record<IndustryId, IndustryMeta> = {
  restaurant: {
    writerRole: 'world-class restaurant copywriter and brand strategist',
    hoursContext: 'realistic restaurant hours — typically 11:30am–10pm weekdays, later on weekends, brunch on Saturday/Sunday',
    itemsInstruction: '8 authentic food/drink menu items typical for this cuisine, with appetizing descriptions and realistic prices. Categories: Starters, Mains, Desserts.',
    featuresContext: 'restaurant strengths: ingredient sourcing, culinary technique, ambiance, chef expertise, community',
    ctaDefault: 'Reserve a Table',
    testimonialsContext: 'dining reviews mentioning food quality, service, ambiance, specific dishes',
  },
  gym: {
    writerRole: 'fitness brand copywriter and athletic marketing expert',
    hoursContext: 'realistic gym hours — typically 5am–10pm weekdays, 7am–8pm weekends',
    itemsInstruction: '8 membership tiers or class types with descriptions and monthly/session prices. Categories: Memberships, Classes, Personal Training.',
    featuresContext: 'gym strengths: equipment quality, certified coaches, community culture, programming variety, results',
    ctaDefault: 'Start Your Free Trial',
    testimonialsContext: 'member reviews mentioning fitness results, coach quality, community, specific classes or equipment',
  },
  salon: {
    writerRole: 'luxury hair salon copywriter and beauty brand expert',
    hoursContext: 'realistic salon hours — typically 9am–7pm Tuesday through Saturday, closed Sunday/Monday',
    itemsInstruction: '8 hair salon services with descriptions and realistic prices. Categories: Cuts & Styling, Color Services, Treatments.',
    featuresContext: 'salon strengths: stylist expertise, premium products, personalized consultation, technique mastery',
    ctaDefault: 'Book Your Appointment',
    testimonialsContext: 'client reviews mentioning transformation, stylist skill, color results, overall experience',
  },
  spa: {
    writerRole: 'luxury spa and wellness copywriter',
    hoursContext: 'realistic spa hours — typically 10am–8pm daily, sometimes closed Monday',
    itemsInstruction: '8 spa treatments or wellness packages with descriptions and realistic prices. Categories: Massages, Facials, Body Treatments.',
    featuresContext: 'spa strengths: therapeutic techniques, premium products, serene atmosphere, certified therapists, holistic approach',
    ctaDefault: 'Book Your Treatment',
    testimonialsContext: 'guest reviews mentioning relaxation, therapist skill, specific treatments, ambiance, overall wellness experience',
  },
  cafe: {
    writerRole: 'specialty coffee and cafe brand copywriter',
    hoursContext: 'realistic cafe hours — typically 7am–5pm or 6pm daily, earlier on weekends',
    itemsInstruction: '8 coffee shop menu items with descriptions and realistic prices. Categories: Coffee & Drinks, Food & Pastries.',
    featuresContext: 'cafe strengths: bean sourcing and roasting, brewing methods, food quality, cozy atmosphere, community space',
    ctaDefault: 'Visit Us Today',
    testimonialsContext: 'customer reviews mentioning coffee quality, food, atmosphere, regulars, specific drinks or pastries',
  },
  retail: {
    writerRole: 'retail boutique and fashion brand copywriter',
    hoursContext: 'realistic boutique hours — typically 10am–6pm Monday–Saturday, 11am–5pm Sunday',
    itemsInstruction: '8 featured products or product categories with descriptions and realistic prices. Categories: Featured, New Arrivals.',
    featuresContext: 'boutique strengths: curated selection, unique finds, personalized styling, exclusive brands, quality craftsmanship',
    ctaDefault: 'Shop the Collection',
    testimonialsContext: 'shopper reviews mentioning unique finds, styling help, product quality, the shopping experience',
  },
};

function getIndustryMeta(industryType?: string): IndustryMeta {
  const id = (industryType ?? 'restaurant') as IndustryId;
  return INDUSTRY_META[id] ?? INDUSTRY_META['restaurant'];
}

export async function generateWebsiteCopy(
  business: ScrapedBusinessInfo & { businessName: string; industryType?: string },
  anthropicKey: string,
): Promise<GeneratedCopy> {
  logger.info({ businessName: business.businessName, industry: business.industryType }, 'Generating AI copy');

  const client = new Anthropic({ apiKey: anthropicKey });
  const meta = getIndustryMeta(business.industryType);
  const industryLabel = business.industryType ?? 'restaurant';

  const context = [
    `Business name: ${business.businessName}`,
    `Industry: ${industryLabel}`,
    business.cuisine ? `Specialty / type: ${business.cuisine}` : '',
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
        content: `You are a ${meta.writerRole}. Create compelling, specific, realistic website content for this business. Write like an award-winning brand agency — evocative, warm, precise. NO clichés. Be specific to the industry and specialty type.

${context}

Return ONLY valid JSON with this exact structure:
{
  "heroHeading": "1-6 word atmospheric headline (NOT the business name — poetic, specific to the industry and specialty)",
  "heroSubheading": "2 sentences that transport you to the experience. Mention the city if known. Make you want to visit or join today.",
  "aboutHeading": "3-6 word warm section heading",
  "aboutBody": "3-4 sentences about this business's story, philosophy, and what makes it special. Be specific and warm. Reference industry traditions or specialties.",
  "ctaText": "${meta.ctaDefault} (or a natural variation)",
  "tagline": "5-8 word tagline capturing the essence",
  "suggestedHours": {
    "Monday": "...",
    "Tuesday": "...",
    "Wednesday": "...",
    "Thursday": "...",
    "Friday": "...",
    "Saturday": "...",
    "Sunday": "..."
  },
  "suggestedMenuItems": [
    { "name": "Item Name", "description": "Compelling 1-2 sentence description", "price": "$XX", "category": "Category" },
    { "name": "...", "description": "...", "price": "$XX", "category": "..." },
    { "name": "...", "description": "...", "price": "$XX", "category": "..." },
    { "name": "...", "description": "...", "price": "$XX", "category": "..." },
    { "name": "...", "description": "...", "price": "$XX", "category": "..." },
    { "name": "...", "description": "...", "price": "$XX", "category": "..." },
    { "name": "...", "description": "...", "price": "$XX", "category": "..." },
    { "name": "...", "description": "...", "price": "$XX", "category": "..." }
  ],
  "features": [
    { "title": "3-5 word feature title", "description": "One compelling sentence about why this makes the experience special." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ],
  "testimonials": [
    { "quote": "A genuine-sounding 1-2 sentence review. Specific and enthusiastic.", "author": "First Name L.", "detail": "Regular" },
    { "quote": "Another genuine review from a different angle.", "author": "First Name L.", "detail": "Google Review" },
    { "quote": "A third review focusing on a specific experience.", "author": "First Name L.", "detail": "Yelp Review" }
  ]
}

Hours guidance: Use ${meta.hoursContext}.
Items guidance: Generate ${meta.itemsInstruction}
Features guidance: Highlight ${meta.featuresContext}.
Testimonials guidance: Write ${meta.testimonialsContext}.

Make ALL content authentic and specific. Hours should vary realistically across days. Prices should be realistic for the industry and city.`,
      },
    ],
  });

  const defaults = buildDefaults(business.businessName, business.city, industryLabel, meta);

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

function buildDefaults(
  businessName: string,
  city?: string,
  industryType?: string,
  meta?: IndustryMeta,
): GeneratedCopy {
  const m = meta ?? getIndustryMeta(industryType);
  const cityStr = city ? ` in ${city}` : '';

  const industryDefaults: Record<string, Partial<GeneratedCopy>> = {
    gym: {
      heroHeading: 'Where Strength Meets Community',
      heroSubheading: `${businessName}${cityStr} is more than a gym — it's a movement. World-class coaching, elite programming, and a community that pushes you further.`,
      aboutHeading: 'Built for Results',
      aboutBody: `At ${businessName}, we believe fitness transforms lives. Our certified coaches create personalized programming for every level, in an environment that's as welcoming to beginners as it is to seasoned athletes.`,
      suggestedHours: { Monday: '5:00 AM – 10:00 PM', Tuesday: '5:00 AM – 10:00 PM', Wednesday: '5:00 AM – 10:00 PM', Thursday: '5:00 AM – 10:00 PM', Friday: '5:00 AM – 9:00 PM', Saturday: '7:00 AM – 6:00 PM', Sunday: '8:00 AM – 5:00 PM' },
      suggestedMenuItems: [
        { name: 'Monthly Membership', description: 'Unlimited access to all equipment and open gym sessions.', price: '$59/mo', category: 'Memberships' },
        { name: 'Premium Membership', description: 'Unlimited gym access plus 4 group classes per month.', price: '$89/mo', category: 'Memberships' },
        { name: 'CrossFit Classes', description: 'High-intensity functional fitness with certified coaches. All levels welcome.', price: '$25/class', category: 'Classes' },
        { name: 'Yoga & Mobility', description: 'Restore and strengthen with expert-led yoga flows and mobility work.', price: '$18/class', category: 'Classes' },
        { name: 'HIIT Bootcamp', description: '45-minute cardio and strength intervals designed for maximum results.', price: '$20/class', category: 'Classes' },
        { name: 'Spin / Cycling', description: 'High-energy indoor cycling to the beat — cardio that doesn\'t feel like cardio.', price: '$22/class', category: 'Classes' },
        { name: '1-on-1 Personal Training', description: 'Fully customized programming and coaching to hit your specific goals.', price: '$90/session', category: 'Personal Training' },
        { name: 'Nutrition Coaching', description: '8-week nutrition program with weekly check-ins and personalized meal planning.', price: '$199/8 wks', category: 'Personal Training' },
      ],
      features: [
        { title: 'Expert Certified Coaches', description: 'Every coach holds advanced certifications and brings genuine passion to helping you reach your goals.' },
        { title: 'State-of-the-Art Equipment', description: 'Commercial-grade equipment, functional training zones, and the tools to train at every level.' },
        { title: 'Community That Drives Results', description: 'The best motivation is the people around you — our tight-knit community celebrates every milestone.' },
      ],
      testimonials: [
        { quote: 'I\'ve tried a dozen gyms and nothing compares. The coaches actually know your name and push you in the best way possible.', author: 'Marcus T.', detail: 'Member since 2022' },
        { quote: 'Lost 30 pounds in 4 months. The programming here is on another level — structured, progressive, and actually fun.', author: 'Sarah K.', detail: 'Google Review' },
        { quote: 'The morning CrossFit crew feels like family. This place is the reason I actually look forward to 5am workouts.', author: 'James R.', detail: 'Yelp Review' },
      ],
    },
    salon: {
      heroHeading: 'Your Best Hair Starts Here',
      heroSubheading: `${businessName}${cityStr} is where artistry meets precision. Expert stylists, premium color, and a chair that feels like a sanctuary.`,
      aboutHeading: 'Crafted for You',
      aboutBody: `At ${businessName}, every appointment is a collaboration. Our stylists combine years of technical training with a personal touch that goes beyond the cut — we listen, we advise, and we deliver results you\'ll love.`,
      suggestedHours: { Monday: 'Closed', Tuesday: '9:00 AM – 7:00 PM', Wednesday: '9:00 AM – 7:00 PM', Thursday: '9:00 AM – 8:00 PM', Friday: '9:00 AM – 7:00 PM', Saturday: '8:00 AM – 6:00 PM', Sunday: '10:00 AM – 4:00 PM' },
      suggestedMenuItems: [
        { name: "Women's Haircut", description: 'Custom cut tailored to your face shape, lifestyle, and texture. Includes wash and style.', price: '$75+', category: 'Cuts & Styling' },
        { name: "Men's Cut & Style", description: 'Precision cut with expert styling. Classic or modern — always sharp.', price: '$45+', category: 'Cuts & Styling' },
        { name: 'Full Balayage', description: 'Hand-painted color for a natural, sun-kissed effect with seamless dimension.', price: '$185+', category: 'Color Services' },
        { name: 'Full Highlights', description: 'Foil highlights for maximum brightness and dimension throughout the hair.', price: '$145+', category: 'Color Services' },
        { name: 'Color Correction', description: 'Expert color correction to get you to your dream shade — no matter the starting point.', price: '$250+', category: 'Color Services' },
        { name: 'Keratin Treatment', description: '90-day smoothing treatment that eliminates frizz and cuts styling time in half.', price: '$225+', category: 'Treatments' },
        { name: 'Deep Conditioning', description: 'Intensive moisture treatment to restore shine, strength, and softness.', price: '$45', category: 'Treatments' },
        { name: 'Blowout & Style', description: 'Silky, salon-perfect blowout with your choice of finish — straight, waves, or curls.', price: '$55', category: 'Cuts & Styling' },
      ],
      features: [
        { title: 'Master Color Specialists', description: 'Our colorists train continuously with global brands to deliver the most advanced techniques available.' },
        { title: 'Premium Products Only', description: 'We use Oribe, Kerastase, and Redken — because your hair deserves nothing less than the best.' },
        { title: 'Personalized Consultations', description: 'Every visit starts with a thorough consultation so we fully understand your vision before we begin.' },
      ],
      testimonials: [
        { quote: 'Finally found my forever stylist. She understood exactly what I wanted and my hair has never looked better.', author: 'Rachel M.', detail: 'Regular Client' },
        { quote: 'The balayage here is unreal. I get compliments constantly and I\'ve never felt more confident about my hair.', author: 'Olivia P.', detail: 'Google Review' },
        { quote: 'The whole experience is luxurious — from the consultation to the blowout. Worth every penny.', author: 'Diane T.', detail: 'Yelp Review' },
      ],
    },
    spa: {
      heroHeading: 'Surrender to Stillness',
      heroSubheading: `${businessName}${cityStr} is a sanctuary from the pace of everyday life. Expert therapists, healing rituals, and treatments that restore from within.`,
      aboutHeading: 'Healing in Every Touch',
      aboutBody: `At ${businessName}, wellness is our highest intention. Our licensed therapists combine evidence-based techniques with holistic traditions to create treatments that go far beyond relaxation — they restore, renew, and rejuvenate from the inside out.`,
      suggestedHours: { Monday: 'Closed', Tuesday: '10:00 AM – 8:00 PM', Wednesday: '10:00 AM – 8:00 PM', Thursday: '10:00 AM – 8:00 PM', Friday: '10:00 AM – 9:00 PM', Saturday: '9:00 AM – 9:00 PM', Sunday: '10:00 AM – 7:00 PM' },
      suggestedMenuItems: [
        { name: 'Swedish Massage', description: 'Long, flowing strokes to ease tension, improve circulation, and calm the nervous system.', price: '$110/60 min', category: 'Massages' },
        { name: 'Deep Tissue Massage', description: 'Targeted pressure to release chronic muscle tension and restore full range of motion.', price: '$130/60 min', category: 'Massages' },
        { name: 'Hot Stone Therapy', description: 'Heated volcanic basalt stones melt tension while warming and softening deep tissue.', price: '$155/75 min', category: 'Massages' },
        { name: 'Signature Facial', description: 'Custom facial tailored to your skin — cleansing, exfoliation, extractions, and mask.', price: '$120/60 min', category: 'Facials' },
        { name: 'Anti-Aging Facial', description: 'Advanced treatment targeting fine lines, firmness, and luminosity with clinical actives.', price: '$165/75 min', category: 'Facials' },
        { name: 'Body Scrub & Wrap', description: 'Exfoliating body polish followed by a mineral-rich wrap to hydrate and detoxify.', price: '$145/75 min', category: 'Body Treatments' },
        { name: 'Couples Retreat', description: 'Side-by-side massages in our private couples suite — the ultimate shared escape.', price: '$260/60 min', category: 'Body Treatments' },
        { name: 'Wellness Day Package', description: 'Full-day experience: massage, facial, body treatment, and spa lunch. The works.', price: '$395', category: 'Body Treatments' },
      ],
      features: [
        { title: 'Licensed Master Therapists', description: 'Every therapist is licensed, continuously trained, and deeply passionate about the healing arts.' },
        { title: 'Curated Luxury Products', description: 'We partner with ELEMIS, La Mer, and Eminence to ensure every product is as effective as it is indulgent.' },
        { title: 'A True Sanctuary', description: 'From the moment you arrive, the outside world fades — our space is designed for complete immersion.' },
      ],
      testimonials: [
        { quote: 'I\'ve been to spas all over the world and this is genuinely one of the best experiences I\'ve ever had. Transformative.', author: 'Catherine B.', detail: 'Regular Guest' },
        { quote: 'The hot stone massage here is something else. I left feeling lighter than I have in years.', author: 'Michael S.', detail: 'Google Review' },
        { quote: 'Booked the couples retreat for our anniversary — absolutely perfect. The staff made everything feel so special.', author: 'Laura & Dan W.', detail: 'Yelp Review' },
      ],
    },
    cafe: {
      heroHeading: 'Coffee Worth Waking Up For',
      heroSubheading: `${businessName}${cityStr} is your daily ritual — specialty coffee, fresh food, and a space that feels like home from the very first sip.`,
      aboutHeading: 'More Than a Coffee Shop',
      aboutBody: `At ${businessName}, we treat coffee as craft. Every bean is sourced from ethical farms, roasted to order, and brewed with techniques that honor the work of the farmers behind every cup. Pull up a chair — this is your spot.`,
      suggestedHours: { Monday: '7:00 AM – 5:00 PM', Tuesday: '7:00 AM – 5:00 PM', Wednesday: '7:00 AM – 5:00 PM', Thursday: '7:00 AM – 5:00 PM', Friday: '7:00 AM – 6:00 PM', Saturday: '7:30 AM – 5:00 PM', Sunday: '8:00 AM – 4:00 PM' },
      suggestedMenuItems: [
        { name: 'Single Origin Pour Over', description: 'Hand-brewed, rotating single-origin beans — each cup a different journey.', price: '$6', category: 'Coffee & Drinks' },
        { name: 'Signature Latte', description: 'Our house espresso blend with micro-foamed oat milk and a touch of vanilla bean.', price: '$6.50', category: 'Coffee & Drinks' },
        { name: 'Cold Brew', description: '20-hour slow-steeped cold brew — smooth, rich, and never bitter.', price: '$5.50', category: 'Coffee & Drinks' },
        { name: 'Matcha Latte', description: 'Ceremonial-grade Japanese matcha whisked with your choice of milk. Earthy and bright.', price: '$6', category: 'Coffee & Drinks' },
        { name: 'Avocado Toast', description: 'Sourdough with smashed avocado, lemon, chili flakes, and a soft poached egg.', price: '$14', category: 'Food & Pastries' },
        { name: 'House Granola Bowl', description: 'House-made granola with coconut yogurt, seasonal fruit, and local honey.', price: '$11', category: 'Food & Pastries' },
        { name: 'Morning Croissant', description: 'Buttery, flaky croissant baked fresh each morning. Plain or almond.', price: '$5', category: 'Food & Pastries' },
        { name: 'Breakfast Sandwich', description: 'Soft brioche bun, scrambled eggs, aged cheddar, and house aioli.', price: '$13', category: 'Food & Pastries' },
      ],
      features: [
        { title: 'Ethically Sourced Beans', description: 'Every coffee we serve comes from farms with direct-trade relationships — better for farmers, better for your cup.' },
        { title: 'Expert Barista Craft', description: 'Our baristas train obsessively so that every drink is dialed in, consistent, and made with intention.' },
        { title: 'Your Neighborhood Spot', description: 'We\'re more than a cafe — we\'re a gathering place where regulars feel like family.' },
      ],
      testimonials: [
        { quote: 'Best coffee in the neighborhood, full stop. The pour overs here have completely ruined chain coffee for me forever.', author: 'Connor M.', detail: 'Regular' },
        { quote: 'I work from here three days a week. Perfect atmosphere, incredible lattes, and the staff genuinely makes your day better.', author: 'Priya N.', detail: 'Google Review' },
        { quote: 'The avocado toast is legitimately the best I\'ve had anywhere. I now come in just for that with my usual latte.', author: 'Jamie R.', detail: 'Yelp Review' },
      ],
    },
    retail: {
      heroHeading: 'The Edit You\'ve Been Looking For',
      heroSubheading: `${businessName}${cityStr} is a carefully considered collection of pieces you won\'t find anywhere else — curated for style, quality, and a little bit of magic.`,
      aboutHeading: 'Curated with Intention',
      aboutBody: `At ${businessName}, every item earns its place. We travel, we discover, we vet obsessively — and what makes it to the floor is only what we\'d put in our own closets. Shopping here isn\'t browsing, it\'s finding.`,
      suggestedHours: { Monday: '10:00 AM – 6:00 PM', Tuesday: '10:00 AM – 6:00 PM', Wednesday: '10:00 AM – 6:00 PM', Thursday: '10:00 AM – 7:00 PM', Friday: '10:00 AM – 7:00 PM', Saturday: '10:00 AM – 6:00 PM', Sunday: '11:00 AM – 5:00 PM' },
      suggestedMenuItems: [
        { name: 'Signature Tote', description: 'Our best-selling full-grain leather tote — hand-stitched, built to last decades.', price: '$195', category: 'Featured' },
        { name: 'Cashmere Wrap', description: 'Cloud-soft Mongolian cashmere in a generous wrap that works twelve months a year.', price: '$285', category: 'Featured' },
        { name: 'Statement Earrings', description: 'Handcrafted brass earrings from an independent artisan. Each pair slightly unique.', price: '$68', category: 'Featured' },
        { name: 'Linen Blazer', description: 'Relaxed-tailored linen blazer in a palette of muted neutrals. The perfect layer.', price: '$245', category: 'New Arrivals' },
        { name: 'Hand-Thrown Ceramic Mug', description: 'Locally made by a Brooklyn ceramicist. No two are exactly alike.', price: '$48', category: 'New Arrivals' },
        { name: 'Scented Candle', description: 'House-blended soy wax candle with notes of fig, cedar, and dark amber. 50-hour burn.', price: '$42', category: 'New Arrivals' },
        { name: 'Silk Scarf', description: 'Italian silk printed with an original design from an independent illustrator.', price: '$125', category: 'Featured' },
        { name: 'Weekend Bag', description: 'Waxed canvas weekend bag with leather trim. The only travel companion you need.', price: '$320', category: 'Featured' },
      ],
      features: [
        { title: 'Rigorously Curated Selection', description: 'Less than 5% of brands we discover make it onto our floor — quality and integrity are non-negotiable.' },
        { title: 'Independent & Ethical Makers', description: 'We prioritize small-batch producers, independent artisans, and brands with responsible sourcing practices.' },
        { title: 'Personal Styling Available', description: 'Our team offers complimentary styling sessions — come in with a challenge and leave with a solution.' },
      ],
      testimonials: [
        { quote: 'This store completely changed how I shop. The curation is impeccable — I\'ve never bought anything here I didn\'t love.', author: 'Alexandra P.', detail: 'Regular Customer' },
        { quote: 'Found a gift here for my sister that she still talks about. The staff helped me land on exactly the right thing.', author: 'Nathan C.', detail: 'Google Review' },
        { quote: 'A boutique that actually has taste. Every item is intentional and the team knows everything about what they carry.', author: 'Simone R.', detail: 'Yelp Review' },
      ],
    },
  };

  const industryOverrides = industryDefaults[industryType ?? 'restaurant'] ?? {};

  return {
    heroHeading: 'Where Every Experience Tells a Story',
    heroSubheading: `Experience excellence at ${businessName}${cityStr}.`,
    aboutHeading: 'Our Story',
    aboutBody: `At ${businessName}, we are committed to excellence in everything we do. Every detail is considered, every interaction matters.`,
    ctaText: m.ctaDefault,
    tagline: 'Excellence in every experience',
    suggestedHours: {
      Monday: '9:00 AM – 6:00 PM',
      Tuesday: '9:00 AM – 6:00 PM',
      Wednesday: '9:00 AM – 6:00 PM',
      Thursday: '9:00 AM – 7:00 PM',
      Friday: '9:00 AM – 7:00 PM',
      Saturday: '10:00 AM – 5:00 PM',
      Sunday: '11:00 AM – 4:00 PM',
    },
    suggestedMenuItems: [],
    features: [
      { title: 'Quality You Can Feel', description: 'Every aspect of our offering reflects a commitment to excellence that you\'ll notice from the first interaction.' },
      { title: 'Expert Team', description: 'Our team brings deep expertise and genuine passion to serving every client who walks through our doors.' },
      { title: 'A Space Worth Returning To', description: 'We\'ve built something worth coming back to — where the experience is as memorable as the result.' },
    ],
    testimonials: [
      { quote: 'Outstanding experience from start to finish. The team is incredibly professional and genuinely cares about the outcome.', author: 'Sarah M.', detail: 'Regular Client' },
      { quote: 'Everything exceeded expectations. I highly recommend this place to anyone looking for quality and great service.', author: 'James T.', detail: 'Google Review' },
      { quote: 'One of the best experiences I\'ve had. The attention to detail is something you don\'t find everywhere.', author: 'Emily R.', detail: 'Yelp Review' },
    ],
    ...industryOverrides,
  };
}
