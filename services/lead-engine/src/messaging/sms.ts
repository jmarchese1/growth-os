import twilio from 'twilio';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('lead-engine:sms');
let twilioClient: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!twilioClient) {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

export async function sendSms(params: {
  to: string;
  body: string;
  from?: string;
}): Promise<string> {
  const { to, body, from = env.TWILIO_FROM_NUMBER } = params;

  try {
    const message = await getClient().messages.create({ to, from, body });
    log.info({ to, messageSid: message.sid }, 'SMS sent');
    return message.sid;
  } catch (err) {
    throw new ExternalApiError('Twilio', `Failed to send SMS to ${to}`, err);
  }
}
