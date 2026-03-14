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
