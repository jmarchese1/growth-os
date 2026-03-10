import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:webhook:sendgrid-events');

type SendGridEvent = Record<string, unknown>;

function getNested(obj: Record<string, unknown>, key: string): string | undefined {
  return typeof obj[key] === 'string' ? (obj[key] as string) : undefined;
}

function getTrackingPixelId(event: SendGridEvent): string | undefined {
  const customArgs = (event['custom_args'] as Record<string, unknown> | undefined) ?? (event['unique_args'] as Record<string, unknown> | undefined);
  const tracking = customArgs?.['trackingPixelId'];
  return typeof tracking === 'string' ? tracking : undefined;
}

async function resolveMessage(event: SendGridEvent) {
  const trackingPixelId = getTrackingPixelId(event);
  const sgMessageId = getNested(event, 'sg_message_id') ?? getNested(event, 'message_id') ?? getNested(event, 'smtp-id');
  const customArgs = (event['custom_args'] as Record<string, unknown> | undefined) ?? (event['unique_args'] as Record<string, unknown> | undefined);
  const prospectId = typeof customArgs?.['prospectId'] === 'string' ? (customArgs['prospectId'] as string) : undefined;

  if (trackingPixelId) {
    return db.outreachMessage.findUnique({
      where: { trackingPixelId },
      select: { id: true, prospectId: true, status: true, openedAt: true },
    });
  }

  if (sgMessageId) {
    return db.outreachMessage.findFirst({
      where: { externalId: sgMessageId },
      select: { id: true, prospectId: true, status: true, openedAt: true },
    });
  }

  if (prospectId) {
    return db.outreachMessage.findFirst({
      where: { prospectId },
      orderBy: { sentAt: 'desc' },
      select: { id: true, prospectId: true, status: true, openedAt: true },
    });
  }

  return null;
}

export async function sendgridEventRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/sendgrid/events', async (request, reply) => {
    const body = request.body as unknown;
    let events: SendGridEvent[] = [];

    try {
      if (Array.isArray(body)) {
        events = body as SendGridEvent[];
      } else if (typeof body === 'string') {
        events = JSON.parse(body) as SendGridEvent[];
      } else if (body && typeof body === 'object') {
        events = [body as SendGridEvent];
      }
    } catch (err) {
      log.warn({ err }, 'Failed to parse SendGrid event payload');
      return reply.code(400).send({ error: 'Invalid payload' });
    }

    for (const event of events) {
      const eventType = String(event['event'] ?? '').toLowerCase();
      if (!eventType) continue;

      const email = typeof event['email'] === 'string' ? (event['email'] as string).toLowerCase() : undefined;
      const message = await resolveMessage(event);

      if (eventType === 'delivered' && message) {
        if (message.status !== 'REPLIED' && message.status !== 'BOUNCED') {
          await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'DELIVERED' } });
        }
      }

      if (eventType === 'open' && message && !message.openedAt) {
        await db.outreachMessage.update({
          where: { id: message.id },
          data: { openedAt: new Date(), status: 'OPENED' },
        });
        await db.prospectBusiness.update({
          where: { id: message.prospectId },
          data: { status: 'OPENED' },
        });
      }

      if ((eventType === 'bounce' || eventType === 'dropped') && message) {
        await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'BOUNCED' } });
        await db.prospectBusiness.update({ where: { id: message.prospectId }, data: { status: 'BOUNCED' } });
        if (email) {
          await db.outreachSuppression.upsert({
            where: { email },
            update: { reason: 'bounce', source: 'sendgrid_events' },
            create: { email, reason: 'bounce', source: 'sendgrid_events' },
          });
        }
      }

      if (eventType === 'spamreport' || eventType === 'unsubscribe') {
        if (message) {
          await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'FAILED' } });
          await db.prospectBusiness.update({ where: { id: message.prospectId }, data: { status: 'UNSUBSCRIBED' } });
        }
        if (email) {
          await db.outreachSuppression.upsert({
            where: { email },
            update: { reason: eventType, source: 'sendgrid_events' },
            create: { email, reason: eventType, source: 'sendgrid_events' },
          });
        }
      }
    }

    return reply.code(200).send({ received: true });
  });
}
