import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { validate } from '@embedo/utils';
import type { OnboardingRequest } from '@embedo/types';
import { onboardBusiness } from './onboarding.js';
import {
  getBusinessById,
  listBusinesses,
  updateBusiness,
} from './businesses/service.js';
import { listContacts, getContactById, getContactTimeline } from './contacts/service.js';
import { handleCalendlyWebhook } from './integrations/calendly.js';

const onboardingSchema = z.object({
  name: z.string().min(2),
  type: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  timezone: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('US'),
    })
    .optional(),
  settings: z.record(z.unknown()).optional(),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health
  app.get('/health', async () => ({ ok: true, service: 'crm-core' }));

  // ─── Onboarding ──────────────────────────────────────────────────────────
  app.post('/onboarding', async (request, reply) => {
    const data = validate(onboardingSchema, request.body);
    const result = await onboardBusiness(data);
    return reply.code(201).send(result);
  });

  // ─── Businesses ───────────────────────────────────────────────────────────
  app.get('/businesses', async (request) => {
    const query = request.query as Record<string, string>;
    return listBusinesses({
      page: parseInt(query['page'] ?? '1'),
      pageSize: parseInt(query['pageSize'] ?? '20'),
    });
  });

  app.get('/businesses/:id', async (request) => {
    const { id } = request.params as { id: string };
    return getBusinessById(id);
  });

  app.patch('/businesses/:id', async (request) => {
    const { id } = request.params as { id: string };
    return updateBusiness(id, request.body as Record<string, unknown>);
  });

  // ─── Contacts ─────────────────────────────────────────────────────────────
  app.get('/businesses/:id/contacts', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    return listContacts({
      businessId: id,
      page: parseInt(query['page'] ?? '1'),
      pageSize: parseInt(query['pageSize'] ?? '20'),
      search: query['search'],
    });
  });

  app.get('/contacts/:id', async (request) => {
    const { id } = request.params as { id: string };
    return getContactById(id);
  });

  app.get('/contacts/:id/timeline', async (request) => {
    const { id } = request.params as { id: string };
    return getContactTimeline(id);
  });

  // ─── Webhooks ─────────────────────────────────────────────────────────────
  app.post('/webhooks/calendly', async (request, reply) => {
    const { businessId } = request.query as { businessId: string };
    if (!businessId) return reply.code(400).send({ error: 'businessId query param required' });

    await handleCalendlyWebhook(businessId, request.body as Parameters<typeof handleCalendlyWebhook>[1]);
    return reply.code(200).send({ received: true });
  });
}
