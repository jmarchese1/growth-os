import { db } from '@embedo/db';
import type { Business, BusinessType, OnboardingStatus } from '@embedo/db';
import { NotFoundError, ConflictError } from '@embedo/utils';
import type { OnboardingRequest } from '@embedo/types';

export async function createBusiness(data: OnboardingRequest): Promise<Business> {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const existing = await db.business.findUnique({ where: { slug } });
  if (existing) {
    throw new ConflictError(`A business with slug '${slug}' already exists`);
  }

  return db.business.create({
    data: {
      name: data.name,
      slug,
      type: (data.type as BusinessType) ?? 'RESTAURANT',
      ...(data.phone != null ? { phone: data.phone } : {}),
      ...(data.email != null ? { email: data.email } : {}),
      ...(data.website != null ? { website: data.website } : {}),
      ...(data.address != null ? { address: data.address } : {}),
      timezone: data.timezone ?? 'America/New_York',
      ...(data.settings != null ? { settings: data.settings } : {}),
      status: 'PENDING',
    },
  });
}

export async function getBusinessById(id: string): Promise<Business> {
  const business = await db.business.findUnique({ where: { id } });
  if (!business) throw new NotFoundError('Business', id);
  return business;
}

export async function getBusinessBySlug(slug: string): Promise<Business> {
  const business = await db.business.findUnique({ where: { slug } });
  if (!business) throw new NotFoundError('Business');
  return business;
}

export async function listBusinesses(params: {
  page?: number;
  pageSize?: number;
  status?: OnboardingStatus;
}): Promise<{ items: Business[]; total: number }> {
  const { page = 1, pageSize = 20, status } = params;
  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    db.business.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    db.business.count({ where }),
  ]);

  return { items, total };
}

export async function updateBusiness(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    website: string;
    address: unknown;
    timezone: string;
    settings: unknown;
    elevenLabsAgentId: string;
    twilioPhoneNumber: string;
    calendlyUri: string;
    instagramPageId: string;
    facebookPageId: string;
    status: OnboardingStatus;
  }>,
): Promise<Business> {
  await getBusinessById(id);
  // Build update payload, filtering out undefined values for exactOptionalPropertyTypes
  const { address, settings, ...rest } = data;
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) updateData[key] = value;
  }
  if (address !== undefined) updateData['address'] = address;
  if (settings !== undefined) updateData['settings'] = settings;
  return db.business.update({ where: { id }, data: updateData });
}

export async function logOnboardingStep(
  businessId: string,
  step: string,
  status: 'success' | 'error' | 'pending',
  message?: string,
  data?: unknown,
): Promise<void> {
  await db.onboardingLog.create({
    data: {
      businessId,
      step,
      status,
      message: message ?? null,
      ...(data != null ? { data } : {}),
    },
  });
}
