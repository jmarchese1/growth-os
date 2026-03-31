import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '@embedo/queue';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import type { ProspectDiscoveredPayload } from '@embedo/types';
import { extractEmailFromWebsite, extractPhoneFromWebsite } from '../scraper/website-email.js';
import { findBusinessEmail } from '../scraper/brave-search.js';
import { validateEmail, detectContactForm, guessEmailPattern, extractDomain } from '../scraper/email-validator.js';
import { findEmailViaHunterDomain, extractEmailFromFacebook, extractEmailFromInstagram, extractSocialLinksFromHtml } from '../scraper/social-email.js';
import { isDuplicate } from '../dedup/isDuplicate.js';
import { scoreWebsite } from '../scraper/website-score.js';
import { env } from '../config.js';

const log = createLogger('prospector:prospect-worker');

interface EmailResult {
  email: string;
  source: string;
  confidence: number;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  linkedin?: string | null;
}

/**
 * Full email enrichment — collects from ALL sources, validates each,
 * then returns the HIGHEST confidence email.
 *
 * Sources (all run, not short-circuited):
 * 1. Geoapify email (from OSM data)
 * 2. Website scrape (mailto + regex, 12 paths + Playwright)
 * 3. Hunter.io domain lookup (if key configured)
 * 4. Facebook page scrape (real URL)
 * 5. Instagram bio scrape (real URL)
 * 6. Brave Search (snippet + selective page visits)
 * 7. Email pattern guessing (info@domain)
 *
 * Every email passes domain-vs-website validation + MX check.
 * The one with the highest confidence score wins.
 */
