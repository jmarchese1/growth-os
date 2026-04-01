import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { createBrowserContext, saveCookies, getAvailableSession } from './session-manager.js';
import { handleToUrl } from './handle-extractor.js';

const log = createLogger('prospector:ig-followers');

/**
 * Parse a follower count string like "12.5K", "1.2M", "3,456" into a number.
 */
function parseFollowerCount(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  if (/[Kk]$/.test(cleaned)) return Math.round(parseFloat(cleaned) * 1000);
  if (/[Mm]$/.test(cleaned)) return Math.round(parseFloat(cleaned) * 1000000);
  return parseInt(cleaned) || 0;
}

/**
 * Scrape follower count for a single Instagram profile.
 * Returns the count or null if it couldn't be determined.
 */
async function scrapeFollowerCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  handle: string,
): Promise<number | null> {
  try {
    await page.goto(handleToUrl(handle), { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000 + Math.random() * 1500);

    const html = await page.content();

    // Try meta tag first: <meta property="og:description" content="123K Followers, 456 Following, 789 Posts...">
    const metaMatch = html.match(/content="([\d,.]+[KkMm]?)\s+Followers/i);
    if (metaMatch?.[1]) {
      return parseFollowerCount(metaMatch[1]);
    }

    // Try page text: "1,234 followers" or "12.5K followers"
    const textMatch = html.match(/([\d,.]+[KkMm]?)\s*followers/i);
    if (textMatch?.[1]) {
      return parseFollowerCount(textMatch[1]);
    }

    // Try JSON-LD or embedded data
    const jsonMatch = html.match(/"edge_followed_by":\s*\{"count":\s*(\d+)/);
    if (jsonMatch?.[1]) {
      return parseInt(jsonMatch[1]);
    }

    return null;
  } catch (err) {
    log.debug({ err, handle }, 'Failed to scrape follower count');
    return null;
  }
}

/**
 * Batch scrape follower counts for all prospects with Instagram handles
 * that don't have a follower count yet.
 *
 * @param campaignId - Optional: only scrape prospects from this campaign
 * @param limit - Max prospects to scrape in this batch (default 50)
 */
export async function batchScrapeFollowers(campaignId?: string, limit = 50): Promise<{ scraped: number; errors: number }> {
  const where: Record<string, unknown> = {
    instagramHandle: { not: null },
    instagramFollowers: null,
  };
  if (campaignId) where['campaignId'] = campaignId;

  const prospects = await db.prospectBusiness.findMany({
    where: where as never,
    select: { id: true, instagramHandle: true, name: true },
    take: limit,
  });

  if (prospects.length === 0) {
    log.debug('No prospects need follower count scraping');
    return { scraped: 0, errors: 0 };
  }

  const session = await getAvailableSession();
  if (!session) {
    log.warn('No active Instagram session — skipping follower scrape');
    return { scraped: 0, errors: 0 };
  }

  log.info({ count: prospects.length, campaignId }, 'Starting batch follower scrape');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;
  let scraped = 0;
  let errors = 0;

  try {
    const result = await createBrowserContext(session.cookies, session.userAgent);
    browser = result.browser;
    const context = result.context;
    const page = await context.newPage();

    // Block heavy resources
    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,mp4,mov,css}', (route: { abort: () => void }) => route.abort());

    for (const prospect of prospects) {
      if (!prospect.instagramHandle) continue;

      const count = await scrapeFollowerCount(page, prospect.instagramHandle);

      if (count !== null) {
        await db.prospectBusiness.update({
          where: { id: prospect.id },
          data: { instagramFollowers: count },
        });
        log.debug({ handle: prospect.instagramHandle, followers: count }, 'Follower count saved');
        scraped++;
      } else {
        // Store 0 so we don't retry endlessly
        await db.prospectBusiness.update({
          where: { id: prospect.id },
          data: { instagramFollowers: 0 },
        });
        errors++;
      }

      // Small delay between profile visits
      await page.waitForTimeout(1500 + Math.random() * 2000);
    }

    await saveCookies(session.id, context);
    await browser.close();
  } catch (err) {
    log.error({ err }, 'Batch follower scrape failed');
    if (browser) try { await browser.close(); } catch { /* ignore */ }
  }

  log.info({ scraped, errors, total: prospects.length }, 'Batch follower scrape complete');
  return { scraped, errors };
}
