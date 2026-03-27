import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { extractDomain } from '../scraper/apollo.js';

const log = createLogger('prospector:dedup');

/**
 * Normalize a business name for fuzzy matching.
 * Strips common suffixes, punctuation, "the", and extra spaces.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, '')         // curly/smart quotes
    .replace(/\b(the|inc|llc|ltd|corp|co|restaurant|cafe|bar|grill|kitchen|bistro|diner|eatery|pizzeria|bakery|pub)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')   // strip punctuation
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
}

/**
 * Normalize a phone number to just digits (drop leading country code 1).
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // If 11 digits starting with 1, drop the leading 1 (US country code)
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

interface DuplicateCandidate {
  name: string;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  website?: string | null | undefined;
  googlePlaceId?: string | null | undefined;
}

interface DuplicateResult {
  isDuplicate: boolean;
  matchedProspectId?: string;
  matchField?: string;
}

/**
 * Check if a prospect candidate is a duplicate of any existing prospect
 * across ALL campaigns. Checks multiple signals in priority order.
 */
export async function isDuplicate(candidate: DuplicateCandidate): Promise<DuplicateResult> {
  // 1. googlePlaceId — exact match (skip synthetic apollo_ IDs)
  if (candidate.googlePlaceId && !candidate.googlePlaceId.startsWith('apollo_')) {
    const match = await db.prospectBusiness.findUnique({
      where: { googlePlaceId: candidate.googlePlaceId },
      select: { id: true },
    });
    if (match) {
      log.info({ matchField: 'googlePlaceId', matchedId: match.id, name: candidate.name }, 'Duplicate found');
      return { isDuplicate: true, matchedProspectId: match.id, matchField: 'googlePlaceId' };
    }
  }

  // 2. email — case-insensitive exact match
  if (candidate.email) {
    const match = await db.prospectBusiness.findFirst({
      where: { email: { equals: candidate.email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (match) {
      log.info({ matchField: 'email', matchedId: match.id, name: candidate.name }, 'Duplicate found');
      return { isDuplicate: true, matchedProspectId: match.id, matchField: 'email' };
    }
  }

  // 3. phone — normalized digits match
  if (candidate.phone) {
    const normalized = normalizePhone(candidate.phone);
    if (normalized.length >= 7) {
      // Fetch all prospects with a phone, compare normalized
      // Use raw query for efficiency on large datasets
      const matches = await db.prospectBusiness.findMany({
        where: { phone: { not: null } },
        select: { id: true, phone: true },
      });
      const phoneMatch = matches.find((p) => p.phone && normalizePhone(p.phone) === normalized);
      if (phoneMatch) {
        log.info({ matchField: 'phone', matchedId: phoneMatch.id, name: candidate.name }, 'Duplicate found');
        return { isDuplicate: true, matchedProspectId: phoneMatch.id, matchField: 'phone' };
      }
    }
  }

  // 4. website — domain match
  if (candidate.website) {
    const domain = extractDomain(candidate.website);
    if (domain) {
      // Check common URL patterns
      const match = await db.prospectBusiness.findFirst({
        where: {
          OR: [
            { website: { contains: domain, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (match) {
        log.info({ matchField: 'website', matchedId: match.id, name: candidate.name, domain }, 'Duplicate found');
        return { isDuplicate: true, matchedProspectId: match.id, matchField: 'website' };
      }
    }
  }

  // 5. name — normalized fuzzy match
  const normalizedName = normalizeName(candidate.name);
  if (normalizedName.length >= 3) {
    const match = await db.prospectBusiness.findFirst({
      where: { name: { mode: 'insensitive', equals: candidate.name } },
      select: { id: true, name: true },
    });
    if (match) {
      log.info({ matchField: 'name-exact', matchedId: match.id, name: candidate.name }, 'Duplicate found');
      return { isDuplicate: true, matchedProspectId: match.id, matchField: 'name' };
    }

    // Also check normalized version for fuzzy matches (e.g., "The Bob's Burgers" vs "Bobs Burgers")
    // Fetch candidates that start with the same first word for efficiency
    const firstWord = normalizedName.split(' ')[0];
    if (firstWord && firstWord.length >= 3) {
      const candidates = await db.prospectBusiness.findMany({
        where: { name: { contains: firstWord, mode: 'insensitive' } },
        select: { id: true, name: true },
        take: 50,
      });
      const nameMatch = candidates.find((p) => normalizeName(p.name) === normalizedName);
      if (nameMatch) {
        log.info({ matchField: 'name-normalized', matchedId: nameMatch.id, name: candidate.name, normalized: normalizedName }, 'Duplicate found');
        return { isDuplicate: true, matchedProspectId: nameMatch.id, matchField: 'name' };
      }
    }
  }

  return { isDuplicate: false };
}
