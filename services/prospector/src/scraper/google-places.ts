import { createLogger, ExternalApiError } from '@embedo/utils';

const log = createLogger('prospector:google-places');

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
  googleRating?: number;
  googleReviewCount?: number;
}

interface GooglePlacesTextSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  website?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
}

interface GooglePlacesTextSearchResponse {
  results: GooglePlacesTextSearchResult[];
  next_page_token?: string;
  status: string;
  error_message?: string;
}

interface GooglePlaceDetailsResponse {
  result: {
    formatted_phone_number?: string;
    website?: string;
    address_components?: Array<{
      long_name: string;
      types: string[];
    }>;
  };
  status: string;
}

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new ExternalApiError('GooglePlaces', `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<{ phone?: string; website?: string; city?: string; state?: string }> {
  const url = `${BASE_URL}/details/json?place_id=${placeId}&fields=formatted_phone_number,website,address_components&key=${apiKey}`;
  const data = await fetchJson<GooglePlaceDetailsResponse>(url);

  if (data.status !== 'OK') return {};

  const components = data.result.address_components ?? [];
  const cityName = components.find((c) => c.types.includes('locality'))?.long_name;
  const stateName = components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name;

  const details: { phone?: string; website?: string; city?: string; state?: string } = {};
  if (data.result.formatted_phone_number) details.phone = data.result.formatted_phone_number;
  if (data.result.website) details.website = data.result.website;
  if (cityName) details.city = cityName;
  if (stateName) details.state = stateName;
  return details;
}

export async function searchRestaurants(
  city: string,
  apiKey: string,
  maxResults = 60,
): Promise<PlaceResult[]> {
  const results: PlaceResult[] = [];
  let pageToken: string | undefined;

  log.info({ city, maxResults }, 'Starting Google Places search');

  do {
    const query = encodeURIComponent(`restaurants in ${city}`);
    const tokenParam = pageToken ? `&pagetoken=${pageToken}` : '';
    const url = `${BASE_URL}/textsearch/json?query=${query}&type=restaurant&key=${apiKey}${tokenParam}`;

    const data = await fetchJson<GooglePlacesTextSearchResponse>(url);

    if (data.status === 'ZERO_RESULTS') break;
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new ExternalApiError('GooglePlaces', `Status ${data.status}: ${data.error_message ?? ''}`);
    }

    for (const place of data.results) {
      if (results.length >= maxResults) break;

      // Fetch details to get phone + website
      const details = await getPlaceDetails(place.place_id, apiKey);

      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 100));

      const formatted = place.formatted_address ?? '';
      const address: PlaceResult['address'] = { formatted };
      if (details.city) address.city = details.city;
      if (details.state) address.state = details.state;

      const result: PlaceResult = { placeId: place.place_id, name: place.name, address };
      if (details.phone) result.phone = details.phone;
      if (details.website) result.website = details.website;
      if (place.rating !== undefined) result.googleRating = place.rating;
      if (place.user_ratings_total !== undefined) result.googleReviewCount = place.user_ratings_total;

      results.push(result);
    }

    pageToken = data.next_page_token;

    // Google requires a short pause before using next_page_token
    if (pageToken && results.length < maxResults) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  } while (pageToken && results.length < maxResults);

  log.info({ city, found: results.length }, 'Google Places search complete');
  return results;
}
