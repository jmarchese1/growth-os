/**
 * Daily Send Agent — the brain of the outreach automation.
 *
 * Runs once per day. For every agent-active campaign:
 *   1. Picks up to `agentDailyCap` enriched prospects that haven't been sent to
 *   2. Sends AI-personalized cold emails via `sendColdEmail()` (rotates domains)
 *   3. Staggers sends by 3 minutes
 *   4. When a campaign has no more prospects → marks it exhausted and (if autoRotate)
 *      spawns a new campaign in the next city/industry from the rotation list
 *
 * All activity is recorded to AgentRun + events, which the /agent UI polls.
 */

import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { sendColdEmail } from '../outreach/email-sender.js';
import { getTotalDailyCapacity } from '../outreach/domain-rotator.js';
import { EventBuffer } from './events.js';
import { isCampaignExhausted, spawnNextCampaign } from './auto-rotate.js';

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
  trigger?: 'cron' | 'manual' | 'webhook';
  campaignId?: string; // if set, run only against this campaign (for testing)
  dryRun?: boolean;
}

/**
 * Entry point — run one agent pass.
 */
export async function runAgent(options: RunOptions = {}): Promise<RunResult> {
  const startedAt = new Date();
  const trigger = options.trigger ?? 'manual';

  // Create AgentRun row immediately so UI can pick up "running" state
  const run = await db.agentRun.create({
    data: {
      status: 'running',
      trigger,
      startedAt,
      events: [] as unknown as object,
    },
  });

  const buffer = new EventBuffer(run.id);
  buffer.info(`Agent run started (trigger: ${trigger})`);

  let status: 'completed' | 'failed' | 'partial' = 'completed';
  const stats = { campaignsTouched: 0, emailsSent: 0, emailsFailed: 0, campaignsSpawned: 0 };
  const errors: string[] = [];

  try {
    // Global kill switch check
    const config = await db.agentConfig.findUnique({ where: { id: 'singleton' } });
    if (!options.dryRun && config && !config.active) {
      buffer.warn('Agent is globally paused (AgentConfig.active=false). Run aborted.');
      await buffer.finalize('failed', { ...stats, errors: ['agent_paused'] }, startedAt);
      return {
        runId: run.id,
        status: 'failed',
        ...stats,
        durationMs: Date.now() - startedAt.getTime(),
      };
    }

    // Check capacity across all sending domains
    const capacity = await getTotalDailyCapacity();
    buffer.info(`Sending capacity: ${capacity.remaining} / ${capacity.totalCapacity} across ${capacity.domains.length} domains`);

    if (capacity.remaining <= 0) {
      buffer.warn('All sending domains at daily cap. No sends possible.');
      await buffer.finalize('failed', { ...stats, errors: ['no_capacity'] }, startedAt);
      return {
        runId: run.id,
        status: 'failed',
        ...stats,
        durationMs: Date.now() - startedAt.getTime(),
      };
    }

    const globalDailyCap = config?.globalDailyCap ?? 200;

    // Get active campaigns (scoped if campaignId given)
    const where = options.campaignId
      ? { id: options.campaignId }
      : { agentActive: true, active: true };

    const campaigns = await db.outboundCampaign.findMany({
      where,
      orderBy: { agentLastRunAt: { sort: 'asc', nulls: 'first' } }, // round-robin: LRU first
    });

    if (campaigns.length === 0) {
      buffer.warn('No agent-active campaigns to dispatch. Enable the agent on one or more campaigns.');
      await buffer.finalize('completed', stats, startedAt);
      return {
        runId: run.id,
        status: 'completed',
        ...stats,
        durationMs: Date.now() - startedAt.getTime(),
      };
    }

    buffer.info(`Found ${campaigns.length} agent-active campaign(s)`);

    // For each campaign — send up to agentDailyCap emails
    for (const campaign of campaigns) {
      if (stats.emailsSent >= globalDailyCap) {
        buffer.warn(`Global daily cap reached (${globalDailyCap}). Halting for today.`);
        status = 'partial';
        break;
      }

      const exhausted = await isCampaignExhausted(campaign.id);
      if (exhausted.exhausted) {
        buffer.info(`Campaign "${campaign.name}" exhausted (${exhausted.reason})`, {
          campaignId: campaign.id,
          campaignName: campaign.name,
        });

        // Mark exhausted + try to rotate
        await db.outboundCampaign.update({
          where: { id: campaign.id },
          data: { agentExhaustedAt: new Date(), agentActive: false },
        });

        if (config?.autoRotate !== false) {
          const spawned = await spawnNextCampaign(campaign, buffer).catch((err) => {
            buffer.error(`Failed to spawn next campaign: ${err instanceof Error ? err.message : String(err)}`);
            return null;
          });
          if (spawned) stats.campaignsSpawned++;
        }
        continue;
      }

      buffer.info(`Campaign "${campaign.name}" has ${exhausted.remaining} sendable prospects`, {
        campaignId: campaign.id,
        campaignName: campaign.name,
      });

      // Get the next N prospects to send to
      const cap = Math.min(
        campaign.agentDailyCap,
        capacity.remaining - stats.emailsSent,
        globalDailyCap - stats.emailsSent,
      );
      if (cap <= 0) {
        buffer.warn('Capacity exhausted before we could send to this campaign.');
        status = 'partial';
        break;
      }

      const prospects = await db.prospectBusiness.findMany({
        where: {
          campaignId: campaign.id,
          email: { not: null },
          status: 'ENRICHED',
          messages: { none: { stepNumber: 1 } },
        },
        include: { campaign: true },
        take: cap,
        orderBy: { createdAt: 'asc' }, // oldest first
      });

      if (prospects.length === 0) {
        buffer.info(`No eligible prospects found for "${campaign.name}"`, {
          campaignId: campaign.id,
        });
        continue;
      }

      // Flip AI personalization ON for agent-sent emails, preserving rest of config
      const currentConf = (campaign.apolloConfig as Record<string, unknown> | null) ?? {};
      if (currentConf['aiPersonalization'] !== true) {
        await db.outboundCampaign.update({
          where: { id: campaign.id },
          data: {
            apolloConfig: { ...currentConf, aiPersonalization: true },
          },
        });
      }

      stats.campaignsTouched++;
      buffer.info(`Dispatching ${prospects.length} personalized email(s) for "${campaign.name}"`, {
        campaignId: campaign.id,
      });

      for (let i = 0; i < prospects.length; i++) {
        const prospect = prospects[i]!;

        if (options.dryRun) {
          buffer.info(`[DRY-RUN] would send to ${prospect.email}`, {
            campaignId: campaign.id,
            prospectId: prospect.id,
            prospectName: prospect.name,
          });
          continue;
        }

        try {
          await sendColdEmail(prospect, campaign, { stepNumber: 1 });
          stats.emailsSent++;
          buffer.success(`Sent to ${prospect.name} (${prospect.email})`, {
            campaignId: campaign.id,
            prospectId: prospect.id,
            prospectName: prospect.name,
          });
        } catch (err) {
          stats.emailsFailed++;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${prospect.name}: ${msg}`);
          buffer.error(`Failed for ${prospect.name}: ${msg}`, {
            campaignId: campaign.id,
            prospectId: prospect.id,
            prospectName: prospect.name,
          });
        }

        // 3-minute stagger between sends (skip wait for dry-run and last send)
        if (i < prospects.length - 1) {
          await new Promise((r) => setTimeout(r, 3 * 60 * 1000));
        }
      }

      await db.outboundCampaign.update({
        where: { id: campaign.id },
        data: { agentLastRunAt: new Date() },
      });
    }

    // Success — update AgentConfig.lastRun
    if (!options.dryRun) {
      await db.agentConfig.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', active: true, lastRunAt: new Date(), lastRunStatus: status },
        update: { lastRunAt: new Date(), lastRunStatus: status },
      });
    }

    buffer.success(`Run complete. Sent ${stats.emailsSent}, failed ${stats.emailsFailed}, spawned ${stats.campaignsSpawned} new campaigns.`);
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
 * Quick-fire a lightweight status poll (used by UI).
 */
export async function getAgentStatus(): Promise<{
  config: {
    active: boolean;
    runHourET: number;
    globalDailyCap: number;
    autoRotate: boolean;
    lastRunAt: Date | null;
    lastRunStatus: string | null;
    nextRunAt: Date | null;
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
    agentActive: boolean;
    agentDailyCap: number;
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
}> {
  const [config, mostRecent, runningRuns, campaigns, capacity] = await Promise.all([
    db.agentConfig.findUnique({ where: { id: 'singleton' } }),
    db.agentRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    db.agentRun.findMany({ where: { status: 'running' }, take: 1 }),
    db.outboundCampaign.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    getTotalDailyCapacity(),
  ]);

  // Enrich each campaign with sendable/prospect counts
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
        agentActive: c.agentActive,
        agentDailyCap: c.agentDailyCap,
        agentLastRunAt: c.agentLastRunAt,
        agentExhaustedAt: c.agentExhaustedAt,
        prospectCount,
        sendableCount,
      };
    }),
  );

  return {
    config: {
      active: config?.active ?? false,
      runHourET: config?.runHourET ?? 9,
      globalDailyCap: config?.globalDailyCap ?? 200,
      autoRotate: config?.autoRotate ?? true,
      lastRunAt: config?.lastRunAt ?? null,
      lastRunStatus: config?.lastRunStatus ?? null,
      nextRunAt: config?.nextRunAt ?? null,
    },
    todayRun: mostRecent
      ? {
          id: mostRecent.id,
          status: mostRecent.status,
          startedAt: mostRecent.startedAt,
          completedAt: mostRecent.completedAt,
          emailsSent: mostRecent.emailsSent,
          emailsFailed: mostRecent.emailsFailed,
          campaignsTouched: mostRecent.campaignsTouched,
          campaignsSpawned: mostRecent.campaignsSpawned,
        }
      : null,
    isRunning: runningRuns.length > 0,
    campaigns: campaignsWithCounts,
    capacity: {
      totalCapacity: capacity.totalCapacity,
      totalSentToday: capacity.totalSentToday,
      remaining: capacity.remaining,
    },
  };
}
