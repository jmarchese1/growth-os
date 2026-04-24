/**
 * Campaign auto-rotation — when an agent-active campaign runs out of prospects
 * to email, spawn a new campaign in the next city/industry from the rotation
 * list, and carry forward the email subject + body.
 */

import { db } from '@embedo/db';
import type { BusinessType, OutboundCampaign } from '@embedo/db';
import type { EventBuffer } from './events.js';

const DEFAULT_ROTATION_CITIES = [
  'Brooklyn, NY', 'Queens, NY', 'Manhattan, NY', 'Bronx, NY', 'Staten Island, NY',
  'Jersey City, NJ', 'Hoboken, NJ', 'Newark, NJ',
  'Long Island City, NY', 'Astoria, NY', 'Williamsburg, NY',
  'Philadelphia, PA', 'Boston, MA', 'Washington DC',
];

const DEFAULT_ROTATION_INDUSTRIES: BusinessType[] = [
  'RESTAURANT', 'SALON', 'FITNESS', 'RETAIL', 'MEDICAL',
];

interface RotationConfig {
  cities: string[];
  industries: BusinessType[];
}

export async function getRotationConfig(): Promise<RotationConfig> {
  const config = await db.agentConfig.findUnique({ where: { id: 'singleton' } });
  const cities = (config?.rotationCities as string[] | null) ?? DEFAULT_ROTATION_CITIES;
  const industries = (config?.rotationIndustries as BusinessType[] | null) ?? DEFAULT_ROTATION_INDUSTRIES;
  return { cities, industries };
}

/**
 * Check if a campaign has exhausted its agent pool — i.e. no more prospects
 * that can be emailed via the agent today or future. Returns true if the
 * campaign is out of work.
 */
export async function isCampaignExhausted(campaignId: string): Promise<{
  exhausted: boolean;
  reason: string;
  remaining: number;
}> {
  const remaining = await db.prospectBusiness.count({
    where: {
      campaignId,
      email: { not: null },
      status: 'ENRICHED',
      messages: { none: { stepNumber: 1 } },
    },
  });

  if (remaining === 0) {
    return { exhausted: true, reason: 'No unsent enriched prospects', remaining: 0 };
  }
  return { exhausted: false, reason: '', remaining };
}

/**
 * Pick the next (city, industry) combo that isn't already running.
 * Goes row-by-row through the cross product.
 */
async function pickNextRotation(config: RotationConfig): Promise<{ city: string; industry: BusinessType } | null> {
  // Existing campaigns — city + industry pairs already in use
  const existing = await db.outboundCampaign.findMany({
    select: { targetCity: true, targetIndustry: true },
  });
  const taken = new Set(existing.map((c) => `${c.targetCity.toLowerCase().trim()}::${c.targetIndustry}`));

  for (const industry of config.industries) {
    for (const city of config.cities) {
      const key = `${city.toLowerCase().trim()}::${industry}`;
      if (!taken.has(key)) {
        return { city, industry };
      }
    }
  }
  return null;
}

/**
 * Spawn a new agent-active campaign, cloning email copy from a reference campaign.
 */
export async function spawnNextCampaign(
  referenceCampaign: OutboundCampaign,
  buffer: EventBuffer,
): Promise<OutboundCampaign | null> {
  const config = await getRotationConfig();
  const next = await pickNextRotation(config);

  if (!next) {
    buffer.warn('No rotation slots left (all city×industry pairs used).');
    return null;
  }

  const humanCity = next.city.split(',')[0]?.trim() ?? next.city;

  const data: Parameters<typeof db.outboundCampaign.create>[0]['data'] = {
    name: `${humanCity} ${next.industry.toLowerCase()} ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    targetCity: next.city.split(',')[0]?.trim() ?? next.city,
    targetState: next.city.includes(',') ? (next.city.split(',')[1]?.trim() ?? null) : null,
    targetCountry: 'US',
    targetIndustry: next.industry,
    discoverySource: 'geoapify',
    emailSubject: referenceCampaign.emailSubject,
    emailBodyHtml: referenceCampaign.emailBodyHtml,
    maxProspects: referenceCampaign.maxProspects ?? 200,
    active: true,
    agentActive: true,
    agentDailyCap: referenceCampaign.agentDailyCap,
    agentRotationSource: 'auto-spawned',
  };
  // Conditionally add JSON fields (can't pass undefined with exactOptionalPropertyTypes)
  if (referenceCampaign.sequenceSteps !== null) {
    data.sequenceSteps = referenceCampaign.sequenceSteps as object;
  }
  if (referenceCampaign.apolloConfig !== null) {
    data.apolloConfig = referenceCampaign.apolloConfig as object;
  }

  const created = await db.outboundCampaign.create({ data });

  buffer.success(`Spawned new campaign in ${humanCity} (${next.industry})`, {
    campaignId: created.id,
    campaignName: created.name,
  });

  return created;
}
