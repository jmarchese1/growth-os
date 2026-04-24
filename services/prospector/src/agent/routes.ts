/**
 * Agent HTTP routes — mounts under /agents/* in the prospector service.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { runAgent, getAgentStatus } from './daily-send.js';
import { provisionAgentSheet } from './sheets.js';

const log = createLogger('agent:routes');

export async function registerAgentRoutes(app: FastifyInstance): Promise<void> {
  // ── List all agents ──
  app.get('/agents', async (_req, reply) => {
    const agents = await db.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { campaigns: true, runs: true } },
      },
    });
    return reply.send(agents);
  });

  // ── Get one agent ──
  app.get('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    return reply.send(agent);
  });

  // ── Create agent ──
  app.post('/agents', async (req, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      targetCities: z.array(z.string()).default([]),
      targetIndustries: z.array(z.string()).default(['RESTAURANT']),
      dailyCap: z.number().int().min(1).max(500).default(10),
      runHourET: z.number().int().min(0).max(23).default(9),
      autoRotate: z.boolean().default(true),
      emailSubject: z.string().default('quick question about {{company}}'),
      emailBody: z.string().default(''),
      systemPrompt: z.string().optional(),
      toneStyle: z.string().default('friendly'),
      ownerEmail: z.string().email().optional(), // for sheet sharing
    });
    const body = schema.parse(req.body);

    const created = await db.agent.create({
      data: {
        name: body.name,
        ...(body.description !== undefined ? { description: body.description } : {}),
        targetCities: body.targetCities,
        targetIndustries: body.targetIndustries,
        dailyCap: body.dailyCap,
        runHourET: body.runHourET,
        autoRotate: body.autoRotate,
        emailSubject: body.emailSubject,
        emailBody: body.emailBody,
        ...(body.systemPrompt !== undefined ? { systemPrompt: body.systemPrompt } : {}),
        toneStyle: body.toneStyle,
      },
    });

    // Provision a Google Sheet for this agent (async — don't block)
    void (async () => {
      const sheet = await provisionAgentSheet(created.name, body.ownerEmail);
      if (sheet) {
        await db.agent.update({
          where: { id: created.id },
          data: { googleSheetId: sheet.sheetId, sheetUrl: sheet.url, sheetProvisioned: true },
        });
      }
    })();

    return reply.send(created);
  });

  // ── Update agent ──
  app.patch('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().nullable().optional(),
      targetCities: z.array(z.string()).optional(),
      targetIndustries: z.array(z.string()).optional(),
      active: z.boolean().optional(),
      dailyCap: z.number().int().min(1).max(500).optional(),
      runHourET: z.number().int().min(0).max(23).optional(),
      autoRotate: z.boolean().optional(),
      emailSubject: z.string().optional(),
      emailBody: z.string().optional(),
      systemPrompt: z.string().nullable().optional(),
      toneStyle: z.string().optional(),
    });
    const parsed = schema.parse(req.body);

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== undefined) data[k] = v;
    }

    const updated = await db.agent.update({ where: { id }, data });
    return reply.send(updated);
  });

  // ── Delete agent ──
  app.delete('/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    // Soft-delete: deactivate + detach campaigns
    await db.agent.update({ where: { id }, data: { active: false } });
    await db.outboundCampaign.updateMany({ where: { agentId: id }, data: { active: false } });
    return reply.send({ ok: true });
  });

  // ── Status for live view ──
  app.get('/agents/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const status = await getAgentStatus(id);
    if (!status) return reply.status(404).send({ error: 'Agent not found' });
    return reply.send(status);
  });

  // ── Run history ──
  app.get('/agents/:id/runs', async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = req.query as { limit?: string };
    const limit = Math.min(50, parseInt(query.limit ?? '20'));
    const runs = await db.agentRun.findMany({
      where: { agentId: id },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    return reply.send({ runs });
  });

  app.get('/agents/:id/runs/:runId', async (req, reply) => {
    const { runId } = req.params as { id: string; runId: string };
    const run = await db.agentRun.findUnique({ where: { id: runId } });
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    return reply.send(run);
  });

  // ── Trigger a run (manual) ──
  app.post('/agents/:id/trigger', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { dryRun?: boolean };

    const opts: { agentId: string; trigger: 'manual'; dryRun?: boolean } = { agentId: id, trigger: 'manual' };
    if (body.dryRun !== undefined) opts.dryRun = body.dryRun;

    void runAgent(opts).catch((err: unknown) => log.error({ err }, 'Agent run failed'));

    await new Promise((r) => setTimeout(r, 300));
    const latestRun = await db.agentRun.findFirst({ where: { agentId: id }, orderBy: { startedAt: 'desc' } });
    return reply.send({ ok: true, runId: latestRun?.id });
  });

  // ── Pause / resume ──
  app.post('/agents/:id/pause', async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.agent.update({ where: { id }, data: { active: false } });
    return reply.send({ ok: true, active: false });
  });

  app.post('/agents/:id/resume', async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.agent.update({ where: { id }, data: { active: true } });
    return reply.send({ ok: true, active: true });
  });

  // ── Provision/re-provision sheet ──
  app.post('/agents/:id/provision-sheet', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { ownerEmail?: string };
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });

    const sheet = await provisionAgentSheet(agent.name, body.ownerEmail);
    if (!sheet) {
      return reply.status(500).send({ error: 'Failed to provision sheet. Check GOOGLE_SERVICE_ACCOUNT_KEY env var.' });
    }

    const updated = await db.agent.update({
      where: { id },
      data: { googleSheetId: sheet.sheetId, sheetUrl: sheet.url, sheetProvisioned: true },
    });
    return reply.send(updated);
  });

  // ── Cron daily trigger — runs all active agents ──
  app.post('/agents/cron/daily', async (_req, reply) => {
    const agents = await db.agent.findMany({ where: { active: true } });
    for (const agent of agents) {
      void runAgent({ agentId: agent.id, trigger: 'cron' }).catch((err: unknown) =>
        log.error({ err, agentId: agent.id }, 'Cron agent run failed'),
      );
    }
    return reply.send({ ok: true, triggered: agents.length });
  });
}
