import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@embedo/utils';
import { leadCreatedQueue } from '@embedo/queue';

const log = createLogger('api:leads');

const captureSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  source: z.string().optional(),
  interest: z.string().optional(),
});

export async function leadCaptureRoutes(app: FastifyInstance): Promise<void> {
  // ─── Lightweight lead capture ────────────────────────────────────────────
  // For website visitors who aren't ready for a full proposal or Cal booking.
  // Creates a lead.created event so lead-engine normalizes + deduplicates.
  app.post('/leads/capture', async (request, reply) => {
    const parsed = captureSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const businessId = process.env['EMBEDO_BUSINESS_ID'];

    if (!businessId) {
      log.warn('EMBEDO_BUSINESS_ID not set — cannot capture lead');
      return reply.code(500).send({ success: false, error: 'Service not configured' });
    }

    const sourceLabel = data.source ?? 'WEBSITE';
    const jobId = `web-capture:${data.email}:${Date.now()}`;

    await leadCreatedQueue().add(jobId, {
      businessId,
      source: sourceLabel,
      sourceId: jobId,
      rawData: {
        name: data.name,
        email: data.email,
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.businessName ? { businessName: data.businessName } : {}),
        interest: data.interest ?? 'website-capture',
        channel: 'website',
      },
    });

    log.info({ email: data.email, source: sourceLabel }, 'Website lead captured');

    return reply.code(201).send({ success: true, message: 'Lead captured' });
  });
}
