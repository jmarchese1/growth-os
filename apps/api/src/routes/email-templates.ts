import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:email-templates');

export async function emailTemplateRoutes(app: FastifyInstance): Promise<void> {
  // List all templates with computed performance
  app.get('/email-templates', async () => {
    const templates = await db.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => ({
      ...t,
      openRate: t.timesSent > 0 ? Math.round((t.timesOpened / t.timesSent) * 1000) / 10 : 0,
      replyRate: t.timesSent > 0 ? Math.round((t.timesReplied / t.timesSent) * 1000) / 10 : 0,
    }));
  });

  // Get single template
  app.get('/email-templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await db.emailTemplate.findUnique({ where: { id } });
    if (!template) return reply.code(404).send({ error: 'Template not found' });
    return {
      ...template,
      openRate: template.timesSent > 0 ? Math.round((template.timesOpened / template.timesSent) * 1000) / 10 : 0,
      replyRate: template.timesSent > 0 ? Math.round((template.timesReplied / template.timesSent) * 1000) / 10 : 0,
    };
  });

  // Create template
  app.post('/email-templates', async (request, reply) => {
    const body = request.body as { name: string; subject: string; body: string; category?: string };
    if (!body.name || !body.subject || !body.body) {
      return reply.code(400).send({ error: 'name, subject, and body are required' });
    }
    const template = await db.emailTemplate.create({
      data: {
        name: body.name,
        subject: body.subject,
        body: body.body,
        category: body.category ?? 'cold',
      },
    });
    log.info({ templateId: template.id, name: template.name }, 'Email template created');
    return reply.code(201).send(template);
  });

  // Update template
  app.patch('/email-templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const allowed = ['name', 'subject', 'body', 'category', 'active'];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    const template = await db.emailTemplate.update({ where: { id }, data });
    return reply.send(template);
  });

  // Duplicate template
  app.post('/email-templates/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const original = await db.emailTemplate.findUnique({ where: { id } });
    if (!original) return reply.code(404).send({ error: 'Template not found' });
    const copy = await db.emailTemplate.create({
      data: {
        name: `${original.name} (copy)`,
        subject: original.subject,
        body: original.body,
        category: original.category,
      },
    });
    return reply.code(201).send(copy);
  });

  // Delete template
  app.delete('/email-templates/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.emailTemplate.update({ where: { id }, data: { active: false } });
    return reply.send({ message: 'Template deactivated' });
  });
}
