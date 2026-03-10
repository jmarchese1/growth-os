import type { NormalizedLead, RawLeadData } from '@embedo/types';

/**
 * Normalize raw lead data from any source into a consistent Contact shape.
 * Handles variations in field naming across voice, chatbot, social, etc.
 */
export function normalizeLead(raw: RawLeadData): NormalizedLead {
  const firstName = raw.firstName ?? extractFirstName(raw.name);
  const lastName = raw.lastName ?? extractLastName(raw.name);

  return {
    firstName: clean(firstName),
    lastName: clean(lastName),
    email: clean(raw.email),
    phone: normalizePhone(raw.phone),
    source: String(raw.source ?? 'MANUAL'),
    tags: buildTags(raw),
  };
}

function extractFirstName(name?: string): string | undefined {
  if (!name) return undefined;
  return name.split(' ')[0];
}

function extractLastName(name?: string): string | undefined {
  if (!name) return undefined;
  const parts = name.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
}

function clean(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  // Strip non-numeric except leading +
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 10) return undefined;
  // Ensure E.164 format for US numbers
  if (!digits.startsWith('+') && digits.length === 10) {
    return `+1${digits}`;
  }
  if (!digits.startsWith('+') && digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return digits;
}

function buildTags(raw: RawLeadData): string[] {
  const tags: string[] = [];
  if (raw.source) tags.push(String(raw.source).toLowerCase());
  if (raw.interest) tags.push(String(raw.interest).toLowerCase().replace(/\s+/g, '-'));
  return tags;
}
