import { db } from '@embedo/db';
import type { Contact, LeadSource } from '@embedo/db';
import type { NormalizedLead } from '@embedo/types';
import { createLogger } from '@embedo/utils';

const log = createLogger('lead-engine:dedup');

/**
 * Find or create a Contact, handling deduplication by email and phone.
 * Returns the contact and whether it was newly created.
 */
export async function deduplicateContact(params: {
  businessId: string;
  lead: NormalizedLead;
  source: LeadSource;
}): Promise<{ contact: Contact; created: boolean }> {
  const { businessId, lead, source } = params;

  // Search priority: email first, then phone
  let existing: Contact | null = null;

  if (lead.email) {
    existing = await db.contact.findUnique({
      where: { businessId_email: { businessId, email: lead.email } },
    });
    if (existing) {
      log.debug({ contactId: existing.id, matchedBy: 'email' }, 'Existing contact found');
    }
  }

  if (!existing && lead.phone) {
    existing = await db.contact.findUnique({
      where: { businessId_phone: { businessId, phone: lead.phone } },
    });
    if (existing) {
      log.debug({ contactId: existing.id, matchedBy: 'phone' }, 'Existing contact found');
    }
  }

  if (existing) {
    // Merge: fill in missing fields, add new tags
    const updated = await db.contact.update({
      where: { id: existing.id },
      data: {
        firstName: existing.firstName ?? lead.firstName,
        lastName: existing.lastName ?? lead.lastName,
        email: existing.email ?? lead.email,
        phone: existing.phone ?? lead.phone,
        tags: [...new Set([...existing.tags, ...lead.tags])],
        leadScore: { increment: 5 }, // Bump score on re-engagement
      },
    });
    return { contact: updated, created: false };
  }

  // Create new contact
  const contact = await db.contact.create({
    data: {
      businessId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source,
      tags: lead.tags,
      status: 'LEAD',
      leadScore: 10,
    },
  });

  log.info({ contactId: contact.id, businessId }, 'New contact created');
  return { contact, created: true };
}
