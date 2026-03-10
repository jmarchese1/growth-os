import twilio from 'twilio';
import { createLogger, ExternalApiError } from '@embedo/utils';
import { db } from '@embedo/db';
import { env } from '../config.js';

const log = createLogger('voice-agent:twilio:provisioning');

let twilioClient: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!twilioClient) {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Provision a local phone number for a business and configure the inbound webhook.
 * Stores the number on Business.twilioPhoneNumber.
 */
export async function provisionPhoneNumber(params: {
  businessId: string;
  areaCode?: string;
  webhookUrl: string;
}): Promise<string> {
  const { businessId, areaCode, webhookUrl } = params;
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });

  if (business.twilioPhoneNumber) {
    log.info({ businessId, number: business.twilioPhoneNumber }, 'Phone number already provisioned');
    return business.twilioPhoneNumber;
  }

  try {
    // Search for available local numbers
    const available = await getClient()
      .availablePhoneNumbers('US')
      .local.list({
        areaCode: areaCode ? parseInt(areaCode) : undefined,
        voiceEnabled: true,
        limit: 5,
      });

    if (available.length === 0) {
      throw new Error('No available local phone numbers found');
    }

    const numberToProvision = available[0]!.phoneNumber;

    // Purchase the number
    const purchased = await getClient().incomingPhoneNumbers.create({
      phoneNumber: numberToProvision,
      voiceUrl: webhookUrl,
      voiceMethod: 'POST',
      statusCallback: `${webhookUrl.replace('/voice', '/voice/status')}`,
      statusCallbackMethod: 'POST',
      friendlyName: `${business.name} — AI Receptionist`,
    });

    // Store on business
    await db.business.update({
      where: { id: businessId },
      data: { twilioPhoneNumber: purchased.phoneNumber },
    });

    await db.onboardingLog.create({
      data: {
        businessId,
        step: 'twilio_number_provisioned',
        status: 'success',
        message: `Twilio number provisioned: ${purchased.phoneNumber}`,
        data: { phoneNumber: purchased.phoneNumber, sid: purchased.sid },
      },
    });

    log.info({ businessId, phoneNumber: purchased.phoneNumber }, 'Twilio number provisioned');
    return purchased.phoneNumber;
  } catch (err) {
    await db.onboardingLog.create({
      data: { businessId, step: 'twilio_number_provisioned', status: 'error', message: String(err) },
    });
    throw new ExternalApiError('Twilio', 'Failed to provision phone number', err);
  }
}
