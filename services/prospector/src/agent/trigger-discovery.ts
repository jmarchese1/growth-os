/**
 * Fire-and-forget Geoapify discovery for an agent-spawned campaign.
 *
 * Mirrors the geoapify branch of POST /campaigns/:id/run but callable
 * directly from the agent orchestrator so no human has to click "Discover"
 * on auto-rotated campaigns.
 *
 * Returns quickly (kicks off async work via setImmediate). Prospects appear
 * in the campaign over the next 1–3 min as the discovery + enrichment
 * workers process them.
 */

import { db } from '@embedo/db';
import { prospectDiscoveredQueue } from '@embedo/queue';
import { createLogger } from '@embedo/utils';
import { searchRestaurants, geocodeCity } from '../scraper/geoapify.js';
import { env } from '../config.js';

const log = createLogger('agent:trigger-discovery');

export async function triggerGeoapifyDiscovery(campaignId: string): Promise<void> {
  if (!env.GEOAPIFY_API_KEY) {
    log.warn({ campaignId }, 'GEOAPIFY_API_KEY not set — cannot auto-discover');
    return;
  }

  const campaign = await db.outboundCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    log.warn({ campaignId }, 'Campaign not found — skipping discovery');
    return;
  }
  if (campaign.discoverySource !== 'geoapify') {
    log.info({ campaignId, source: campaign.discoverySource }, 'Non-geoapify campaign — skipping auto-discovery');
    return;
  }

  // Resolve coords (use stored if present, otherwise geocode)
  let coords: { lon: number; lat: number; bbox?: { lon1: number; lat1: number; lon2: number; lat2: number } };
  if (campaign.targetLat != null && campaign.targetLon != null) {
    coords = { lon: campaign.targetLon, lat: campaign.targetLat };
    if (
      campaign.targetBboxLon1 != null && campaign.targetBboxLat1 != null &&
      campaign.targetBboxLon2 != null && campaign.targetBboxLat2 != null
    ) {
      coords.bbox = {
        lon1: campaign.targetBboxLon1, lat1: campaign.targetBboxLat1,
        lon2: campaign.targetBboxLon2, lat2: campaign.targetBboxLat2,
      };
    }
  } else {
    try {
      coords = await geocodeCity(campaign.targetCity, env.GEOAPIFY_API_KEY);
    } catch (err) {
      log.warn({ err, campaignId, city: campaign.targetCity }, 'Geocode failed — aborting discovery');
      return;
    }
  }

  // Fingerprint for offset tracking across campaigns targeting the same area
  const filterFingerprint = coords.bbox
    ? `rect:${coords.bbox.lon1},${coords.bbox.lat1},${coords.bbox.lon2},${coords.bbox.lat2}`
    : `circle:${coords.lon},${coords.lat},15000`;

  // Run the scrape async — don't block the agent's tick
  setImmediate(async () => {
    try {
      // Calculate global offset so we don't re-scrape the same businesses
      // (matches the logic in POST /campaigns/:id/run)
      const allGeoapifyCampaigns = await db.outboundCampaign.findMany({
        where: { discoverySource: 'geoapify' },
        select: {
          id: true, targetLat: true, targetLon: true,
          targetBboxLon1: true, targetBboxLat1: true,
          targetBboxLon2: true, targetBboxLat2: true,
        },
      });

      const matchingIds = allGeoapifyCampaigns
        .filter((c) => {
          const cFilter =
            (c.targetBboxLon1 != null && c.targetBboxLat1 != null && c.targetBboxLon2 != null && c.targetBboxLat2 != null)
              ? `rect:${c.targetBboxLon1},${c.targetBboxLat1},${c.targetBboxLon2},${c.targetBboxLat2}`
              : (c.targetLat != null && c.targetLon != null)
                ? `circle:${c.targetLon},${c.targetLat},15000`
                : null;
          return cFilter === filterFingerprint;
        })
        .map((c) => c.id);

      const globalOffset = matchingIds.length > 0
        ? await db.prospectBusiness.count({ where: { campaignId: { in: matchingIds } } })
        : 0;

      const fetchLimit = campaign.maxProspects ?? 200;
      log.info({ campaignId, globalOffset, fetchLimit }, 'Auto-discovery: kicking off Geoapify scrape');

      const places = await searchRestaurants(
        campaign.targetCity,
        env.GEOAPIFY_API_KEY!,
        fetchLimit,
        coords,
        globalOffset,
      );

      log.info({ campaignId, placesFound: places.length }, 'Auto-discovery: places scraped, queuing enrichment');

      for (const place of places) {
        const job: Record<string, unknown> = {
          campaignId,
          placeId: place.placeId,
          name: place.name,
          address: place.address as Record<string, unknown>,
        };
        if (place.categories?.length) job['categories'] = place.categories;
        if (place.phone) job['phone'] = place.phone;
        if (place.website) job['website'] = place.website;
        if (place.email) job['email'] = place.email;
        if (place.facebook) job['facebook'] = place.facebook;
        if (place.instagram) job['instagram'] = place.instagram;

        await prospectDiscoveredQueue().add(`place:${place.placeId}`, job as never);
      }

      log.info({ campaignId, queued: places.length }, 'Auto-discovery: complete — enrichment workers will fill emails');
    } catch (err) {
      log.error({ err, campaignId }, 'Auto-discovery failed');
    }
  });
}
