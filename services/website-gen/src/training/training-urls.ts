// Curated list of high-quality industry websites to scrape for dynamic design inspiration.
// Selected for: strong brand identity, accessible HTML (not heavy JS SPAs), no aggressive bot blocking.
// The knowledge-base module scrapes these at service startup and caches insights in memory.

import type { TrainingIndustryId } from './static-insights.js';

export const TRAINING_URLS: Record<TrainingIndustryId, readonly string[]> = {
  restaurant: [
    'https://www.chez-panisse.com',           // Alice Waters — warm, text-first, iconic copy
    'https://www.alinearestaurant.com',        // Grant Achatz — dark editorial, no-gimmick luxury
    'https://www.farmhouseinn.com/restaurant', // Farm-to-table; earthy tones, pastoral photography
    'https://www.thenomad.bar',                // NYC cocktail bar — moody, minimal, strong typography
    'https://www.republique-la.com',           // LA brasserie — warm light, French-California aesthetic
  ],

  cafe: [
    'https://www.bluebottlecoffee.com',        // Minimalist white, craft-forward, ethical sourcing narrative
    'https://intelligentsia.com',              // Sleek, dark sections, premium coffee positioning
    'https://www.stumptowncoffee.com',         // Portland indie; warm, analog, editorial photography
  ],

  gym: [
    'https://www.barrys.com',                 // Dark red/black, transformation-forward messaging
    'https://www.orangetheory.com',           // Community-driven, metric-forward, orange accent system
    'https://www.solidcore.co',               // High-intensity Pilates; dark, editorial, luxury fitness
  ],

  salon: [
    'https://www.drybar.com',                // Yellow accent, warm and approachable, strong brand voice
    'https://www.glasshairstudio.com',        // Independent salon; editorial, clean white palette
    'https://www.privintedsalon.com',         // NYC upscale; technique-forward, transformation imagery
  ],

  spa: [
    'https://www.aman.com/spas',             // Ultra-luxury; nature-driven, immersive, slow layout
    'https://www.espa-international.com',    // Professional spa brand; clean, sensory language
    'https://www.rancho-la-puerta.com',      // Wellness retreat; earthy, botanical palette
  ],

  retail: [
    'https://www.cuyana.com',               // Fewer, better; minimalist, quality-first narrative
    'https://www.coclico.com',              // Footwear boutique; editorial, warm cream palette
    'https://www.madewell.com',             // Lifestyle denim; casual-editorial, approachable luxury
  ],
};
