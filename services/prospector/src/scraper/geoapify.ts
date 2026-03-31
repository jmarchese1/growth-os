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
  categories?: string[];  // e.g. ["catering.restaurant", "catering.restaurant.pizza"]
  phone?: string;
  website?: string;
  email?: string;
  facebook?: string;    // Facebook page URL from OSM
  instagram?: string;   // Instagram profile URL from OSM
}

export interface BoundingBox {
  lon1: number; // SW corner longitude
  lat1: number; // SW corner latitude
  lon2: number; // NE corner longitude
  lat2: number; // NE corner latitude
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
  categories?: string[];
  phone?: string;
  website?: string;
  email?: string;
  datasource?: {
    raw?: {
      'contact:phone'?: string;
      'contact:website'?: string;
      'contact:email'?: string;
      'contact:facebook'?: string;
      'contact:instagram'?: string;
      facebook?: string;
      instagram?: string;
    };
  };
}

interface GeoapifyPlacesResponse {
  features: Array<{
    properties: GeoapifyPlaceProperties;
  }>;
}

export async function geocodeCity(city: string, apiKey: string): Promise<{ lon: number; lat: number }> {
  // Attempt 1: strict 'city' type
  // Attempt 2: unrestricted — catches townships, CDPs, boroughs (e.g. "Edison, NJ", "Brooklyn, NY")
  const paramSets = [
    new URLSearchParams({ text: city, type: 'city', format: 'json', apiKey }),
    new URLSearchParams({ text: city, format: 'json', limit: '1', apiKey }),
  ];

  for (const params of paramSets) {
    const res = await fetch(`${GEOCODE_BASE}/search?${params}`);
    if (!res.ok) throw new ExternalApiError('Geoapify', `Geocode HTTP ${res.status}`);
    const data = (await res.json()) as GeoapifyGeoResponse;
    const first = data.results[0];
    if (first) {
      log.debug({ city, lon: first.lon, lat: first.lat }, 'City geocoded');
      return { lon: first.lon, lat: first.lat };
    }
  }

  throw new ExternalApiError('Geoapify', `Location not found: "${city}". Try a larger nearby city or add the state (e.g. "Edison, NJ").`);
}

async function fetchPlacesPage(
  filter: string,
  offset: number,
  limit: number,
  apiKey: string,
): Promise<GeoapifyPlacesResponse> {
  const params = new URLSearchParams({
    categories: 'catering.restaurant',
    filter,
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
  facebook?: string;
  instagram?: string;
} {
  const raw = props.datasource?.raw ?? {};
  const contact: { phone?: string; website?: string; email?: string; facebook?: string; instagram?: string } = {};
  const phone = props.phone ?? raw['contact:phone'];
  const website = props.website ?? raw['contact:website'];
  const email = props.email ?? raw['contact:email'];
  const facebook = raw['contact:facebook'] ?? raw['facebook'];
  const instagram = raw['contact:instagram'] ?? raw['instagram'];
  if (phone) contact.phone = phone;
  if (website) contact.website = website;
  if (email) contact.email = email;
  if (facebook) contact.facebook = facebook;
  if (instagram) contact.instagram = instagram;
  return contact;
}

export async function searchRestaurants(
  city: string,
  apiKey: string,
  maxResults = 200,
  coords?: { lon: number; lat: number; bbox?: BoundingBox },
  startOffset = 0,
): Promise<PlaceResult[]> {
  log.info({ city, maxResults, startOffset }, 'Starting Geoapify restaurant search');

  const resolved = coords ?? { ...(await geocodeCity(city, apiKey)) };

  // Build filter: use bounding box if available, otherwise fall back to 15km circle
  let filter: string;
  if (coords?.bbox) {
    const { lon1, lat1, lon2, lat2 } = coords.bbox;
    filter = `rect:${lon1},${lat1},${lon2},${lat2}`;
    log.info({ city, bbox: coords.bbox }, 'Using bounding box filter');
  } else {
    filter = `circle:${resolved.lon},${resolved.lat},15000`;
    log.info({ city, lon: resolved.lon, lat: resolved.lat }, 'Using 15km circle filter (no bbox)');
  }

  const results: PlaceResult[] = [];
  const batchSize = 20; // Geoapify free tier recommended batch size
  let offset = startOffset;

  while (results.length < maxResults) {
    const data = await fetchPlacesPage(filter, offset, batchSize, apiKey);

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
      if (props.categories?.length) result.categories = props.categories;
      if (contact.phone) result.phone = contact.phone;
      if (contact.website) result.website = contact.website;
      if (contact.email) result.email = contact.email;
      if (contact.facebook) result.facebook = contact.facebook;
      if (contact.instagram) result.instagram = contact.instagram;

      results.push(result);
    }

    if (data.features.length < batchSize) break;
    offset += batchSize;

    // Small pause between pages to stay within rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  log.info({ city, found: results.length, filter }, 'Geoapify search complete');
  return results;
}
