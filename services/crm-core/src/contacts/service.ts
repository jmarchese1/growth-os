import { db, Prisma } from '@embedo/db';
import type { Contact, ContactStatus, LeadSource, ActivityType } from '@embedo/db';
import { NotFoundError } from '@embedo/utils';

export async function createOrUpdateContact(params: {
  businessId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  source: LeadSource;
  tags?: string[];
}): Promise<{ contact: Contact; created: boolean }> {
  const { businessId, email, phone, firstName, lastName, source, tags = [] } = params;

  // Try to find existing contact by email or phone
  let existing: Contact | null = null;

  if (email) {
    existing = await db.contact.findUnique({
      where: { businessId_email: { businessId, email } },
    });
  }

  if (!existing && phone) {
    existing = await db.contact.findUnique({
      where: { businessId_phone: { businessId, phone } },
    });
  }

  if (existing) {
    const updated = await db.contact.update({
      where: { id: existing.id },
      data: {
        ...(firstName != null ? { firstName } : {}),
        ...(lastName != null ? { lastName } : {}),
        ...(email != null ? { email } : {}),
        ...(phone != null ? { phone } : {}),
        tags: [...new Set([...existing.tags, ...tags])],
        updatedAt: new Date(),
      },
    });
    return { contact: updated, created: false };
  }

  const contact = await db.contact.create({
    data: {
      businessId,
      ...(email != null ? { email } : {}),
      ...(phone != null ? { phone } : {}),
      ...(firstName != null ? { firstName } : {}),
      ...(lastName != null ? { lastName } : {}),
      source,
      tags,
      status: 'LEAD',
    },
  });

  return { contact, created: true };
}

export async function getContactById(id: string): Promise<Contact> {
  const contact = await db.contact.findUnique({ where: { id } });
  if (!contact) throw new NotFoundError('Contact', id);
  return contact;
}

export async function listContacts(params: {
  businessId: string;
  page?: number;
  pageSize?: number;
  status?: ContactStatus;
  search?: string;
}): Promise<{ items: Contact[]; total: number }> {
  const { businessId, page = 1, pageSize = 20, status, search } = params;

  const where = {
    businessId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.contact.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    db.contact.count({ where }),
  ]);

  return { items, total };
}

export async function updateContactStatus(id: string, status: ContactStatus): Promise<Contact> {
  await getContactById(id);
  return db.contact.update({ where: { id }, data: { status } });
}

export async function updateLeadScore(id: string, delta: number): Promise<Contact> {
  const contact = await getContactById(id);
  const newScore = Math.min(100, Math.max(0, contact.leadScore + delta));
  return db.contact.update({ where: { id }, data: { leadScore: newScore } });
}

export async function logContactActivity(params: {
  businessId: string;
  contactId: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { description, metadata, ...rest } = params;
  await db.contactActivity.create({
    data: {
      ...rest,
      ...(description != null ? { description } : {}),
      ...(metadata != null ? { metadata: metadata as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function getContactTimeline(contactId: string) {
  return db.contactActivity.findMany({
    where: { contactId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
