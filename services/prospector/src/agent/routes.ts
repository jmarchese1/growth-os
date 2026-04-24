/**
 * Agent HTTP routes — mounts under /agent/* in the prospector service.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { runAgent, getAgentStatus } from './daily-send.js';

const log = createLogger('agent:routes');

export async function registerAgentRoutes(app: FastifyInstance): Promise<void> {
  // ── Status — polled by the /agent UI for live updates ──
  app.get('/agent/status', async (_req, reply) => {
    const status = await getAgentStatus();
    return reply.send(status);
  });

  // ── Recent runs with their events ──
  app.get('/agent/runs', async (req, reply) => {
    const query = req.query as { limit?: string };
    const limit = Math.min(100, parseInt(query.limit ?? '20'));

    const runs = await db.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return reply.send({ runs });
  });

  // ── Single run — full event log ──
  app.get('/agent/runs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const run = await db.agentRun.findUnique({ where: { id } });
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    return reply.send(run);
  });

  // ── Trigger a run (manual) ──
  app.post('/agent/trigger', async (req, reply) => {
    const body = (req.body ?? {}) as { campaignId?: string; dryRun?: boolean };

    // Fire-and-forget: don't block the request on a multi-hour send loop
    // The UI polls /agent/status for progress
    const opts: { trigger: 'manual'; campaignId?: string; dryRun?: boolean } = { trigger: 'manual' };
    if (body.campaignId !== undefined) opts.campaignId = body.campaignId;
    if (body.dryRun !== undefined) opts.dryRun = body.dryRun;
    void runAgent(opts).catch((err: unknown) => log.error({ err }, 'Agent run failed'));

    // Small delay so the AgentRun row is definitely in the DB before the UI polls
    await new Promise((r) => setTimeout(r, 300));

    const latestRun = await db.agentRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    return reply.send({
      ok: true,
      runId: latestRun?.id,
      message: 'Agent run started. Poll /agent/status for progress.',
    });
  });

  // ── Cron-fired daily run (same as trigger but fixed trigger=cron) ──
  app.post('/agent/cron/daily', async (_req, reply) => {
    void runAgent({ trigger: 'cron' }).catch((err: unknown) => log.error({ err }, 'Cron agent run failed'));
    return reply.send({ ok: true, triggered: true });
  });

  // ── Pause / resume the agent globally ──
  app.post('/agent/pause', async (_req, reply) => {
    await db.agentConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', active: false },
      update: { active: false },
    });
    return reply.send({ ok: true, active: false });
  });

  app.post('/agent/resume', async (_req, reply) => {
    await db.agentConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', active: true },
      update: { active: true },
    });
    return reply.send({ ok: true, active: true });
  });

  // ── Config — fetch + update ──
  app.get('/agent/config', async (_req, reply) => {
    const config = await db.agentConfig.findUnique({ where: { id: 'singleton' } });
    return reply.send(config ?? { id: 'singleton', active: false, globalDailyCap: 200, autoRotate: true });
  });

  app.patch('/agent/config', async (req, reply) => {
    const schema = z.object({
      active: z.boolean().optional(),
      runHourET: z.number().int().min(0).max(23).optional(),
      globalDailyCap: z.number().int().min(1).max(10000).optional(),
      autoRotate: z.boolean().optional(),
      rotationCities: z.array(z.string()).nullable().optional(),
      rotationIndustries: z.array(z.string()).nullable().optional(),
    });
    const data = schema.parse(req.body);

    const updated = await db.agentConfig.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data } as never,
      update: data as never,
    });

    return reply.send(updated);
  });

  // ── Per-campaign agent toggle + cap ──
  app.patch('/agent/campaign/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const schema = z.object({
      agentActive: z.boolean().optional(),
      agentDailyCap: z.number().int().min(1).max(200).optional(),
    });
    const parsed = schema.parse(req.body);

    // Can't pass undefined with exactOptionalPropertyTypes; build minimal update
    const data: { agentActive?: boolean; agentDailyCap?: number } = {};
    if (parsed.agentActive !== undefined) data.agentActive = parsed.agentActive;
    if (parsed.agentDailyCap !== undefined) data.agentDailyCap = parsed.agentDailyCap;

    const updated = await db.outboundCampaign.update({
      where: { id },
      data,
    });

    return reply.send(updated);
  });
}
