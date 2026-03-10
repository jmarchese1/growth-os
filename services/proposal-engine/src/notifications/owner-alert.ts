import sgMail from '@sendgrid/mail';
import { createLogger } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('proposal-engine:owner-alert');

export async function sendOwnerAlert(params: {
  contactName?: string;
  contactEmail?: string;
  businessName: string;
  industry: string;
  size: string;
  location: string;
  goals?: string;
  shareUrl: string;
}): Promise<void> {
  const ownerEmail = (env as Record<string, unknown>)['OWNER_EMAIL'] as string | undefined;
  const apiKey = env.SENDGRID_API_KEY;
  const fromEmail = env.SENDGRID_FROM_EMAIL;

  if (!ownerEmail || !apiKey || !fromEmail) {
    log.warn('OWNER_EMAIL, SENDGRID_API_KEY, or SENDGRID_FROM_EMAIL not set — skipping owner alert');
    return;
  }

  sgMail.setApiKey(apiKey);

  const { contactName, contactEmail, businessName, industry, size, location, goals, shareUrl } = params;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">New Proposal Request</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280; width: 140px;">Business</td><td style="padding: 8px;">${businessName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Industry</td><td style="padding: 8px;">${industry}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Size</td><td style="padding: 8px;">${size}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Location</td><td style="padding: 8px;">${location}</td></tr>
        ${contactName ? `<tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Contact</td><td style="padding: 8px;">${contactName}</td></tr>` : ''}
        ${contactEmail ? `<tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Email</td><td style="padding: 8px;"><a href="mailto:${contactEmail}">${contactEmail}</a></td></tr>` : ''}
        ${goals ? `<tr><td style="padding: 8px; font-weight: bold; color: #6b7280;">Goals</td><td style="padding: 8px;">${goals}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px;">
        <a href="${shareUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          View Proposal →
        </a>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: ownerEmail,
      from: { email: fromEmail, name: 'Embedo' },
      subject: `New proposal request — ${businessName}`,
      html,
    });
    log.info({ ownerEmail, businessName }, 'Owner alert sent');
  } catch (err) {
    log.error({ err }, 'Failed to send owner alert — non-fatal');
  }
}
