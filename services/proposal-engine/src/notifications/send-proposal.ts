import sgMail from '@sendgrid/mail';
import { createLogger } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('proposal-engine:send-proposal');

export async function sendProposalToContact(params: {
  contactEmail: string;
  contactName?: string;
  businessName: string;
  shareUrl: string;
}): Promise<void> {
  const apiKey = env.SENDGRID_API_KEY;
  const fromEmail = env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    log.warn('SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set — skipping proposal send');
    throw new Error('Email service not configured');
  }

  sgMail.setApiKey(apiKey);

  const { contactEmail, contactName, businessName, shareUrl } = params;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Your AI Proposal</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">${businessName}</p>
      </div>

      <div style="background: #f9fafb; padding: 40px 20px;">
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
          ${contactName ? `Hi ${contactName},` : 'Hi there,'}
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
          We've prepared a personalized AI proposal tailored to your business needs. Click below to review it.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${shareUrl}" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            View Your Proposal →
          </a>
        </div>

        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
          Questions? Reply to this email and we'll get back to you shortly.
        </p>
      </div>

      <div style="background: white; border-top: 1px solid #e5e7eb; padding: 24px 20px; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Embedo — AI Infrastructure for Local Businesses<br/>
          <a href="https://embedo.io" style="color: #6366f1; text-decoration: none;">embedo.io</a>
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: contactEmail,
      from: { email: fromEmail, name: 'Embedo' },
      subject: `Your personalized proposal — ${businessName}`,
      html,
    });
    log.info({ contactEmail, businessName }, 'Proposal sent to contact');
  } catch (err) {
    log.error({ err }, 'Failed to send proposal to contact');
    throw err;
  }
}
