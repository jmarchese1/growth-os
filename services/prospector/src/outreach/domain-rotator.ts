import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('prospector:domain-rotator');

type SendingDomain = Awaited<ReturnType<typeof db.sendingDomain.findFirst>> & {};

/**
 * Get the next available sending domain using round-robin (least recently used).
 * Returns null if no domains have capacity (triggers env fallback).
 */
export async function getNextDomain(): Promise<SendingDomain | null> {
  // Get today's date in ET (midnight ET = 5am UTC, or 4am UTC during EDT)
  const nowET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const today = new Date(nowET).toISOString().slice(0, 10);
  const todayMidnightUTC = new Date(today + 'T05:00:00.000Z'); // midnight ET in UTC

  // Lazy reset: reset sentToday for domains whose sentTodayDate is before today (ET)
  await db.sendingDomain.updateMany({
    where: {
      sentTodayDate: { lt: todayMidnightUTC },
    },
    data: { sentToday: 0, sentTodayDate: todayMidnightUTC },
  });

  // Find all active, verified domains
  const domains = await db.sendingDomain.findMany({
    where: { active: true, verified: true },
    orderBy: { lastUsedAt: { sort: 'asc', nulls: 'first' } },
  });

  for (const domain of domains) {
    // Skip if at daily limit
    if (domain.sentToday >= domain.dailyLimit) continue;

    // Skip if bounce rate > 25% (with minimum 50 sends to avoid low-sample false positives)
    if (domain.totalSent >= 50 && domain.bounceCount / domain.totalSent > 0.25) continue;

    return domain;
  }

  return null;
}

/**
 * Increment send counters after a successful email send.
 */
export async function incrementDomainSend(domainId: string): Promise<void> {
  await db.sendingDomain.update({
    where: { id: domainId },
    data: {
      sentToday: { increment: 1 },
      totalSent: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Record a bounce for a domain. Auto-disables if bounce rate exceeds 25%.
 */
export async function recordDomainBounce(domainId: string): Promise<void> {
  const domain = await db.sendingDomain.update({
    where: { id: domainId },
    data: { bounceCount: { increment: 1 } },
  });

  if (domain.totalSent >= 50 && domain.bounceCount / domain.totalSent > 0.25) {
    await db.sendingDomain.update({
      where: { id: domainId },
      data: { active: false, disabledReason: 'bounce_rate_exceeded' },
    });
    log.warn({ domainId, domain: domain.domain, bounceRate: (domain.bounceCount / domain.totalSent * 100).toFixed(1) }, 'Domain auto-disabled — bounce rate exceeded 25%');
  }
}

/**
 * Record an email open for a domain.
 */
export async function recordDomainOpen(domainId: string): Promise<void> {
  await db.sendingDomain.update({
    where: { id: domainId },
    data: { openCount: { increment: 1 } },
  });
}

/**
 * Advance warm-up stages for all warming domains.
 * Call daily from the cron scheduler.
 */
export async function advanceWarmup(): Promise<void> {
  const warmingDomains = await db.sendingDomain.findMany({
    where: { warmupComplete: false, warmupStartedAt: { not: null }, active: true },
  });

  const now = Date.now();
  for (const domain of warmingDomains) {
    if (!domain.warmupStartedAt) continue;
    const daysSinceStart = Math.floor((now - domain.warmupStartedAt.getTime()) / (24 * 60 * 60 * 1000));

    let stage: number;
    let limit: number;
    let complete = false;

    if (daysSinceStart >= 21) {
      stage = 4; limit = 50; complete = true;
    } else if (daysSinceStart >= 14) {
      stage = 3; limit = 30;
    } else if (daysSinceStart >= 7) {
      stage = 2; limit = 15;
    } else {
      stage = 1; limit = 5;
    }

    if (stage !== domain.warmupStage || complete !== domain.warmupComplete) {
      await db.sendingDomain.update({
        where: { id: domain.id },
        data: { warmupStage: stage, dailyLimit: limit, warmupComplete: complete },
      });
      log.info({ domain: domain.domain, stage, dailyLimit: limit, complete }, 'Warm-up stage advanced');
    }
  }
}

/**
 * Reset daily send counts. Called at midnight ET from scheduled job.
 */
export async function resetDailyCounts(): Promise<void> {
  const result = await db.sendingDomain.updateMany({
    data: { sentToday: 0, sentTodayDate: new Date() },
  });
  log.info({ domainsReset: result.count }, 'Daily send counts reset (midnight ET)');
}

/**
 * Total sending capacity across all active, verified domains today.
 */
export async function getTotalDailyCapacity(): Promise<{
  totalCapacity: number;
  totalSentToday: number;
  remaining: number;
  domains: Array<{ domain: string; limit: number; sent: number; stage: number }>;
}> {
  const domains = await db.sendingDomain.findMany({
    where: { active: true, verified: true },
    orderBy: { domain: 'asc' },
  });

  let totalCapacity = 0;
  let totalSentToday = 0;
  const list = domains.map((d) => {
    totalCapacity += d.dailyLimit;
    totalSentToday += d.sentToday;
    return {
      domain: d.domain,
      limit: d.dailyLimit,
      sent: d.sentToday,
      stage: d.warmupStage,
    };
  });

  return {
    totalCapacity,
    totalSentToday,
    remaining: Math.max(0, totalCapacity - totalSentToday),
    domains: list,
  };
}
