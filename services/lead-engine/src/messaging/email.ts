import sgMail from '@sendgrid/mail';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('lead-engine:email');
sgMail.setApiKey(env.SENDGRID_API_KEY);

export async function sendEmail(params: {
  to: string;
  subject: string;
  html?: string;
  templateId?: string;
  dynamicData?: Record<string, unknown>;
  from?: string;
  fromName?: string;
}): Promise<void> {
  const {
    to,
    subject,
    html,
    templateId,
    dynamicData,
    from = env.SENDGRID_FROM_EMAIL,
    fromName = 'Embedo',
  } = params;

  const msg: Parameters<typeof sgMail.send>[0] = {
    to,
    from: { email: from, name: fromName },
    subject,
    ...(templateId
      ? { templateId, dynamicTemplateData: dynamicData }
      : { html: html ?? '' }),
  };

  try {
    await sgMail.send(msg);
    log.info({ to }, 'Email sent');
  } catch (err) {
    throw new ExternalApiError('SendGrid', `Failed to send email to ${to}`, err);
  }
}
