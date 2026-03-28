import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:sending-domains');

export async function sendingDomainRoutes(app: FastifyInstance): Promise<void> {
  // List all sending domains with computed metrics
  app.get('/sending-domains', async () => {
    const domains = await db.sendingDomain.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return domains.map((d) => ({
      ...d,
      bounceRate: d.totalSent > 0 ? Math.round((d.bounceCount / d.totalSent) * 1000) / 10 : 0,
      openRate: d.totalSent > 0 ? Math.round((d.openCount / d.totalSent) * 1000) / 10 : 0,
      healthScore: d.totalSent < 10 ? 100
        : (d.bounceCount / d.totalSent) <= 0.02 ? 100
        : (d.bounceCount / d.totalSent) <= 0.05 ? 70
        : 30,
    }));
  });

  // Add a new sending domain
  app.post('/sending-domains', async (request, reply) => {
    const body = request.body as {
      domain: string;
      fromEmail: string;
      fromName?: string;
      replyToEmail?: string;
      sendgridApiKey?: string;
    };

    if (!body.domain || !body.fromEmail) {
      return reply.code(400).send({ error: 'domain and fromEmail are required' });
    }

    const existing = await db.sendingDomain.findUnique({ where: { domain: body.domain } });
    if (existing) {
      return reply.code(409).send({ error: `Domain ${body.domain} already exists` });
    }

    const domain = await db.sendingDomain.create({
      data: {
        domain: body.domain,
        fromEmail: body.fromEmail,
        fromName: body.fromName ?? 'Jason',
        replyToEmail: body.replyToEmail ?? null,
        sendgridApiKey: body.sendgridApiKey ?? null,
      },
    });

    log.info({ domainId: domain.id, domain: domain.domain }, 'Sending domain added');
    return reply.code(201).send(domain);
  });

  // Update a sending domain
  app.patch('/sending-domains/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const allowed = ['fromEmail', 'fromName', 'replyToEmail', 'sendgridApiKey', 'active', 'verified', 'dailyLimit'];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    // If re-activating, clear disabled reason
    if (data['active'] === true) data['disabledReason'] = null;

    const domain = await db.sendingDomain.update({ where: { id }, data });
    return reply.send(domain);
  });

  // Start warm-up for a domain
  app.post('/sending-domains/:id/start-warmup', async (request, reply) => {
    const { id } = request.params as { id: string };

    const domain = await db.sendingDomain.update({
      where: { id },
      data: {
        warmupStartedAt: new Date(),
        warmupStage: 1,
        dailyLimit: 5,
        warmupComplete: false,
      },
    });

    log.info({ domainId: id, domain: domain.domain }, 'Warm-up started');
    return reply.send({ message: 'Warm-up started', domain });
  });

  // Verify a domain (manual for v1)
  app.post('/sending-domains/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };

    const domain = await db.sendingDomain.update({
      where: { id },
      data: { verified: true },
    });

    return reply.send({ message: 'Domain verified', domain });
  });

  // Soft delete a domain
  app.delete('/sending-domains/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await db.sendingDomain.update({
      where: { id },
      data: { active: false, disabledReason: 'deleted' },
    });

    return reply.send({ message: 'Domain deactivated' });
  });
}
