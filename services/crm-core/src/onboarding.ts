import { createLogger } from '@embedo/utils';
import { businessOnboardedQueue } from '@embedo/queue';
import type { OnboardingRequest } from '@embedo/types';
import { createBusiness, logOnboardingStep, updateBusiness } from './businesses/service.js';

const log = createLogger('crm-core:onboarding');

/**
 * Orchestrates the full business onboarding flow.
 * 1. Creates Business record in DB
 * 2. Emits business.onboarded event (workers handle provisioning in parallel)
 * 3. Returns the new business ID immediately
 */
export async function onboardBusiness(data: OnboardingRequest): Promise<{
  businessId: string;
  status: string;
  message: string;
}> {
  log.info({ businessName: data.name }, 'Starting business onboarding');

  // Create the business record
  const business = await createBusiness(data);

  // Mark as provisioning
  await updateBusiness(business.id, { status: 'PROVISIONING' });
  await logOnboardingStep(business.id, 'onboarding_started', 'success', 'Onboarding initiated');

  // Emit business.onboarded event — workers pick this up and provision services
  await businessOnboardedQueue().add(
    `onboard:${business.id}`,
    {
      businessId: business.id,
      businessName: business.name,
      businessType: business.type,
      ...(business.email != null ? { email: business.email } : {}),
      ...(business.phone != null ? { phone: business.phone } : {}),
    },
    {
      jobId: `onboard:${business.id}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    },
  );

  log.info({ businessId: business.id }, 'Onboarding event queued');

  return {
    businessId: business.id,
    status: 'provisioning',
    message: 'Business onboarding started. Services are being provisioned.',
  };
}
