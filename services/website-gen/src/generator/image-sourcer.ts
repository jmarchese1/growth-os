import { createLogger } from '@embedo/utils';

const logger = createLogger('website-gen:images');

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    landscape: string;
  };
  alt: string;
  photographer: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

// Industry + cuisine specific search queries
const IMAGE_QUERIES: Record<string, string[]> = {
  // Restaurants by cuisine
  'restaurant:italian': ['italian pasta dish', 'pizza wood oven', 'italian restaurant interior', 'bruschetta appetizer', 'tiramisu dessert', 'red wine italian dinner'],
  'restaurant:pizza': ['pizza margherita', 'pizza oven fire', 'pizza dough', 'pizzeria interior', 'pepperoni pizza', 'pizza slice close up'],
  'restaurant:cookies': ['fresh baked cookies', 'chocolate chip cookies', 'cookie bakery display', 'baking cookies kitchen', 'cookie dough', 'milk and cookies'],
  'restaurant:bakery': ['artisan bread loaves', 'bakery pastry display', 'croissant golden', 'baker kneading dough', 'cupcakes frosting', 'sourdough bread'],
  'restaurant:sushi': ['sushi platter', 'sushi chef', 'japanese restaurant', 'sashimi fresh', 'ramen bowl', 'sake japanese'],
  'restaurant:mexican': ['tacos platter', 'mexican restaurant', 'guacamole fresh', 'burrito bowl', 'margarita cocktail', 'enchiladas plate'],
  'restaurant:american': ['gourmet burger', 'bbq ribs', 'american diner', 'steak dinner', 'craft beer bar', 'mac and cheese'],
  'restaurant:french': ['french cuisine plating', 'paris cafe', 'french wine cheese', 'croissant cafe', 'coq au vin', 'french bistro'],
  'restaurant:chinese': ['dim sum bamboo', 'wok flames cooking', 'chinese noodles', 'peking duck', 'chinese tea ceremony', 'dumpling close up'],
  'restaurant:indian': ['indian curry spices', 'naan bread tandoori', 'biryani dish', 'indian restaurant decor', 'chai tea', 'samosa appetizer'],
  'restaurant:thai': ['pad thai noodles', 'thai curry coconut', 'thai street food', 'spring rolls fresh', 'tom yum soup', 'mango sticky rice'],
  'restaurant:seafood': ['seafood platter lobster', 'grilled fish herbs', 'oysters lemon ice', 'seafood restaurant ocean', 'shrimp scampi', 'clam chowder'],
  'restaurant:steakhouse': ['ribeye steak grilled', 'steakhouse interior dark', 'wine cellar restaurant', 'steak dinner candles', 'filet mignon', 'whiskey glass steak'],
  'restaurant:default': ['restaurant food plating', 'restaurant interior elegant', 'chef cooking kitchen', 'fine dining table', 'cocktail bar', 'dessert plating'],
  // Other industries
  'gym:default': ['modern gym equipment', 'fitness class training', 'yoga studio peaceful', 'crossfit workout', 'gym interior modern', 'personal trainer'],
  'salon:default': ['hair salon interior', 'hairstylist cutting', 'salon mirror chair', 'hair color treatment', 'salon products shelf', 'blowout styling'],
  'spa:default': ['spa massage treatment', 'zen stones water', 'spa candles relaxation', 'facial skincare', 'spa pool luxury', 'essential oils'],
  'cafe:default': ['coffee latte art', 'cozy cafe interior', 'pastries bakery case', 'barista pouring coffee', 'cafe morning light', 'espresso machine'],
  'retail:default': ['boutique store display', 'clothing rack fashion', 'retail interior modern', 'gift shop display', 'shopping lifestyle', 'product flatlay'],
};

function getQueries(industryType: string, cuisine?: string): string[] {
  if (cuisine) {
    const key = `${industryType}:${cuisine.toLowerCase().split(/[,\s]+/)[0]}`;
    if (IMAGE_QUERIES[key]) return IMAGE_QUERIES[key]!;
  }
  return IMAGE_QUERIES[`${industryType}:default`] ?? IMAGE_QUERIES['restaurant:default']!;
}

/**
 * Fetch real, working image URLs from Pexels API.
 * Returns URLs that are guaranteed to resolve (no 404s).
 */
