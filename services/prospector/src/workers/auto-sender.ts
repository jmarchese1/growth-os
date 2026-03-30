import { db } from '@embedo/db';
import { outreachSendQueue } from '@embedo/queue';
import { createLogger } from '@embedo/utils';
import { advanceWarmup } from '../outreach/domain-rotator.js';

const log = createLogger('prospector:auto-sender');

interface RampStage { week: number; dailyLimit: number; }

async function getConfig() {
  let config = await db.autoSenderConfig.findUnique({ where: { id: 'singleton' } });
  if (!config) {
    config = await db.autoSenderConfig.create({
      data: {
        id: 'singleton',
        active: false,
        rampSchedule: [
          { week: 1, dailyLimit: 15 },
          { week: 2, dailyLimit: 25 },
          { week: 3, dailyLimit: 40 },
          { week: 4, dailyLimit: 50 },
        ],
      },
    });
  }
  return config;
}

function getDailyLimit(rampSchedule: RampStage[], activatedAt: Date | null): number {
  if (!activatedAt) return rampSchedule[0]?.dailyLimit ?? 15;
  const daysSince = Math.floor((Date.now() - activatedAt.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.floor(daysSince / 7) + 1;

  // Find the matching stage (last stage that matches or the final one)
  let limit = rampSchedule[rampSchedule.length - 1]?.dailyLimit ?? 50;
  for (const stage of rampSchedule) {
    if (weekNumber <= stage.week) { limit = stage.dailyLimit; break; }
  }
  return limit;
}

function isInSendWindow(startHourET: number, endHourET: number): boolean {
  const startUTC = startHourET + 5; // ET to UTC (EST = UTC-5)
  const endUTC = endHourET + 5;
  const hour = new Date().getUTCHours();
  return hour >= startUTC && hour < endUTC;
}

async function findNextProspect(campaignIds: string[] | null): Promise<{ prospectId: string; campaignId: string } | null> {
  const where = campaignIds && campaignIds.length > 0
    ? { id: { in: campaignIds }, active: true }
    : { active: true };

  const campaigns = await db.outboundCampaign.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  for (const campaign of campaigns) {
    const prospect = await db.prospectBusiness.findFirst({
      where: {
        campaignId: campaign.id,
        status: 'ENRICHED',
        email: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (prospect) return { prospectId: prospect.id, campaignId: campaign.id };
  }
  return null;
}

async function tick(): Promise<void> {
  try {
    const config = await getConfig();
    if (!config.active) return;

    const ramp = config.rampSchedule as unknown as RampStage[];
    const campaignIds = config.campaignIds as string[] | null;

    if (!isInSendWindow(config.sendWindowStart, config.sendWindowEnd)) return;

    // Lazy reset daily count
    const today = new Date().toISOString().slice(0, 10);
    const configDate = config.sentTodayDate.toISOString().slice(0, 10);
    if (configDate !== today) {
      await db.autoSenderConfig.update({
        where: { id: 'singleton' },
        data: { sentToday: 0, sentTodayDate: new Date(today + 'T00:00:00.000Z') },
      });
      config.sentToday = 0;
    }

    const limit = getDailyLimit(ramp, config.activatedAt);
    if (config.sentToday >= limit) return;

    const next = await findNextProspect(campaignIds);
    if (!next) return;

    await outreachSendQueue().add(
      `auto:${next.prospectId}:step1`,
      { prospectId: next.prospectId, campaignId: next.campaignId, channel: 'email', stepNumber: 1 },
      { delay: 0 },
    );

    await db.autoSenderConfig.update({
      where: { id: 'singleton' },
      data: { sentToday: { increment: 1 } },
    });

    log.info({ prospectId: next.prospectId, sentToday: config.sentToday + 1, limit }, 'Auto-send queued');
  } catch (err) {
    log.error({ err }, 'Auto-sender tick error');
  }
}

export function startAutoSender(): void {
  // Run tick every 5 minutes. The tick itself checks config, window, limits.
  const INTERVAL_MS = 5 * 60 * 1000;

  advanceWarmup().catch(() => {});

  async function loop(): Promise<void> {
    await tick();
    // Recalculate interval based on current config for proper spacing
    const config = await getConfig().catch(() => null);
    if (config?.active) {
      const ramp = config.rampSchedule as unknown as RampStage[];
      const limit = getDailyLimit(ramp, config.activatedAt);
      const windowHours = config.sendWindowEnd - config.sendWindowStart;
      const idealInterval = Math.floor((windowHours * 60 * 60 * 1000) / Math.max(1, limit));
      const jitter = idealInterval * 0.2;
      const delay = Math.max(60_000, idealInterval + Math.floor(Math.random() * jitter * 2 - jitter));
      setTimeout(loop, delay);
    } else {
      // Check again in 5 min if not active
      setTimeout(loop, INTERVAL_MS);
    }
  }

  log.info('Auto-sender initialized (reads config from DB)');
  setTimeout(loop, 10_000); // first tick 10s after startup
}
