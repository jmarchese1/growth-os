import { randomUUID } from 'crypto';
import sgMail from '@sendgrid/mail';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { db } from '@embedo/db';
import type { OutboundCampaign, ProspectBusiness } from '@embedo/db';
import { renderEmailHtml } from './templates.js';
import { generatePersonalizedEmail } from './ai-personalizer.js';
import { env } from '../config.js';

const log = createLogger('prospector:email-sender');

export async function sendColdEmail(
  prospect: ProspectBusiness,
  campaign: OutboundCampaign,
): Promise<string> {
  if (!prospect.email) throw new Error(`Prospect ${prospect.id} has no email`);
  if (!env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');

  sgMail.setApiKey(env.SENDGRID_API_KEY);

  const trackingPixelId = randomUUID();
  const city = (prospect.address as Record<string, string> | null)?.['city'] ?? campaign.targetCity;
  const replyEmail = env.REPLY_TRACKING_EMAIL ?? env.SENDGRID_FROM_EMAIL ?? 'jason@embedo.co';
  const calLink = process.env['CAL_LINK'] ?? 'https://cal.com/jason-marchese-mkfkwl/30min';

  // Use Claude to personalize per prospect if ANTHROPIC_API_KEY is configured
  let bodyHtml: string;
  if (env.ANTHROPIC_API_KEY) {
    const aiHtml = await generatePersonalizedEmail(
      {
        name: prospect.name,
        city,
        website: prospect.website,
        phone: prospect.phone,
        googleRating: prospect.googleRating,
        googleReviewCount: prospect.googleReviewCount,
      },
      replyEmail,
      env.ANTHROPIC_API_KEY,
    );
    // Fall back to static template if AI fails
    bodyHtml = aiHtml ?? renderEmailHtml(campaign.emailBodyHtml, { businessName: prospect.name, city, calLink, replyEmail });
  } else {
    bodyHtml = renderEmailHtml(campaign.emailBodyHtml, { businessName: prospect.name, city, calLink, replyEmail });
  }

  const subject = renderEmailHtml(campaign.emailSubject, {
    businessName: prospect.name,
    city,
    calLink,
    replyEmail,
  });

  // Append tracking pixel
  const pixelUrl = `${env.API_BASE_URL}/track/open/${trackingPixelId}`;
  const htmlWithPixel = `${bodyHtml}\n<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="">`;

  // FROM must be a SendGrid-verified sender. REPLY-TO can be the tracking address.
  const fromEmail = env.SENDGRID_FROM_EMAIL ?? replyEmail;
  const fromName = process.env['SENDGRID_FROM_NAME'] ?? 'Jason at Embedo';

  let messageId: string;
  try {
    const [response] = await sgMail.send({
      to: prospect.email,
      from: { email: fromEmail, name: fromName },
      replyTo: replyEmail,  // replies go to tracking address; from must be verified
      subject,
      html: htmlWithPixel,
    });
    messageId = (response.headers as Record<string, string>)['x-message-id'] ?? trackingPixelId;
  } catch (err) {
    throw new ExternalApiError('SendGrid', `Failed to send cold email to ${prospect.email}`, err);
  }

  // Create OutreachMessage record
  const message = await db.outreachMessage.create({
    data: {
      prospectId: prospect.id,
      channel: 'EMAIL',
      subject,
      body: htmlWithPixel,
      status: 'SENT',
      sentAt: new Date(),
      externalId: messageId,
      trackingPixelId,
    },
  });

  // Update prospect status
  await db.prospectBusiness.update({
    where: { id: prospect.id },
    data: { status: 'CONTACTED' },
  });

  log.info({ prospectId: prospect.id, messageId, trackingPixelId }, 'Cold email sent');
  return message.id;
}