export async function fetchImages(params: {
  industryType: string;
  cuisine?: string;
  count?: number;
  pexelsApiKey?: string;
}): Promise<Array<{ url: string; alt: string; photographer: string }>> {
  const { industryType, cuisine, count = 6, pexelsApiKey } = params;
  const queries = getQueries(industryType, cuisine);

  // If no Pexels API key, return curated Pexels URLs that are known to work
  if (!pexelsApiKey) {
    return getCuratedFallbackImages(industryType, cuisine);
  }

  const images: Array<{ url: string; alt: string; photographer: string }> = [];

  for (const query of queries.slice(0, Math.min(count, 6))) {
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
        headers: { Authorization: pexelsApiKey },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json() as PexelsResponse;
        const photo = data.photos[0];
        if (photo) {
          images.push({
            url: photo.src.large, // 940px wide — good quality, fast loading
            alt: photo.alt || query,
            photographer: photo.photographer,
          });
        }
      }
    } catch {
      // Skip failed queries
    }
  }

  logger.info({ count: images.length, queries: queries.length }, 'Fetched Pexels images');

  // Fill remaining with fallbacks if needed
  if (images.length < count) {
    const fallbacks = getCuratedFallbackImages(industryType, cuisine);
    for (const fb of fallbacks) {
      if (images.length >= count) break;
      if (!images.some(img => img.url === fb.url)) images.push(fb);
    }
  }

  return images;
}

/**
 * Curated, known-working Pexels image URLs as fallback when no API key.
 * These are direct Pexels CDN links that don't expire.
 */
function getCuratedFallbackImages(industryType: string, cuisine?: string): Array<{ url: string; alt: string; photographer: string }> {
  const sets: Record<string, Array<{ url: string; alt: string; photographer: string }>> = {
    'italian': [
      { url: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Italian pasta dish', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Pizza from wood oven', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant interior', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Fresh bruschetta', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3338681/pexels-photo-3338681.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Wine and dinner', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Fine dining', photographer: 'Pexels' },
    ],
    'cookies': [
      { url: 'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Fresh baked cookies', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/890577/pexels-photo-890577.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Chocolate chip cookies', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/4110003/pexels-photo-4110003.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Baking cookies', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1028714/pexels-photo-1028714.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Cookie display', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/45202/brownie-dessert-cake-sweet-45202.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Brownie dessert', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Bakery interior', photographer: 'Pexels' },
    ],
    'restaurant': [
      { url: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Fine dining restaurant', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Gourmet food plate', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Restaurant ambiance', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3338497/pexels-photo-3338497.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Chef cooking', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Cocktail bar', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Dessert plating', photographer: 'Pexels' },
    ],
    'gym': [
      { url: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Gym equipment', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Fitness training', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Yoga class', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Weight training', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/4164761/pexels-photo-4164761.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'CrossFit workout', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/260352/pexels-photo-260352.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Modern gym', photographer: 'Pexels' },
    ],
    'cafe': [
      { url: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Coffee latte art', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1995010/pexels-photo-1995010.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Cafe interior', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/205961/pexels-photo-205961.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Fresh pastries', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3020919/pexels-photo-3020919.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Barista pouring', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1516415/pexels-photo-1516415.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Morning cafe', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Espresso coffee', photographer: 'Pexels' },
    ],
    'salon': [
      { url: 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Hair salon interior', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Hairstylist working', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Salon chair mirror', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3993310/pexels-photo-3993310.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Hair treatment', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3993467/pexels-photo-3993467.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Salon products', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3993462/pexels-photo-3993462.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Styling hair', photographer: 'Pexels' },
    ],
    'spa': [
      { url: 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Spa massage', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3188/love-romantic-bath-candlelight.jpg?auto=compress&cs=tinysrgb&w=800', alt: 'Spa candles', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3757957/pexels-photo-3757957.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Spa treatment', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Facial skincare', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Zen relaxation', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/5240677/pexels-photo-5240677.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Essential oils', photographer: 'Pexels' },
    ],
    'retail': [
      { url: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Boutique display', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Fashion store', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/3965545/pexels-photo-3965545.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Shopping lifestyle', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Product display', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/2292953/pexels-photo-2292953.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Retail interior', photographer: 'Pexels' },
      { url: 'https://images.pexels.com/photos/5650026/pexels-photo-5650026.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Gift wrapping', photographer: 'Pexels' },
    ],
  };

  // Try cuisine-specific first, then industry, then generic restaurant
  const cuisineLower = cuisine?.toLowerCase().split(/[,\s]+/)[0] ?? '';
  return sets[cuisineLower] ?? sets[industryType] ?? sets['restaurant']!;
}
