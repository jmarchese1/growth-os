import sgMail from '@sendgrid/mail';
import { createLogger } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('proposal-engine:follow-up');

export async function sendFollowUpEmail(params: {
  contactEmail: string;
  contactName?: string;
  businessName: string;
  shareUrl: string;
}): Promise<void> {
  const apiKey = env.SENDGRID_API_KEY;
  const fromEmail = env.SENDGRID_FROM_EMAIL;
  const ownerEmail = (env as Record<string, unknown>)['OWNER_EMAIL'] as string | undefined;

  if (!apiKey || !fromEmail) {
    log.warn('SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set — skipping follow-up');
    return;
  }

  sgMail.setApiKey(apiKey);

  const { contactEmail, contactName, businessName, shareUrl } = params;
  const greeting = contactName ? `Hi ${contactName},` : 'Hi there,';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
      <div style="padding: 40px 24px 0 24px;">
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #374151;">
          ${greeting}
        </p>

        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #374151;">
          I noticed you just took a look at the proposal we put together for <strong>${businessName}</strong> — thanks for checking it out!
        </p>

        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #374151;">
          I'd love to walk you through it and answer any questions you might have. We've helped dozens of businesses like yours automate their customer interactions, and I think you'll be impressed by what's possible.
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.7; color: #374151;">
          Feel free to reply to this email or book a quick call — whatever's easiest for you.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${shareUrl}" style="background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            Review Your Proposal Again
          </a>
        </div>
      </div>

      <!-- Sign-off with photo -->
      <div style="padding: 32px 24px; border-top: 1px solid #f3f4f6; margin-top: 16px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align: top; padding-right: 16px;">
              <img
                src="https://embedo.io/workday_photo.jpeg"
                alt="Jason"
                width="72"
                height="72"
                style="border-radius: 12px; display: block; object-fit: cover;"
              />
            </td>
            <td style="vertical-align: top;">
              <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 600; color: #1f2937;">Jason Marchese</p>
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280;">Founder, Embedo</p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                <a href="https://embedo.io" style="color: #6366f1; text-decoration: none;">embedo.io</a>
              </p>
            </td>
          </tr>
        </table>
      </div>

      <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 24px; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
          Embedo — AI Infrastructure for Local Businesses
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: contactEmail,
      from: { email: fromEmail, name: 'Jason from Embedo' },
      ...(ownerEmail ? { replyTo: ownerEmail } : {}),
      subject: `Quick follow-up on your ${businessName} proposal`,
      html,
    });
    log.info({ contactEmail, businessName }, 'Follow-up email sent');
  } catch (err) {
    log.error({ err, contactEmail }, 'Failed to send follow-up email');
    throw err;
  }
}
