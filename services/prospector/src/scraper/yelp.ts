import { createLogger, ExternalApiError } from '@embedo/utils';

const log = createLogger('prospector:yelp');
const YELP_BASE = 'https://api.yelp.com/v3';

export interface PlaceResult {
  placeId: string;
  name: string;
  address: {
    formatted: string;
    city?: string;
    state?: string;
  };
  phone?: string;
  website?: string;
  yelpRating?: number;
  yelpReviewCount?: number;
  yelpUrl?: string;
}

interface YelpBusiness {
  id: string;
  name: string;
  phone?: string;
  url: string;
  rating?: number;
  review_count?: number;
  location: {
    display_address: string[];
    city?: string;
    state?: string;
  };
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
}

interface YelpBusinessDetail extends YelpBusiness {
  website?: string;
}

async function yelpFetch<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${YELP_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ExternalApiError('Yelp', `HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function getBusinessWebsite(id: string, apiKey: string): Promise<string | undefined> {
  try {
    const detail = await yelpFetch<YelpBusinessDetail>(`/businesses/${id}`, apiKey);
    return detail.website ?? undefined;
  } catch {
    return undefined;
  }
}

export async function searchRestaurants(
  city: string,
  apiKey: string,
  maxResults = 200,
): Promise<PlaceResult[]> {
  const results: PlaceResult[] = [];
  const batchSize = 50; // Yelp max per request
  let offset = 0;

  log.info({ city, maxResults }, 'Starting Yelp restaurant search');

  while (results.length < maxResults) {
    const params = new URLSearchParams({
      term: 'restaurants',
      location: city,
      categories: 'restaurants',
      limit: String(batchSize),
      offset: String(offset),
    });

    const data = await yelpFetch<YelpSearchResponse>(`/businesses/search?${params}`, apiKey);

    if (!data.businesses.length) break;

    for (const biz of data.businesses) {
      if (results.length >= maxResults) break;

      // Fetch individual business to get website (not in search results)
      const website = await getBusinessWebsite(biz.id, apiKey);

      // Small delay between detail calls
      await new Promise((r) => setTimeout(r, 100));

      const address: PlaceResult['address'] = {
        formatted: biz.location.display_address.join(', '),
      };
      if (biz.location.city) address.city = biz.location.city;
      if (biz.location.state) address.state = biz.location.state;

      const result: PlaceResult = {
        placeId: biz.id,
        name: biz.name,
        address,
      };
      if (biz.phone) result.phone = biz.phone;
      if (website) result.website = website;
      if (biz.rating !== undefined) result.yelpRating = biz.rating;
      if (biz.review_count !== undefined) result.yelpReviewCount = biz.review_count;
      result.yelpUrl = biz.url;

      results.push(result);
    }

    if (data.businesses.length < batchSize || results.length >= data.total) break;
    offset += batchSize;
  }

  log.info({ city, found: results.length }, 'Yelp search complete');
  return results;
}
