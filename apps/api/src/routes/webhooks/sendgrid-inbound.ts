import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { leadCreatedQueue } from '@embedo/queue';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

const log = createLogger('api:webhook:sendgrid-inbound');

// Strip Re:/Fwd: prefixes and quoted reply text to get the top-level reply
function extractReplyText(text: string): string {
  const lines = text.split('\n');
  const quoteMarkers = [/^>/, /^On .+wrote:/, /^-----Original Message-----/];
  const topLines: string[] = [];

  for (const line of lines) {
    if (quoteMarkers.some((re) => re.test(line.trim()))) break;
    topLines.push(line);
  }

  return topLines.join('\n').trim();
}

function classifyReply(text: string): string {
  const lower = text.toLowerCase();
  if (/(unsubscribe|opt\s*out|remove me|do not contact|stop emailing|stop emails)/.test(lower)) return 'UNSUBSCRIBE';
  if (/(out of office|auto-?reply|vacation|away from (the )?office)/.test(lower)) return 'OOO';
  if (/(interested|let's|lets|call|meeting|schedule|demo|sounds good|yes)/.test(lower)) return 'POSITIVE';
  if (/(not interested|no thanks|stop|do not|don't contact)/.test(lower)) return 'NEGATIVE';
  return 'NEUTRAL';
}

export async function sendgridInboundRoutes(app: FastifyInstance): Promise<void> {
  // SendGrid Inbound Parse sends multipart/form-data
  app.post('/webhooks/sendgrid/inbound', async (request, reply) => {
    const body = request.body as Record<string, string>;

    const from: string = body['from'] ?? '';
    const subject: string = body['subject'] ?? '';
    const text: string = body['text'] ?? body['html'] ?? '';

    log.info({ from, subject }, 'SendGrid inbound email received');

    // Extract sender email
    const fromEmail = from.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0]?.toLowerCase();
    if (!fromEmail) {
      return reply.code(200).send({ received: true });
    }

    // Find the prospect by email
    const prospect = await db.prospectBusiness.findFirst({
      where: { email: fromEmail },
      include: {
        messages: {
          where: { channel: 'EMAIL' },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!prospect) {
      log.info({ fromEmail }, 'No prospect found for inbound email — ignoring');
      return reply.code(200).send({ received: true });
    }

    const latestMessage = prospect.messages[0];
    const replyText = extractReplyText(text);
    const replyCategory = classifyReply(replyText);

    // Update outreach message
    if (latestMessage) {
      await db.outreachMessage.update({
        where: { id: latestMessage.id },
        data: {
          repliedAt: new Date(),
          replyBody: replyText.slice(0, 2000),
          status: 'REPLIED',
          replyCategory,
        },
      });
      // Track reply on email template
      if (latestMessage.emailTemplateId) {
        await db.emailTemplate.update({
          where: { id: latestMessage.emailTemplateId },
          data: { timesReplied: { increment: 1 } },
        }).catch(() => {});
      }
    }

    // Update prospect status
    await db.prospectBusiness.update({
      where: { id: prospect.id },
      data: { status: replyCategory === 'UNSUBSCRIBE' ? 'UNSUBSCRIBED' : 'REPLIED' },
    });

    if (replyCategory === 'UNSUBSCRIBE' && fromEmail) {
      await db.outreachSuppression.upsert({
        where: { email: fromEmail },
        update: { reason: 'unsubscribe', source: 'sendgrid_inbound' },
        create: { email: fromEmail, reason: 'unsubscribe', source: 'sendgrid_inbound' },
      });
    }

    log.info({ prospectId: prospect.id, fromEmail, replyCategory }, 'Reply recorded');

    // Auto-create Lead when a prospect replies (non-unsubscribe, non-OOO)
    if (replyCategory !== 'UNSUBSCRIBE' && replyCategory !== 'OOO') {
      try {
        await leadCreatedQueue().add(
          `prospect-reply:${prospect.id}`,
          {
            businessId: prospect.id, // prospect ID as reference — no business yet
            source: 'OUTBOUND',
            sourceId: prospect.id,
            rawData: {
              prospectId: prospect.id,
              name: prospect.name,
              email: fromEmail,
              phone: prospect.phone,
              website: prospect.website,
              replyCategory,
              replyText: replyText.slice(0, 500),
              campaignId: prospect.campaignId,
            },
          },
        );
        log.info({ prospectId: prospect.id }, 'Lead created event queued from prospect reply');
      } catch (err) {
        log.error({ err, prospectId: prospect.id }, 'Failed to queue lead.created — non-fatal');
      }
    }

    const preview = replyText.slice(0, 160);

    // Notify Jason via SMS
    const ownerPhone = process.env['OWNER_PHONE'];
    const twilioSid = process.env['TWILIO_ACCOUNT_SID'];
    const twilioToken = process.env['TWILIO_AUTH_TOKEN'];
    const twilioFrom = process.env['TWILIO_FROM_NUMBER'];

    if (ownerPhone && twilioSid && twilioToken && twilioFrom) {
      try {
        const client = twilio(twilioSid, twilioToken);
        await client.messages.create({
          to: ownerPhone,
          from: twilioFrom,
          body: `Reply from ${prospect.name}: "${preview}..." — Check dashboard`,
        });
        log.info({ ownerPhone }, 'Owner SMS sent for inbound reply');
      } catch (err) {
        log.error({ err }, 'Failed to send owner reply SMS — non-fatal');
      }
    }

    // Notify Jason via email
    const ownerEmail = process.env['OWNER_EMAIL'];
    const sgKey = process.env['SENDGRID_API_KEY'];
    const fromEmailAddr = process.env['SENDGRID_FROM_EMAIL'];

    if (ownerEmail && sgKey && fromEmailAddr) {
      sgMail.setApiKey(sgKey);
      try {
        await sgMail.send({
          to: ownerEmail,
          from: { email: fromEmailAddr, name: 'Embedo' },
          subject: `Reply from ${prospect.name} — action needed`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="color: #4f46e5;">New reply from a prospect</h2>
              <p><strong>Business:</strong> ${prospect.name}</p>
              <p><strong>Email:</strong> <a href="mailto:${fromEmail}">${fromEmail}</a></p>
              <p><strong>Subject:</strong> ${subject}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <p style="white-space: pre-wrap; color: #374151;">${replyText}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <p style="color: #6b7280; font-size: 14px;">
                Reply directly to <a href="mailto:${fromEmail}">${fromEmail}</a> to continue the conversation.
              </p>
            </div>
          `,
        });
        log.info({ ownerEmail }, 'Owner email sent for inbound reply');
      } catch (err) {
        log.error({ err }, 'Failed to send owner reply email — non-fatal');
      }
    }

    return reply.code(200).send({ received: true });
  });
}
