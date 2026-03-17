import type { FastifyInstance } from 'fastify';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { db } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';
import type { CampaignType, CampaignStatus } from '@embedo/db';

const log = createLogger('api:campaigns');

export async function campaignRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /campaigns?businessId=xxx
   * List all campaigns for a business.
   */
  app.get('/campaigns', async (request, reply) => {
    const { businessId } = request.query as { businessId?: string };
    if (!businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });

    const campaigns = await db.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, campaigns };
  });

  /**
   * POST /campaigns
   * Create a new campaign draft.
   */
  app.post('/campaigns', async (request, reply) => {
    const body = request.body as {
      businessId?: string;
      name?: string;
      type?: string;
      subject?: string;
      body?: string;
    };

    if (!body.businessId) return reply.code(400).send({ success: false, error: 'businessId is required' });
    if (!body.name?.trim()) return reply.code(400).send({ success: false, error: 'name is required' });
    if (!body.body?.trim()) return reply.code(400).send({ success: false, error: 'body is required' });

    const validTypes = ['EMAIL', 'SMS'];
    const campaignType = (body.type && validTypes.includes(body.type.toUpperCase()))
      ? body.type.toUpperCase() as CampaignType
      : 'EMAIL' as CampaignType;

    const campaign = await db.campaign.create({
      data: {
        businessId: body.businessId,
        name: body.name.trim(),
        type: campaignType,
        subject: body.subject?.trim() ?? null,
        body: body.body.trim(),
        status: 'DRAFT' as CampaignStatus,
      },
    });

    log.info({ businessId: body.businessId, campaignId: campaign.id }, 'Campaign created');
    return { success: true, campaign };
  });

  /**
   * POST /campaigns/:id/send
   * Send a campaign to all eligible contacts (EMAIL → SendGrid, SMS → Twilio).
   */
  app.post<{ Params: { id: string } }>('/campaigns/:id/send', async (request, reply) => {
    const { id } = request.params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: { business: { select: { name: true } } },
    });
    if (!campaign) throw new NotFoundError('Campaign', id);
    if (campaign.status === 'SENT') {
      return reply.code(400).send({ success: false, error: 'Campaign has already been sent' });
    }

    if (campaign.type === 'EMAIL') {
      const sgKey = process.env['SENDGRID_API_KEY'];
      const fromEmail = process.env['SENDGRID_FROM_EMAIL'] ?? 'jason@embedo.io';
      if (!sgKey) return reply.code(500).send({ success: false, error: 'Email sending not configured' });

      const contacts = await db.contact.findMany({
        where: { businessId: campaign.businessId, email: { not: null } },
        select: { email: true, firstName: true },
      });
      if (contacts.length === 0) {
        return reply.code(400).send({ success: false, error: 'No contacts with email addresses found' });
      }

      sgMail.setApiKey(sgKey);
      const messages = contacts.map((c) => ({
        to: c.email!,
        from: { email: fromEmail, name: campaign.business.name },
        subject: campaign.subject ?? campaign.name,
        html: campaign.body,
      }));

      // SendGrid batch: max 1000 per call
      for (let i = 0; i < messages.length; i += 1000) {
        await sgMail.send(messages.slice(i, i + 1000) as Parameters<typeof sgMail.send>[0]);
      }

      await db.campaign.update({
        where: { id },
        data: { status: 'SENT' as CampaignStatus, sentAt: new Date(), sentCount: contacts.length },
      });
      log.info({ campaignId: id, sentCount: contacts.length }, 'Email campaign sent');
      return { success: true, sentCount: contacts.length };
    }

    if (campaign.type === 'SMS') {
      const sid = process.env['TWILIO_ACCOUNT_SID'];
      const token = process.env['TWILIO_AUTH_TOKEN'];
      const from = process.env['TWILIO_FROM_NUMBER'];
      if (!sid || !token || !from) {
        return reply.code(500).send({ success: false, error: 'SMS sending not configured' });
      }

      const contacts = await db.contact.findMany({
        where: { businessId: campaign.businessId, phone: { not: null } },
        select: { phone: true },
      });
      if (contacts.length === 0) {
        return reply.code(400).send({ success: false, error: 'No contacts with phone numbers found' });
      }

      const client = twilio(sid, token);
      let sentCount = 0;
      for (const contact of contacts) {
        try {
          await client.messages.create({ to: contact.phone!, from, body: campaign.body });
          sentCount++;
        } catch (err) {
          log.warn({ phone: contact.phone, err }, 'SMS send failed for contact, continuing');
        }
      }

      await db.campaign.update({
        where: { id },
        data: { status: 'SENT' as CampaignStatus, sentAt: new Date(), sentCount },
      });
      log.info({ campaignId: id, sentCount }, 'SMS campaign sent');
      return { success: true, sentCount };
    }

    return reply.code(400).send({ success: false, error: 'Unknown campaign type' });
  });

  /**
   * DELETE /campaigns/:id
   */
  app.delete<{ Params: { id: string } }>('/campaigns/:id', async (request) => {
    const { id } = request.params;
    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundError('Campaign', id);
    await db.campaign.delete({ where: { id } });
    log.info({ campaignId: id }, 'Campaign deleted');
    return { success: true };
  });
}
