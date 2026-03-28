import { randomUUID } from 'crypto';
import sgMail from '@sendgrid/mail';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { db } from '@embedo/db';
import type { OutboundCampaign, ProspectBusiness } from '@embedo/db';
import { renderEmailHtml, buildTemplateVars } from './templates.js';
import { generatePersonalizedEmail } from './ai-personalizer.js';
import { isSuppressed } from './suppression.js';
import { env } from '../config.js';

const log = createLogger('prospector:email-sender');

export async function sendColdEmail(
  prospect: ProspectBusiness,
  campaign: OutboundCampaign,
  options?: {
    subjectOverride?: string;
    bodyHtmlOverride?: string;
    stepNumber?: number;
    disableAi?: boolean;
  },
): Promise<string> {
  if (!prospect.email) throw new Error(`Prospect ${prospect.id} has no email`);
  if (!env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');

  if (await isSuppressed(prospect.email)) {
    throw new Error(`Email suppressed for ${prospect.email}`);
  }

  sgMail.setApiKey(env.SENDGRID_API_KEY);

  const trackingPixelId = randomUUID();
  const replyEmail = env.REPLY_TRACKING_EMAIL ?? env.SENDGRID_FROM_EMAIL ?? 'jason@embedo.co';
  const calLink = process.env['CAL_LINK'] ?? 'https://cal.com/jason-marchese-mkfkwl/30min';

  // Build variable map from prospect data (firstName, lastName, company, city, etc.)
  const vars = buildTemplateVars(prospect, { city: campaign.targetCity, calLink, replyEmail });

  const subjectTemplate = options?.subjectOverride ?? campaign.emailSubject;
  const bodyTemplate = options?.bodyHtmlOverride ?? campaign.emailBodyHtml;

  // Use Claude to personalize per prospect if ANTHROPIC_API_KEY is configured
  let bodyHtml: string;
  if (env.ANTHROPIC_API_KEY && !options?.disableAi && !options?.bodyHtmlOverride) {
    const aiHtml = await generatePersonalizedEmail(
      {
        name: prospect.name,
        city: vars['city'] ?? campaign.targetCity,
        website: prospect.website,
        phone: prospect.phone,
        googleRating: prospect.googleRating,
        googleReviewCount: prospect.googleReviewCount,
      },
      replyEmail,
      env.ANTHROPIC_API_KEY,
    );
    // Fall back to static template if AI fails
    const appendSig = (campaign.apolloConfig as Record<string, unknown> | null)?.['appendSignature'] === true;
    bodyHtml = aiHtml ?? renderEmailHtml(bodyTemplate, vars, { appendSignature: appendSig, replyEmail });
  } else {
    const appendSig = (campaign.apolloConfig as Record<string, unknown> | null)?.['appendSignature'] === true;
    bodyHtml = renderEmailHtml(bodyTemplate, vars, { appendSignature: appendSig, replyEmail });
  }

  const subject = renderEmailHtml(subjectTemplate, vars);

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
      customArgs: {
        trackingPixelId,
        prospectId: prospect.id,
        campaignId: campaign.id,
        stepNumber: options?.stepNumber ?? 1,
      },
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
      stepNumber: options?.stepNumber ?? 1,
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
