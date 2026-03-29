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
      select: { id: true, prospectId: true, status: true, openedAt: true, sendingDomainId: true },
    });
  }

  if (sgMessageId) {
    // SendGrid appends filter IDs to message IDs (e.g. "abc123.filterdrecv-xxx")
    // Strip everything after the first dot to match our stored externalId
    const cleanId = sgMessageId.split('.')[0] ?? sgMessageId;
    const msg = await db.outreachMessage.findFirst({
      where: { externalId: cleanId },
      select: { id: true, prospectId: true, status: true, openedAt: true, sendingDomainId: true },
    });
    if (msg) return msg;
    // Also try the full ID in case it was stored that way
    return db.outreachMessage.findFirst({
      where: { externalId: sgMessageId },
      select: { id: true, prospectId: true, status: true, openedAt: true, sendingDomainId: true },
    });
  }

  if (prospectId) {
    return db.outreachMessage.findFirst({
      where: { prospectId },
      orderBy: { sentAt: 'desc' },
      select: { id: true, prospectId: true, status: true, openedAt: true, sendingDomainId: true },
    });
  }

  // Last resort: match by recipient email address
  const email = typeof event['email'] === 'string' ? (event['email'] as string).toLowerCase() : undefined;
  if (email) {
    return db.outreachMessage.findFirst({
      where: { prospect: { email: { equals: email, mode: 'insensitive' } } },
      orderBy: { sentAt: 'desc' },
      select: { id: true, prospectId: true, status: true, openedAt: true, sendingDomainId: true },
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

      if (!message && eventType !== 'test') {
        log.warn({ eventType, email, sgMessageId: event['sg_message_id'], customArgs: event['custom_args'] ?? event['unique_args'] }, 'SendGrid event: could not resolve message');
      }
      if (message) {
        log.info({ eventType, email, messageId: message.id }, 'SendGrid event processed');
      }

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
        // Track open on sending domain
        if (message.sendingDomainId) {
          await db.sendingDomain.update({
            where: { id: message.sendingDomainId },
            data: { openCount: { increment: 1 } },
          }).catch(() => {});
        }
      }

      if ((eventType === 'bounce' || eventType === 'dropped') && message) {
        await db.outreachMessage.update({ where: { id: message.id }, data: { status: 'BOUNCED' } });
        await db.prospectBusiness.update({ where: { id: message.prospectId }, data: { status: 'BOUNCED' } });
        // Track bounce on sending domain + auto-disable if > 5%
        if (message.sendingDomainId) {
          try {
            const domain = await db.sendingDomain.update({
              where: { id: message.sendingDomainId },
              data: { bounceCount: { increment: 1 } },
            });
            if (domain.totalSent >= 10 && domain.bounceCount / domain.totalSent > 0.05) {
              await db.sendingDomain.update({
                where: { id: message.sendingDomainId },
                data: { active: false, disabledReason: 'bounce_rate_exceeded' },
              });
              log.warn({ domainId: domain.id, domain: domain.domain }, 'Sending domain auto-disabled — bounce rate > 5%');
            }
          } catch { /* domain may have been deleted */ }
        }
        if (email) {
          await db.outreachSuppression.upsert({
            where: { email },
            update: { reason: 'bounce', source: 'sendgrid_events' },
            create: { email, reason: 'bounce', source: 'sendgrid_events' },
          });
        }

        // Auto-pause campaign if bounce rate exceeds 3%
        try {
          const prospect = await db.prospectBusiness.findUnique({
            where: { id: message.prospectId },
            select: { campaignId: true },
          });
          if (prospect?.campaignId) {
            const [totalSent, totalBounced] = await Promise.all([
              db.prospectBusiness.count({
                where: { campaignId: prospect.campaignId, status: { in: ['CONTACTED', 'OPENED', 'REPLIED', 'CONVERTED', 'BOUNCED'] } },
              }),
              db.prospectBusiness.count({
                where: { campaignId: prospect.campaignId, status: 'BOUNCED' },
              }),
            ]);
            const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
            if (bounceRate >= 3 && totalSent >= 5) {
              await db.outboundCampaign.update({
                where: { id: prospect.campaignId },
                data: { active: false },
              });
              log.warn({ campaignId: prospect.campaignId, bounceRate: Math.round(bounceRate), totalBounced, totalSent }, 'Campaign auto-paused — bounce rate exceeded 3%');
            }
          }
        } catch (err) {
          log.error({ err }, 'Bounce rate check failed');
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
