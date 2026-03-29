import { db } from '@embedo/db';
import { outreachSendQueue } from '@embedo/queue';
import { createLogger } from '@embedo/utils';
import { advanceWarmup } from '../outreach/domain-rotator.js';

const log = createLogger('prospector:auto-sender');

/**
 * Auto-sender configuration.
 * Ramps up daily volume over 4 weeks:
 *   Week 1: 15/day
 *   Week 2: 25/day
 *   Week 3: 40/day
 *   Week 4+: 50/day
 */
const RAMP_SCHEDULE = [
  { days: 7, dailyLimit: 15 },
  { days: 14, dailyLimit: 25 },
  { days: 21, dailyLimit: 40 },
  { days: Infinity, dailyLimit: 50 },
];

// Send window: 9am - 5pm ET (14:00 - 22:00 UTC)
const SEND_WINDOW_START_UTC = 14; // 9am ET
const SEND_WINDOW_END_UTC = 22;   // 5pm ET

// Track when auto-sender was first activated (stored in DB or memory)
let activatedAt: Date | null = null;
let sentTodayCount = 0;
let sentTodayDate = '';

function getDailyLimit(): number {
  if (!activatedAt) return RAMP_SCHEDULE[0]!.dailyLimit;
  const daysSinceActivation = Math.floor((Date.now() - activatedAt.getTime()) / (24 * 60 * 60 * 1000));
  for (const stage of RAMP_SCHEDULE) {
    if (daysSinceActivation < stage.days) return stage.dailyLimit;
  }
  return RAMP_SCHEDULE[RAMP_SCHEDULE.length - 1]!.dailyLimit;
}

function isInSendWindow(): boolean {
  const hour = new Date().getUTCHours();
  return hour >= SEND_WINDOW_START_UTC && hour < SEND_WINDOW_END_UTC;
}

function resetDailyCountIfNeeded(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (sentTodayDate !== today) {
    sentTodayCount = 0;
    sentTodayDate = today;
  }
}

/**
 * Find the next unsent prospect across all active campaigns.
 * Goes through campaigns sequentially, picks the first ENRICHED prospect
 * (has email, hasn't been contacted yet).
 */
async function findNextProspect(): Promise<{ prospectId: string; campaignId: string } | null> {
  const campaigns = await db.outboundCampaign.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });

  for (const campaign of campaigns) {
    const prospect = await db.prospectBusiness.findFirst({
      where: {
        campaignId: campaign.id,
        status: 'ENRICHED', // Has email, hasn't been contacted
        email: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true },
    });

    if (prospect) {
      log.debug({ campaignId: campaign.id, campaignName: campaign.name, prospectId: prospect.id, name: prospect.name }, 'Found next prospect');
      return { prospectId: prospect.id, campaignId: campaign.id };
    }
  }

  return null;
}

/**
 * Queue one email send. Returns true if queued, false if nothing to send.
 */
async function queueOneSend(): Promise<boolean> {
  const next = await findNextProspect();
  if (!next) {
    log.info('No unsent prospects found across active campaigns');
    return false;
  }

  await outreachSendQueue().add(
    `auto:${next.prospectId}:step1`,
    { prospectId: next.prospectId, campaignId: next.campaignId, channel: 'email', stepNumber: 1 },
    { delay: 0 }, // Send immediately (the interval handles spacing)
  );

  sentTodayCount++;
  log.info({ prospectId: next.prospectId, campaignId: next.campaignId, sentToday: sentTodayCount }, 'Auto-send queued');
  return true;
}

/**
 * Main auto-sender loop. Called on an interval.
 * Checks if we're in the send window and under the daily limit,
 * then queues the next email.
 */
async function tick(): Promise<void> {
  try {
    resetDailyCountIfNeeded();

    // Check send window
    if (!isInSendWindow()) {
      return;
    }

    // Check daily limit
    const limit = getDailyLimit();
    if (sentTodayCount >= limit) {
      return;
    }

    // Queue one send
    await queueOneSend();
  } catch (err) {
    log.error({ err }, 'Auto-sender tick error');
  }
}

/**
 * Start the auto-sender. Runs on an interval that spaces sends
 * evenly across the send window.
 *
 * With 15 sends over 8 hours = ~32 min between sends
 * With 50 sends over 8 hours = ~9.6 min between sends
 */
export function startAutoSender(): void {
  activatedAt = new Date();
  sentTodayCount = 0;
  sentTodayDate = new Date().toISOString().slice(0, 10);

  const limit = getDailyLimit();
  const sendWindowHours = SEND_WINDOW_END_UTC - SEND_WINDOW_START_UTC; // 8 hours
  const intervalMs = Math.floor((sendWindowHours * 60 * 60 * 1000) / limit);

  // Add some randomness (plus/minus 20%) so sends don't look robotic
  function scheduleNext(): void {
    const jitter = intervalMs * 0.2;
    const delay = intervalMs + Math.floor(Math.random() * jitter * 2 - jitter);
    setTimeout(async () => {
      await tick();
      scheduleNext();
    }, Math.max(60_000, delay)); // minimum 1 minute between sends
  }

  // Also advance domain warm-up stages daily
  advanceWarmup().catch(() => {});

  log.info({ dailyLimit: limit, intervalMinutes: Math.round(intervalMs / 60_000), sendWindow: '9am-5pm ET' }, 'Auto-sender started');

  // First tick immediately (if in window)
  tick().then(() => scheduleNext()).catch(() => scheduleNext());
}
