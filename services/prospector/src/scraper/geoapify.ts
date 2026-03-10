import { createLogger, ExternalApiError } from '@embedo/utils';

const log = createLogger('prospector:geoapify');

const GEOCODE_BASE = 'https://api.geoapify.com/v1/geocode';
const PLACES_BASE = 'https://api.geoapify.com/v2/places';

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
  email?: string;
}

interface GeoapifyGeoResult {
  lon: number;
  lat: number;
  city?: string;
  state?: string;
}

interface GeoapifyGeoResponse {
  results: GeoapifyGeoResult[];
}

interface GeoapifyPlaceProperties {
  place_id: string;
  name?: string;
  formatted?: string;
  city?: string;
  state_code?: string;
  phone?: string;
  website?: string;
  email?: string;
  datasource?: {
    raw?: {
      'contact:phone'?: string;
      'contact:website'?: string;
      'contact:email'?: string;
    };
  };
}

interface GeoapifyPlacesResponse {
  features: Array<{
    properties: GeoapifyPlaceProperties;
  }>;
}

async function geocodeCity(city: string, apiKey: string): Promise<{ lon: number; lat: number }> {
  const params = new URLSearchParams({ text: city, type: 'city', format: 'json', apiKey });
  const res = await fetch(`${GEOCODE_BASE}/search?${params}`);
  if (!res.ok) throw new ExternalApiError('Geoapify', `Geocode HTTP ${res.status}`);

  const data = (await res.json()) as GeoapifyGeoResponse;
  const first = data.results[0];
  if (!first) throw new ExternalApiError('Geoapify', `City not found: ${city}`);

  return { lon: first.lon, lat: first.lat };
}

async function fetchPlacesPage(
  lon: number,
  lat: number,
  offset: number,
  limit: number,
  apiKey: string,
): Promise<GeoapifyPlacesResponse> {
  const params = new URLSearchParams({
    categories: 'catering.restaurant',
    filter: `circle:${lon},${lat},15000`, // 15km radius
    limit: String(limit),
    offset: String(offset),
    apiKey,
  });
  const res = await fetch(`${PLACES_BASE}?${params}`);
  if (!res.ok) throw new ExternalApiError('Geoapify', `Places HTTP ${res.status}`);
  return res.json() as Promise<GeoapifyPlacesResponse>;
}

function extractContact(props: GeoapifyPlaceProperties): {
  phone?: string;
  website?: string;
  email?: string;
} {
  const raw = props.datasource?.raw ?? {};
  const contact: { phone?: string; website?: string; email?: string } = {};
  const phone = props.phone ?? raw['contact:phone'];
  const website = props.website ?? raw['contact:website'];
  const email = props.email ?? raw['contact:email'];
  if (phone) contact.phone = phone;
  if (website) contact.website = website;
  if (email) contact.email = email;
  return contact;
}

export async function searchRestaurants(
  city: string,
  apiKey: string,
  maxResults = 200,
): Promise<PlaceResult[]> {
  log.info({ city, maxResults }, 'Starting Geoapify restaurant search');

  const { lon, lat } = await geocodeCity(city, apiKey);
  log.info({ city, lon, lat }, 'City geocoded');

  const results: PlaceResult[] = [];
  const batchSize = 20; // Geoapify free tier recommended batch size
  let offset = 0;

  while (results.length < maxResults) {
    const data = await fetchPlacesPage(lon, lat, offset, batchSize, apiKey);

    if (!data.features.length) break;

    for (const feature of data.features) {
      if (results.length >= maxResults) break;

      const props = feature.properties;
      if (!props.name) continue;

      const contact = extractContact(props);

      const address: PlaceResult['address'] = {
        formatted: props.formatted ?? '',
      };
      if (props.city) address.city = props.city;
      if (props.state_code) address.state = props.state_code;

      const result: PlaceResult = {
        placeId: props.place_id,
        name: props.name,
        address,
      };
      if (contact.phone) result.phone = contact.phone;
      if (contact.website) result.website = contact.website;
      if (contact.email) result.email = contact.email;

      results.push(result);
    }

    if (data.features.length < batchSize) break;
    offset += batchSize;

    // Small pause between pages to stay within rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  log.info({ city, found: results.length }, 'Geoapify search complete');
  return results;
}
