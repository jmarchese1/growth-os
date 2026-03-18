// Static design knowledge base — curated from studying award-winning industry websites.
// These principles are always injected into every generation as system-level context.

export type TrainingIndustryId = 'restaurant' | 'cafe' | 'gym' | 'salon' | 'spa' | 'retail';

export const STATIC_DESIGN_INSIGHTS: Record<TrainingIndustryId, readonly string[]> = {
  restaurant: [
    'Fine-dining heroes use 5–8 word atmospheric headings — never the restaurant name, never generic. "Where the Night Belongs" or "The Fire and the Table" outperform "Fine Italian Dining" every time. The heading is the emotion, not the description.',

    'Premium restaurant color systems anchor in deep neutrals (near-black charcoal, warm off-white cream, rich mahogany) with one accent (dusty gold, terracotta, slate blue) used exclusively on CTAs and hairline dividers. Never exceed 3 palette values.',

    'Full-bleed hero photography with a 0.4–0.6 opacity dark overlay lets the heading breathe. Centered, white, thin-weight type. One CTA only: "Reserve a Table" not "Book Now" — the specificity converts better.',

    'Award-winning restaurant copy names the origin, technique, and sensation: "slow-braised for six hours in Rioja wine" communicates craft. "Fresh quality ingredients" communicates nothing. Avoid delicious, amazing, authentic, fresh, quality — these are default filler that signal a generic site.',

    'Menu items read as a single compelling sentence that creates hunger before it mentions price. Cooking verbs signal craft: wood-fired, hand-rolled, dry-aged, cold-pressed, charred, brined, folded. Mention the origin or the technique, not the taste.',

    'Top-performing testimonial sections show exactly 3 quotes from different platforms (Google, Yelp, OpenTable). No star icons — they feel transactional. First name + last initial only, with a 1–2 word context label: "Regular" or "Anniversary Dinner".',

    'Extreme whitespace between sections (100px+ vertical padding) is a luxury signal. Content prose never exceeds 680px wide. This restraint communicates confidence — only brands that have nothing to prove give their content room to breathe.',

    'The About section is 3–4 sentences: founding story, chef philosophy, and one physical detail about the space (candlelit tables, open kitchen, pressed tin ceiling). Humanize. Name the chef. Mention the neighborhood.',
  ],

  cafe: [
    'Specialty coffee hero sections feature a barista-in-action shot (steam from a portafilter, hands on a cup, overhead latte art) rather than a room photo — people connect to craft and process over space.',

    'Top cafe color palettes are warm analog: off-white or cream backgrounds, near-black type, one warm accent (amber, terracotta, dusty sage). The mood is "neighborhood discovery" not corporate polish. Avoid stark white or cold grey.',

    'Cafe menu items lead with flavor and origin, not the drink name: "Ethiopian Yirgacheffe, washed process, V60" creates desire. "$5 black coffee" does not. Brew method as a feature signal: "Every pour-over takes 4 minutes. Worth every second."',

    'The About section of a strong cafe site tells a sourcing story in 3–4 sentences: the farm, the roaster, the relationship. This differentiates specialty from commodity. Community line at the end: "Since 2016, your morning ritual in [City]."',

    'Cafe CTA language is ritual-forward: "Start Your Morning Here", "Your Regular Order Awaits". Avoid booking language — cafes don\'t take reservations. The CTA is an invitation, not a transaction.',
  ],

  gym: [
    'High-converting fitness heroes use an action photograph at peak intensity: mid-lift, a coach spotting form, a class at the top of a burpee. Dark overlay, white sans-serif heading at large scale. Motivational and direct: "Train Here. Change Everything."',

    'Gym color systems run dark: near-black backgrounds with a single electric accent (neon orange, electric blue, signal green). Dark mode signals intensity and exclusivity. Light-mode gym sites exist but underperform.',

    'Membership pricing displays as 3-column card stacks: Basic / Pro / Elite. Features as checkmarks, not prose. "Most Popular" badge on the middle tier. Price in large type, billing cadence in small. This layout pattern converts at 2–3x a list format.',

    'Copy addresses hesitation head-on: "No experience required. Every class is coached from rep one." The biggest barrier to joining a gym is fear of not fitting in — the best sites remove it explicitly rather than ignoring it.',

    'Social proof for gyms works as transformation metrics: "Over 400 members. Average weight loss in 90 days: 22 lbs." Pair with 2–3 testimonials that reference specific classes, coaches, or results — not generic praise.',
  ],

  salon: [
    'Luxury salon sites are almost always light-mode: white or warm light grey backgrounds, near-black type, one metallic accent (champagne gold, rose gold, platinum). The palette communicates precision, cleanliness, and investment.',

    'Salon hero sections use an editorial close-up: a perfect color result, a dramatic cut, a stylist\'s hands in motion. The human transformation is the product — room shots and product bottles are secondary.',

    'Service pricing displays with a + suffix for base prices ($75+ not "From $75"). This sets a floor without a ceiling and signals custom, personalized work. Never use ranges like $75–$120 — they create price friction and undermine confidence.',

    'Stylist bios with headshots and 2–3 specialty keywords (balayage specialist, color correction, keratin expert) drive more bookings than pricing alone. The personal connection converts. A team page is not optional for a salon.',

    'Salon booking CTAs must be repeated: in the nav, in the hero, and after every service. "Book Your Appointment" outperforms "Book Now" — the possessive creates ownership of the action. Make it impossible not to book.',
  ],

  spa: [
    'Top spa sites open with a single large hero image — candles, stones, water, botanicals — not people. A centered minimal serif heading at large scale. Then a full vertical pause before content begins. Unhurried layout is the brand.',

    'Spa color palettes draw from nature: sage green, warm sand, deep slate, warm cream, barely-there blush. Avoid stark white or pure black — the palette should feel like the environment you\'re entering, not a medical office or nightclub.',

    'Treatment copy is written from the client\'s body perspective: "Feel tension release as warm stones trace the length of your spine." Second-person, present-tense, sensory. Never clinical, never technical. Sell the sensation, not the procedure.',

    'The highest-converting spa offering section shows exactly 3 curated packages (Relax / Restore / Revive) with headline, 3-line description, duration, price, and one CTA. More than 3 creates decision paralysis — the most common reason for abandoned spa bookings.',

    'Spa testimonials emphasize transformation and trust: "I left feeling lighter than I have in years." "I finally understand what people mean by restorative." Avoid food/value language that belongs to restaurants. The feeling is the product.',
  ],

  retail: [
    'Top boutique retail heroes show the product in context — worn, lived in, placed in a home — never on a white background. Lifestyle photography is the brand. The hero communicates the life the customer will have, not the object they\'ll own.',

    'Boutique color palettes signal point of view: earthy neutrals (terracotta, warm grey, linen) position a shop as artisanal and slow. High-contrast black/white signals modern editorial. Pastels signal feminine and playful. The palette is a stance.',

    'Product cards work best at 4 columns desktop / 2 mobile with a hover state that reveals a second lifestyle image. Price below the product name in lighter weight. No star ratings or review counts in premium boutiques — they feel mass-market.',

    'The "Our Story" or curation criteria section is the highest-ROI content on a boutique site: "We only carry pieces we would put in our own closets." This curation promise is the brand\'s core differentiator from any online marketplace.',

    'Boutique CTA language is exploratory, not transactional: "Explore the Collection", "Shop the Edit", "Discover What\'s New". Save "Add to Cart" for the product detail page. In hero and section CTAs, invite — don\'t demand.',
  ],
};

export function getStaticInsights(industryType?: string): string {
  const key = (industryType ?? 'restaurant') as TrainingIndustryId;
  const insights = STATIC_DESIGN_INSIGHTS[key] ?? STATIC_DESIGN_INSIGHTS['restaurant'];
  return (insights as string[]).join('\n\n');
}
