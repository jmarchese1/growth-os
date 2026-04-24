/**
 * Daily Send Agent — agent-scoped orchestrator.
 *
 * For a given Agent:
 *   1. Finds its active campaigns (or spawns one from rotation if none)
 *   2. For each campaign, sends up to `agent.dailyCap` AI-personalized emails
 *   3. Writes every event to Google Sheets in real-time
 *   4. Auto-rotates to new cities/industries when campaigns exhaust
 */

import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { sendColdEmail } from '../outreach/email-sender.js';
import { getTotalDailyCapacity } from '../outreach/domain-rotator.js';
import { EventBuffer } from './events.js';
import { isCampaignExhausted, spawnNextCampaignForAgent } from './auto-rotate.js';
import { writeEmailRow, writeLogRow, writeDailySummary } from './sheets.js';

const log = createLogger('agent:daily-send');

interface RunResult {
  runId: string;
  status: 'completed' | 'failed' | 'partial';
  campaignsTouched: number;
  emailsSent: number;
  emailsFailed: number;
  campaignsSpawned: number;
  durationMs: number;
}

export interface RunOptions {
  agentId: string;
  trigger?: 'cron' | 'manual' | 'webhook';
  dryRun?: boolean;
}

export async function runAgent(options: RunOptions): Promise<RunResult> {
  const startedAt = new Date();
  const trigger = options.trigger ?? 'manual';

  const agent = await db.agent.findUnique({ where: { id: options.agentId } });
  if (!agent) {
    throw new Error(`Agent ${options.agentId} not found`);
  }

  const run = await db.agentRun.create({
    data: { agentId: agent.id, status: 'running', trigger, startedAt, events: [] as unknown as object },
  });

  const buffer = new EventBuffer(run.id);
  buffer.info(`Agent "${agent.name}" started — trigger: ${trigger}`);

  // Sheets log — start event
  void writeLogRow(agent.id, { agentName: agent.name, runId: run.id, level: 'info', message: `Agent run started (${trigger})` });

  let status: 'completed' | 'failed' | 'partial' = 'completed';
  const stats = { campaignsTouched: 0, emailsSent: 0, emailsFailed: 0, campaignsSpawned: 0 };
  const errors: string[] = [];

  try {
    // Kill switch
    if (!options.dryRun && !agent.active) {
      buffer.warn(`Agent "${agent.name}" is paused — aborting.`);
      await buffer.finalize('failed', { ...stats, errors: ['agent_paused'] }, startedAt);
      return { runId: run.id, status: 'failed', ...stats, durationMs: Date.now() - startedAt.getTime() };
    }

    const capacity = await getTotalDailyCapacity();
    buffer.info(`Sending capacity: ${capacity.remaining}/${capacity.totalCapacity} across ${capacity.domains.length} domains`);

    if (capacity.remaining <= 0) {
      buffer.warn('All sending domains at daily cap.');
      await buffer.finalize('failed', { ...stats, errors: ['no_capacity'] }, startedAt);
      return { runId: run.id, status: 'failed', ...stats, durationMs: Date.now() - startedAt.getTime() };
    }

    // Get campaigns owned by this agent
    let campaigns = await db.outboundCampaign.findMany({
      where: { agentId: agent.id, active: true },
      orderBy: { agentLastRunAt: { sort: 'asc', nulls: 'first' } },
    });

    // If agent has no campaigns, spawn one immediately from the rotation
    if (campaigns.length === 0 && agent.autoRotate) {
      buffer.info(`Agent has no campaigns — spawning from rotation`);
      const spawned = await spawnNextCampaignForAgent(agent, buffer);
      if (spawned) {
        stats.campaignsSpawned++;
        campaigns = [spawned];
      }
    }

    if (campaigns.length === 0) {
      buffer.warn('No campaigns available and auto-rotate is off. Add rotation targets or create a campaign manually.');
      await buffer.finalize('completed', stats, startedAt);
      return { runId: run.id, status: 'completed', ...stats, durationMs: Date.now() - startedAt.getTime() };
    }

    buffer.info(`Working across ${campaigns.length} campaign(s)`);

    for (const campaign of campaigns) {
      if (stats.emailsSent >= agent.dailyCap) {
        buffer.warn(`Agent daily cap reached (${agent.dailyCap})`);
        status = 'partial';
        break;
      }

      const exhausted = await isCampaignExhausted(campaign.id);
      if (exhausted.exhausted) {
        buffer.info(`Campaign "${campaign.name}" exhausted (${exhausted.reason})`, {
          campaignId: campaign.id, campaignName: campaign.name,
        });
        await db.outboundCampaign.update({
          where: { id: campaign.id },
          data: { agentExhaustedAt: new Date(), active: false },
        });

        if (agent.autoRotate) {
          const spawned = await spawnNextCampaignForAgent(agent, buffer).catch((err) => {
            buffer.error(`Failed to spawn next campaign: ${err instanceof Error ? err.message : String(err)}`);
            return null;
          });
          if (spawned) {
            stats.campaignsSpawned++;
            // Work on the newly-spawned campaign in this same run
            campaigns.push(spawned);
          }
        }
        continue;
      }

      buffer.info(`Campaign "${campaign.name}" — ${exhausted.remaining} sendable prospects`, {
        campaignId: campaign.id, campaignName: campaign.name,
      });

      const cap = Math.min(
        agent.dailyCap - stats.emailsSent,
        capacity.remaining - stats.emailsSent,
      );
      if (cap <= 0) break;

      const prospects = await db.prospectBusiness.findMany({
        where: {
          campaignId: campaign.id,
          email: { not: null },
          status: 'ENRICHED',
          messages: { none: { stepNumber: 1 } },
        },
        include: { campaign: true },
        take: cap,
        orderBy: { createdAt: 'asc' },
      });

      if (prospects.length === 0) continue;

      // Enable AI personalization on this campaign (idempotent)
      const conf = (campaign.apolloConfig as Record<string, unknown> | null) ?? {};
      if (conf['aiPersonalization'] !== true) {
        await db.outboundCampaign.update({
          where: { id: campaign.id },
          data: { apolloConfig: { ...conf, aiPersonalization: true, systemPrompt: agent.systemPrompt ?? undefined } },
        });
      }

      stats.campaignsTouched++;
      buffer.info(`Dispatching ${prospects.length} for "${campaign.name}"`, { campaignId: campaign.id });

      for (let i = 0; i < prospects.length; i++) {
        const prospect = prospects[i]!;

        if (options.dryRun) {
          buffer.info(`[dry-run] would send to ${prospect.email}`, {
            campaignId: campaign.id, prospectId: prospect.id, prospectName: prospect.name,
          });
          continue;
        }

        try {
          await sendColdEmail(prospect, campaign, { stepNumber: 1 });
          stats.emailsSent++;

          // Grab the domain that was actually used
          const lastMsg = await db.outreachMessage.findFirst({
            where: { prospectId: prospect.id, stepNumber: 1 },
            orderBy: { createdAt: 'desc' },
            include: { sendingDomain: true },
          });

          buffer.success(`Sent to ${prospect.name} (${prospect.email})`, {
            campaignId: campaign.id, prospectId: prospect.id, prospectName: prospect.name,
          });

          // Sheets: write email row + log
          void writeEmailRow(agent.id, {
            agentName: agent.name,
            campaignName: campaign.name,
            businessName: prospect.name,
            toEmail: prospect.email ?? '',
            subject: lastMsg?.subject ?? campaign.emailSubject,
            fromDomain: lastMsg?.sendingDomain?.domain ?? '',
            stepNumber: 1,
            status: 'SENT',
          });
          void writeLogRow(agent.id, {
            agentName: agent.name,
            runId: run.id,
            level: 'success',
            message: `Sent to ${prospect.name}`,
            campaignName: campaign.name,
            prospectName: prospect.name,
          });
        } catch (err) {
          stats.emailsFailed++;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${prospect.name}: ${msg}`);
          buffer.error(`Failed for ${prospect.name}: ${msg}`, {
            campaignId: campaign.id, prospectId: prospect.id, prospectName: prospect.name,
          });
          void writeLogRow(agent.id, {
            agentName: agent.name, runId: run.id, level: 'error',
            message: `Failed: ${msg}`, campaignName: campaign.name, prospectName: prospect.name,
          });
        }

        if (i < prospects.length - 1 && stats.emailsSent < agent.dailyCap) {
          await new Promise((r) => setTimeout(r, 3 * 60 * 1000));
        }
      }

      await db.outboundCampaign.update({
        where: { id: campaign.id },
        data: { agentLastRunAt: new Date() },
      });
    }

    if (!options.dryRun) {
      await db.agent.update({
        where: { id: agent.id },
        data: { lastRunAt: new Date(), lastRunStatus: status },
      });
    }

    buffer.success(`Run complete. Sent ${stats.emailsSent}, failed ${stats.emailsFailed}, spawned ${stats.campaignsSpawned}`);

    // Daily summary row
    void writeDailySummary(agent.id, {
      agentName: agent.name,
      prospectsAdded: 0, // filled by discovery, not send
      emailsSent: stats.emailsSent,
      opens: 0,
      replies: 0,
      meetingsBooked: 0,
      bounces: 0,
      campaignsSpawned: stats.campaignsSpawned,
    });
  } catch (err) {
    status = 'failed';
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Run error: ${msg}`);
    buffer.error(`Run failed: ${msg}`);
    log.error({ err }, 'Agent run failed');
  }

  const durationMs = Date.now() - startedAt.getTime();
  await buffer.finalize(status, { ...stats, errors: errors.length > 0 ? errors : undefined }, startedAt);

  return { runId: run.id, status, ...stats, durationMs };
}

/**
 * Agent-scoped status poll for the /agents/[id]/run UI.
 */
export async function getAgentStatus(agentId: string): Promise<{
  agent: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    dailyCap: number;
    autoRotate: boolean;
    sheetUrl: string | null;
    lastRunAt: Date | null;
    lastRunStatus: string | null;
    targetCities: string[];
    targetIndustries: string[];
  };
  todayRun: {
    id: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    emailsSent: number;
    emailsFailed: number;
    campaignsTouched: number;
    campaignsSpawned: number;
  } | null;
  isRunning: boolean;
  campaigns: Array<{
    id: string;
    name: string;
    targetCity: string;
    targetIndustry: string;
    agentLastRunAt: Date | null;
    agentExhaustedAt: Date | null;
    prospectCount: number;
    sendableCount: number;
  }>;
  capacity: {
    totalCapacity: number;
    totalSentToday: number;
    remaining: number;
  };
} | null> {
  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent) return null;

  const [mostRecentRun, runningRuns, campaigns, capacity] = await Promise.all([
    db.agentRun.findFirst({ where: { agentId }, orderBy: { startedAt: 'desc' } }),
    db.agentRun.findMany({ where: { agentId, status: 'running' }, take: 1 }),
    db.outboundCampaign.findMany({ where: { agentId, active: true }, orderBy: { createdAt: 'desc' } }),
    getTotalDailyCapacity(),
  ]);

  const campaignsWithCounts = await Promise.all(
    campaigns.map(async (c) => {
      const [prospectCount, sendableCount] = await Promise.all([
        db.prospectBusiness.count({ where: { campaignId: c.id } }),
        db.prospectBusiness.count({
          where: {
            campaignId: c.id,
            email: { not: null },
            status: 'ENRICHED',
            messages: { none: { stepNumber: 1 } },
          },
        }),
      ]);
      return {
        id: c.id,
        name: c.name,
        targetCity: c.targetCity,
        targetIndustry: c.targetIndustry,
        agentLastRunAt: c.agentLastRunAt,
        agentExhaustedAt: c.agentExhaustedAt,
        prospectCount,
        sendableCount,
      };
    }),
  );

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      active: agent.active,
      dailyCap: agent.dailyCap,
      autoRotate: agent.autoRotate,
      sheetUrl: agent.sheetUrl,
      lastRunAt: agent.lastRunAt,
      lastRunStatus: agent.lastRunStatus,
      targetCities: (agent.targetCities as string[] | null) ?? [],
      targetIndustries: (agent.targetIndustries as string[] | null) ?? [],
    },
    todayRun: mostRecentRun ? {
      id: mostRecentRun.id,
      status: mostRecentRun.status,
      startedAt: mostRecentRun.startedAt,
      completedAt: mostRecentRun.completedAt,
      emailsSent: mostRecentRun.emailsSent,
      emailsFailed: mostRecentRun.emailsFailed,
      campaignsTouched: mostRecentRun.campaignsTouched,
      campaignsSpawned: mostRecentRun.campaignsSpawned,
    } : null,
    isRunning: runningRuns.length > 0,
    campaigns: campaignsWithCounts,
    capacity: {
      totalCapacity: capacity.totalCapacity,
      totalSentToday: capacity.totalSentToday,
      remaining: capacity.remaining,
    },
  };
}
