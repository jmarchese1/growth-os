// Training knowledge base — owns initialization, caching, and the public read API.
// Static insights are always present. Dynamic insights accumulate as scrapes complete.

import { createLogger } from '@embedo/utils';
import { scrapeForInspiration } from '../scraper/scrape.js';
import { getStaticInsights, type TrainingIndustryId } from './static-insights.js';
import { TRAINING_URLS } from './training-urls.js';

const logger = createLogger('website-gen:knowledge-base');

// In-memory cache: industry → scraped style strings, populated progressively
const dynamicCache = new Map<TrainingIndustryId, string[]>();

let initialized = false;

// Called once at service startup — non-blocking. Each URL resolves independently.
export function initKnowledgeBase(anthropicKey: string): void {
  if (initialized) return;
  initialized = true;

  logger.info('Initializing training knowledge base in background');

  for (const [industry, urls] of Object.entries(TRAINING_URLS)) {
    const key = industry as TrainingIndustryId;
    for (const url of urls) {
      scrapeForInspiration(url, anthropicKey)
        .then((insight) => {
          if (!insight) return;
          const existing = dynamicCache.get(key) ?? [];
          existing.push(insight);
          dynamicCache.set(key, existing);
          logger.debug({ industry: key, url }, 'Training insight cached');
        })
        .catch(() => {
          logger.warn({ url }, 'Unexpected error caching training URL');
        });
    }
  }
}

// Returns combined static + dynamic insights as a single string ready for injection.
// Synchronous — returns whatever is cached at call time (zero to all entries).
export function getInsightsForIndustry(industryType?: string): string {
  const key = (industryType ?? 'restaurant') as TrainingIndustryId;

  const staticPart = getStaticInsights(key);
  const dynamic = dynamicCache.get(key) ?? [];

  const parts: string[] = [];

  if (staticPart) {
    parts.push(`## Design Principles for ${key} websites\n${staticPart}`);
  }

  if (dynamic.length > 0) {
    parts.push(`## Live Style Observations from Reference Sites\n${dynamic.join('\n\n')}`);
  }

  return parts.join('\n\n---\n\n');
}
