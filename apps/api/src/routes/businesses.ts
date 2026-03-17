import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import type { OnboardingStatus } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:businesses');

export async function businessRoutes(app: FastifyInstance): Promise<void> {
  // GET /businesses
  app.get('/businesses', async (request) => {
    const { page = '1', pageSize = '20', status } = request.query as Record<string, string>;
    const where = status ? { status: status as OnboardingStatus } : {};

    const [items, total] = await Promise.all([
      db.business.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      db.business.count({ where }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // GET /businesses/:id
  app.get('/businesses/:id', async (request) => {
    const { id } = request.params as { id: string };
    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);
    return business;
  });

  // GET /businesses/:id/contacts
  app.get('/businesses/:id/contacts', async (request) => {
    const { id } = request.params as { id: string };
    const { page = '1', pageSize = '20' } = request.query as Record<string, string>;

    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);

    const [items, total] = await Promise.all([
      db.contact.findMany({
        where: { businessId: id },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      db.contact.count({ where: { businessId: id } }),
    ]);

    return { items, total, page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // GET /contacts/:contactId — direct contact detail lookup (also accessible as /businesses/:id/contacts/:contactId)
  app.get<{ Params: { contactId: string } }>('/contacts/:contactId', async (request) => {
    const { contactId } = request.params;

    const contact = await db.contact.findUnique({
      where: { id: contactId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        surveyResponses: {
          include: { survey: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        qrScans: {
          include: { qrCode: { select: { id: true, label: true, purpose: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        appointments: { orderBy: { startTime: 'desc' }, take: 10 },
        chatSessions: { orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, channel: true, leadCaptured: true, createdAt: true } },
        callLogs: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, direction: true, duration: true, intent: true, sentiment: true, summary: true, createdAt: true } },
      },
    });

    if (!contact) throw new NotFoundError('Contact', contactId);
    return { success: true, contact };
  });

  // PATCH /businesses/:id
  app.patch('/businesses/:id', async (request) => {
    const { id } = request.params as { id: string };
    const business = await db.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundError('Business', id);

    const data = request.body as Record<string, unknown>;
    const updated = await db.business.update({ where: { id }, data });
    log.info({ businessId: id }, 'Business updated');
    return updated;
  });
}
