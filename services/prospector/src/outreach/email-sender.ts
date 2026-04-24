import { randomUUID } from 'crypto';
import sgMail from '@sendgrid/mail';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { db } from '@embedo/db';
import type { OutboundCampaign, ProspectBusiness } from '@embedo/db';
import { renderEmailHtml, buildTemplateVars } from './templates.js';
import { generatePersonalizedEmail } from './ai-personalizer.js';
import { fetchWebsiteContext } from './website-context.js';
import { isSuppressed } from './suppression.js';
import { getNextDomain, incrementDomainSend } from './domain-rotator.js';
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
  const vars = await buildTemplateVars(prospect, { city: campaign.targetCity, calLink, replyEmail, anthropicKey: env.ANTHROPIC_API_KEY });

  const subjectTemplate = options?.subjectOverride ?? campaign.emailSubject;
  const bodyTemplate = options?.bodyHtmlOverride ?? campaign.emailBodyHtml;

  // Use Claude to personalize per prospect if enabled on campaign + ANTHROPIC_API_KEY configured
  const apolloConf = (campaign.apolloConfig as Record<string, unknown> | null) ?? {};
  const appendSig = apolloConf['appendSignature'] === true;
  const aiEnabled = apolloConf['aiPersonalization'] === true; // OFF by default, must be explicitly enabled
  // Custom agent-provided pitch instructions (from Agent.systemPrompt, stored on campaign's apolloConfig)
  const customSystemPrompt =
    typeof apolloConf['systemPrompt'] === 'string' && (apolloConf['systemPrompt'] as string).trim().length >= 20
      ? (apolloConf['systemPrompt'] as string)
      : null;

  let bodyHtml: string;
  if (env.ANTHROPIC_API_KEY && aiEnabled && !options?.disableAi && !options?.bodyHtmlOverride) {
    // Scrape the prospect's homepage so Claude can reference real content
    // (~5-8s when site is slow, cached within the same process by the HTTP layer)
    const websiteContent = await fetchWebsiteContext(prospect.website).catch(() => null);

    const aiText = await generatePersonalizedEmail(
      {
        name: prospect.name,
        city: vars['city'] ?? campaign.targetCity,
        website: prospect.website,
        phone: prospect.phone,
        googleRating: prospect.googleRating,
        googleReviewCount: prospect.googleReviewCount,
        contactFirstName: prospect.contactFirstName,
        businessType: vars['type'] ?? (prospect as { businessType?: string | null }).businessType ?? null,
        websiteContent,
      },
      replyEmail,
      env.ANTHROPIC_API_KEY,
      {
        systemPrompt: customSystemPrompt,
        senderName: process.env['SENDGRID_FROM_NAME'] ?? 'Jason',
      },
    );
    // AI returns plain text with greeting included. Render to HTML + add sign-off + unsubscribe.
    // Fall back to static template if AI fails.
    if (aiText) {
      bodyHtml = renderEmailHtml(aiText, {}, { appendSignature: appendSig, replyEmail });
    } else {
      bodyHtml = renderEmailHtml(bodyTemplate, vars, { appendSignature: appendSig, replyEmail });
    }
  } else {
    bodyHtml = renderEmailHtml(bodyTemplate, vars, { appendSignature: appendSig, replyEmail });
  }

  // Subject is plain text only -- just substitute variables, no HTML wrapping
  const subject = Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    subjectTemplate,
  );

  // Append tracking pixel
  const pixelUrl = `${env.API_BASE_URL}/track/open/${trackingPixelId}`;
  const htmlWithPixel = `${bodyHtml}\n<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="">`;

  // Domain rotation: pick the next available sending domain
  const sendingDomain = await getNextDomain();

  let fromEmail: string;
  let fromName: string;
  let sendReplyTo: string;

  if (sendingDomain) {
    fromEmail = sendingDomain.fromEmail;
    fromName = sendingDomain.fromName;
    sendReplyTo = sendingDomain.replyToEmail ?? replyEmail;
    // Use per-domain SendGrid key if set, otherwise global
    if (sendingDomain.sendgridApiKey) {
      sgMail.setApiKey(sendingDomain.sendgridApiKey);
    }
    log.debug({ domain: sendingDomain.domain, fromEmail }, 'Using rotated domain');
  } else {
    // Fallback to env vars (backward compatible)
    fromEmail = env.SENDGRID_FROM_EMAIL ?? replyEmail;
    fromName = process.env['SENDGRID_FROM_NAME'] ?? 'Jason';
    sendReplyTo = replyEmail;
  }

  let messageId: string;
  try {
    const [response] = await sgMail.send({
      to: prospect.email,
      from: { email: fromEmail, name: fromName },
      replyTo: sendReplyTo,
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

  // Increment domain send counter
  if (sendingDomain) {
    await incrementDomainSend(sendingDomain.id);
  }

  // Match to an email template for performance tracking
  // Auto-create a template if this email copy hasn't been seen before
  let emailTemplateId: string | null = null;
  try {
    let template = await db.emailTemplate.findFirst({
      where: { body: campaign.emailBodyHtml, active: true },
      select: { id: true },
    });
    if (!template) {
      // Auto-create template from new campaign copy
      template = await db.emailTemplate.create({
        data: {
          name: `${campaign.name} copy`,
          subject: campaign.emailSubject,
          body: campaign.emailBodyHtml,
          category: 'cold',
          timesSent: 0,
        },
        select: { id: true },
      });
      log.info({ templateId: template.id, campaign: campaign.name }, 'Auto-created email template from campaign copy');
    }
    emailTemplateId = template.id;
    await db.emailTemplate.update({
      where: { id: template.id },
      data: { timesSent: { increment: 1 } },
    });
  } catch { /* non-critical */ }

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
      sendingDomainId: sendingDomain?.id ?? null,
      emailTemplateId,
    },
  });

  // Update prospect status
  await db.prospectBusiness.update({
    where: { id: prospect.id },
    data: { status: 'CONTACTED' },
  });

  log.info({ prospectId: prospect.id, messageId, trackingPixelId, domain: sendingDomain?.domain ?? 'env-fallback' }, 'Cold email sent');
  return message.id;
}