async function enrichEmail(
  name: string,
  city: string,
  website: string | undefined,
  geoapifyEmail: string | undefined,
  socialUrls?: { facebook?: string; instagram?: string },
): Promise<EmailResult | null> {
  const candidates: EmailResult[] = [];

  // Helper: validate and collect if good
  async function collect(email: string, source: string, extra?: Partial<EmailResult>): Promise<void> {
    // Skip if we already have this exact email from another source
    if (candidates.some(c => c.email === email)) return;

    const validation = await validateEmail(email, website, name);
    if (!validation.valid) {
      log.debug({ email, source, reason: validation.reason, name }, 'Email rejected by validator');
      return;
    }
    const confidence = extra?.confidence != null ? Math.max(extra.confidence, validation.confidence) : validation.confidence;
    candidates.push({ email, source, ...extra, confidence });
  }

  // 1. Geoapify email (from OSM data)
  if (geoapifyEmail) {
    await collect(geoapifyEmail, 'geoapify');
  }

  // 2. Website scrape (mailto + regex + contact links + Playwright)
  if (website) {
    const scraped = await extractEmailFromWebsite(website, name);
    if (scraped) {
      await collect(scraped.email, `website_scrape:${scraped.source}`);
    }
  }

  // If we already have a high-confidence email (95+), skip slower sources
  const bestSoFar = candidates.reduce((b, c) => c.confidence > b ? c.confidence : b, 0);
  if (bestSoFar < 90) {
    // 3. Hunter.io domain lookup
    if (env.HUNTER_API_KEY && website) {
      const domain = extractDomain(website);
      const hunterResult = await findEmailViaHunterDomain(domain, env.HUNTER_API_KEY);
      if (hunterResult) {
        await collect(hunterResult.email, 'hunter', {
          firstName: hunterResult.firstName ?? null,
          lastName: hunterResult.lastName ?? null,
          position: hunterResult.position ?? null,
        });
      }
    }

    // 4. Facebook page scrape
    if (socialUrls?.facebook) {
      const fbEmail = await extractEmailFromFacebook(socialUrls.facebook);
      if (fbEmail) await collect(fbEmail, 'facebook');
    }

    // 5. Instagram bio scrape
    if (socialUrls?.instagram) {
      const igEmail = await extractEmailFromInstagram(socialUrls.instagram);
      if (igEmail) await collect(igEmail, 'instagram');
    }

    // 6. Brave Search
    if (env.BRAVE_SEARCH_API_KEY && city) {
      const found = await findBusinessEmail(name, city, env.BRAVE_SEARCH_API_KEY, website);
      if (found) await collect(found, 'brave_search');
    }
  }

  // 7. Pattern guessing — only if nothing else found
  if (candidates.length === 0 && website) {
    const domain = extractDomain(website);
    const guess = await guessEmailPattern(domain);
    if (guess) {
      candidates.push({ email: guess.email, source: 'pattern_guess', confidence: guess.confidence });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by confidence descending, return the best
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length > 1) {
    log.info(
      { name, best: candidates[0]!.email, bestScore: candidates[0]!.confidence, all: candidates.map(c => `${c.email}(${c.confidence})`) },
      'Multiple emails found — returning highest confidence',
    );
  }

  return candidates[0]!;
}

export function startProspectWorker(): Worker {
  const worker = new Worker<ProspectDiscoveredPayload>(
    QUEUE_NAMES.PROSPECT_DISCOVERED,
    async (job) => {
      const { campaignId, placeId, name, address, categories, phone, website, email: geoapifyEmail, facebook: geoapifyFb, instagram: geoapifyIg } = job.data;

      // Cross-source dedup — check by placeId, email, phone, website, name across ALL campaigns
      const dupCheck = await isDuplicate({ name, phone, email: geoapifyEmail, website, googlePlaceId: placeId });
      if (dupCheck.isDuplicate) {
        log.info({ placeId, name, matchField: dupCheck.matchField, matchedId: dupCheck.matchedProspectId }, 'Duplicate prospect — skipping');
        return;
      }

      const city = (address['city'] as string | undefined) ?? '';

      // Discover social links: prefer Geoapify OSM data, fall back to scraping the website
      let socialUrls: { facebook?: string; instagram?: string } = {};
      if (geoapifyFb || geoapifyIg) {
        if (geoapifyFb) socialUrls.facebook = geoapifyFb;
        if (geoapifyIg) socialUrls.instagram = geoapifyIg;
      } else if (website) {
        // Try to find social links on the business website
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(website.startsWith('http') ? website : `https://${website}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          clearTimeout(timer);
          if (res.ok) {
            const html = await res.text();
            socialUrls = extractSocialLinksFromHtml(html);
          }
        } catch {
          // ignore
        }
      }

      const emailResult = await enrichEmail(name, city, website, geoapifyEmail, socialUrls);

      const status = emailResult ? 'ENRICHED' : 'NEW';

      // If Geoapify did not return a phone, try scraping the website
      let resolvedPhone = phone ?? null;
      let phoneSource: string | null = phone ? 'geoapify' : null;
      if (!resolvedPhone && website) {
        resolvedPhone = await extractPhoneFromWebsite(website);
        if (resolvedPhone) {
          phoneSource = 'website_scrape';
          log.debug({ name, phone: resolvedPhone }, 'Phone found via website scrape');
        }
      }

      // Detect contact form on website (even if no email found)
      let hasContactForm: boolean | null = null;
      if (website && !emailResult) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(website.startsWith('http') ? website : `https://${website}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmbedoBot/1.0)' },
          });
          clearTimeout(timer);
          if (res.ok) {
            const html = await res.text();
            hasContactForm = detectContactForm(html);
          }
        } catch {
          // ignore
        }
      }

      const prospect = await db.prospectBusiness.create({
        data: {
          campaignId,
          name,
          address: address as object,
          phone: resolvedPhone,
          phoneSource,
          website: website ?? null,
          email: emailResult?.email ?? null,
          emailSource: emailResult?.source ?? null,
          emailConfidence: emailResult?.confidence ?? null,
          hasContactForm,
          contactFirstName: emailResult?.firstName ?? null,
          contactLastName: emailResult?.lastName ?? null,
          contactTitle: emailResult?.position ?? null,
          contactLinkedIn: emailResult?.linkedin ?? null,
          facebookUrl: socialUrls.facebook ?? null,
          // instagramUrl not in schema — stored on social URLs via facebookUrl pattern
          googlePlaceId: placeId,
          googleRating: null,
          googleReviewCount: null,
          status,
        },
      });

      log.info(
        { prospectId: prospect.id, name, email: emailResult?.email, source: emailResult?.source, confidence: emailResult?.confidence, status, hasContactForm },
        'Prospect created',
      );

      // Generate AI short name + business type + chain detection in background (non-blocking)
      if (env.ANTHROPIC_API_KEY) {
        import('../outreach/templates.js').then(async ({ aiBusinessName, typeFromCategories }) => {
          const categoryHint = categories?.length ? typeFromCategories(categories) : null;
          const result = await aiBusinessName(name, env.ANTHROPIC_API_KEY!, categoryHint);
          if (result) {
            await db.prospectBusiness.update({
              where: { id: prospect.id },
              data: {
                shortName: result.shortName,
                businessType: result.type,
                isChain: result.isChain,
              },
            });
          }
        }).catch(() => {});
      }

      // Score website in background (non-blocking)
      if (website) {
        scoreWebsite(website).then(async (result) => {
          try {
            await db.prospectBusiness.update({
              where: { id: prospect.id },
              data: {
                websiteScore: result.score,
                websiteScorecard: result.scorecard as object ?? undefined,
                websiteScoringMethod: result.scoringMethod,
                websiteHasChatbot: result.hasChatbot,
                websiteChatbotProvider: result.chatbotProvider,
                websiteScoredAt: new Date(),
              },
            });
            log.info({ prospectId: prospect.id, score: result.score }, 'Website score saved');
          } catch (err) {
            log.warn({ err, prospectId: prospect.id }, 'Failed to save website score');
          }
        }).catch(() => {});
      }

      // Emails are NOT auto-queued — user must manually send via the campaign UI
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: getRedisConnection() as any,
      concurrency: 3,
    },
  );

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err }, 'Prospect worker job failed');
  });

  log.info('Prospect worker started');
  return worker;
}
