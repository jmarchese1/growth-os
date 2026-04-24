/**
 * Campaign auto-rotation — agent-scoped.
 * When an agent runs out of prospects in its current campaign, spawn a new
 * one in the next (city × industry) slot from its own rotation list.
 */

import { db } from '@embedo/db';
import type { BusinessType, OutboundCampaign, Agent } from '@embedo/db';
import type { EventBuffer } from './events.js';

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
 * Find the next (city, industry) not already used by any campaign.
 */
async function pickNextSlot(cities: string[], industries: BusinessType[]): Promise<{ city: string; industry: BusinessType } | null> {
  const existing = await db.outboundCampaign.findMany({
    select: { targetCity: true, targetIndustry: true },
  });
  const taken = new Set(existing.map((c) => `${c.targetCity.toLowerCase().trim()}::${c.targetIndustry}`));

  for (const industry of industries) {
    for (const city of cities) {
      const cityShort = city.split(',')[0]?.trim() ?? city;
      const key = `${cityShort.toLowerCase()}::${industry}`;
      if (!taken.has(key)) {
        return { city, industry };
      }
    }
  }
  return null;
}

/**
 * Spawn a new campaign for the given agent — uses its rotation list,
 * its email copy, its system prompt.
 */
export async function spawnNextCampaignForAgent(
  agent: Agent,
  buffer: EventBuffer,
): Promise<OutboundCampaign | null> {
  const cities = (agent.targetCities as unknown as string[] | null) ?? [];
  const industries = (agent.targetIndustries as unknown as BusinessType[] | null) ?? ['RESTAURANT' as BusinessType];

  if (cities.length === 0) {
    buffer.warn(`Agent "${agent.name}" has no target cities — cannot rotate`);
    return null;
  }

  const slot = await pickNextSlot(cities, industries);
  if (!slot) {
    buffer.warn(`All (city × industry) slots used for "${agent.name}"`);
    return null;
  }

  const cityShort = slot.city.split(',')[0]?.trim() ?? slot.city;
  const stateCode = slot.city.includes(',') ? (slot.city.split(',')[1]?.trim() ?? null) : null;
  const label = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const data: Parameters<typeof db.outboundCampaign.create>[0]['data'] = {
    name: `${cityShort} · ${slot.industry.toLowerCase()} · ${label}`,
    targetCity: cityShort,
    targetState: stateCode,
    targetCountry: 'US',
    targetIndustry: slot.industry,
    discoverySource: 'geoapify',
    emailSubject: agent.emailSubject,
    emailBodyHtml: agent.emailBody,
    maxProspects: 200,
    active: true,
    agentId: agent.id,
    agentRotationSource: 'auto-spawned',
  };

  const created = await db.outboundCampaign.create({ data });

  buffer.success(`Spawned "${created.name}" for agent "${agent.name}"`, {
    campaignId: created.id, campaignName: created.name,
  });

  return created;
}
