/**
 * Agent event log helper.
 * Events are buffered in-memory during a run and persisted to AgentRun.events as JSON.
 */

import { db } from '@embedo/db';

export type AgentEventLevel = 'info' | 'success' | 'warn' | 'error';

export interface AgentEvent {
  ts: string;
  level: AgentEventLevel;
  msg: string;
  campaignId?: string;
  campaignName?: string;
  prospectId?: string;
  prospectName?: string;
  meta?: Record<string, unknown>;
}

export class EventBuffer {
  private events: AgentEvent[] = [];
  private runId: string;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(runId: string) {
    this.runId = runId;
    // Periodic flush so the UI sees live progress
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, 2_000);
  }

  push(level: AgentEventLevel, msg: string, extra?: Partial<AgentEvent>): void {
    this.events.push({
      ts: new Date().toISOString(),
      level,
      msg,
      ...extra,
    });
  }

  info(msg: string, extra?: Partial<AgentEvent>) { this.push('info', msg, extra); }
  success(msg: string, extra?: Partial<AgentEvent>) { this.push('success', msg, extra); }
  warn(msg: string, extra?: Partial<AgentEvent>) { this.push('warn', msg, extra); }
  error(msg: string, extra?: Partial<AgentEvent>) { this.push('error', msg, extra); }

  all(): AgentEvent[] { return [...this.events]; }

  async flush(): Promise<void> {
    try {
      // Cast because JSON field types in Prisma are permissive but strict
      await db.agentRun.update({
        where: { id: this.runId },
        data: { events: this.events as unknown as object },
      });
    } catch {
      // Non-critical
    }
  }

  async finalize(
    status: 'completed' | 'failed' | 'partial',
    stats: { campaignsTouched: number; emailsSent: number; emailsFailed: number; campaignsSpawned: number; errors?: unknown },
    startedAt: Date,
  ): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    try {
      const updateData: Parameters<typeof db.agentRun.update>[0]['data'] = {
        status,
        completedAt,
        durationMs,
        campaignsTouched: stats.campaignsTouched,
        emailsSent: stats.emailsSent,
        emailsFailed: stats.emailsFailed,
        campaignsSpawned: stats.campaignsSpawned,
        events: this.events as unknown as object,
      };
      if (stats.errors !== undefined) {
        updateData.errors = stats.errors as object;
      }
      await db.agentRun.update({ where: { id: this.runId }, data: updateData });
    } catch {
      /* non-critical */
    }
  }
}
