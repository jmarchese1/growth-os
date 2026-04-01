import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';

const log = createLogger('prospector:ig-session');

export type SessionStatus = 'ACTIVE' | 'CHALLENGE_REQUIRED' | 'SUSPENDED' | 'EXPIRED';

interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Get an available Instagram session (ACTIVE + under daily limit).
 * Uses lazy daily reset (same pattern as SendingDomain).
 */
export async function getAvailableSession(): Promise<{
  id: string;
  username: string;
  cookies: CookieData[];
  userAgent: string | null;
  selectors: Record<string, string> | null;
  dailyLimit: number;
  sentToday: number;
} | null> {
  const sessions = await db.instagramSession.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { lastUsedAt: 'asc' }, // least recently used first
  });

  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const todayDateStr = todayET.toISOString().slice(0, 10);

  for (const session of sessions) {
    const sessionDateStr = new Date(session.sentTodayDate.toLocaleString('en-US', { timeZone: 'America/New_York' })).toISOString().slice(0, 10);

    // Lazy daily reset
    let sentToday = session.sentToday;
    if (sessionDateStr !== todayDateStr) {
      await db.instagramSession.update({
        where: { id: session.id },
        data: { sentToday: 0, sentTodayDate: now },
      });
      sentToday = 0;
    }

    if (sentToday < session.dailyLimit) {
      return {
        id: session.id,
        username: session.username,
        cookies: session.cookies as unknown as CookieData[],
        userAgent: session.userAgent,
        selectors: session.selectors as Record<string, string> | null,
        dailyLimit: session.dailyLimit,
        sentToday,
      };
    }
  }

  return null;
}

/**
 * Create a Playwright browser context with Instagram session cookies.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _chromium: any = null;

async function getChromium() {
  if (_chromium) return _chromium;

  // Ensure PLAYWRIGHT_BROWSERS_PATH is set for Docker environments
  if (!process.env['PLAYWRIGHT_BROWSERS_PATH'] && process.env['NODE_ENV'] === 'production') {
    process.env['PLAYWRIGHT_BROWSERS_PATH'] = '/opt/pw-browsers';
  }

  // Try playwright-chromium first (bundles browser binary in node_modules)
  try {
    const pwc = await import('playwright-chromium');
    _chromium = pwc.chromium;
    log.info('Using playwright-chromium');
    return _chromium;
  } catch {
    // Fall back to regular playwright
  }

  try {
    const pw = await import('playwright');
    _chromium = pw.chromium;
    log.info('Using playwright');
    return _chromium;
  } catch {
    throw new Error('Neither playwright-chromium nor playwright is available');
  }
}

export async function createBrowserContext(
  cookies: CookieData[],
  userAgent?: string | null,
) {
  const chromium = await getChromium();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    userAgent: userAgent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });

  // Inject cookies
  const playwrightCookies = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    expires: c.expires ?? -1,
    httpOnly: c.httpOnly ?? false,
    secure: c.secure ?? true,
    sameSite: (c.sameSite ?? 'None') as 'Strict' | 'Lax' | 'None',
  }));

  await context.addCookies(playwrightCookies);

  return { browser, context };
}

/**
 * Validate that a session is still logged in.
 * Returns the status after checking.
 */
export async function validateSessionPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  selectors: { loginIndicator: string; challengeIndicator: string },
): Promise<SessionStatus> {
  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    const url = page.url();

    // Check for login redirect
    if (url.includes('/accounts/login')) {
      return 'EXPIRED';
    }

    // Check for challenge/checkpoint
    if (url.includes('/challenge') || url.includes('/checkpoint')) {
      return 'CHALLENGE_REQUIRED';
    }

    // Try to find the challenge indicator in the DOM
    try {
      const challenge = await page.$(selectors.challengeIndicator);
      if (challenge) return 'CHALLENGE_REQUIRED';
    } catch {
      // Selector didn't match — good
    }

    // Check for logged-in indicator
    try {
      const loggedIn = await page.$(selectors.loginIndicator);
      if (loggedIn) return 'ACTIVE';
    } catch {
      // Selector didn't match
    }

    // If we didn't get redirected and no challenge, assume active
    return 'ACTIVE';
  } catch (err) {
    log.warn({ err }, 'Session validation failed');
    return 'EXPIRED';
  }
}

/**
 * Save updated cookies from a browser context back to the DB.
 * Instagram rotates session tokens, so this prevents premature expiry.
 */
export async function saveCookies(sessionId: string, context: { cookies: () => Promise<CookieData[]> }): Promise<void> {
  try {
    const cookies = await context.cookies();
    const igCookies = cookies.filter(c => c.domain.includes('instagram.com'));
    if (igCookies.length > 0) {
      await db.instagramSession.update({
        where: { id: sessionId },
        data: { cookies: igCookies as unknown as object[] },
      });
    }
  } catch (err) {
    log.warn({ err, sessionId }, 'Failed to save updated cookies');
  }
}

/**
 * Increment the daily send count for a session.
 */
export async function incrementSessionSend(sessionId: string): Promise<void> {
  await db.instagramSession.update({
    where: { id: sessionId },
    data: {
      sentToday: { increment: 1 },
      totalSent: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Mark a session as having a problem.
 */
export async function markSessionStatus(
  sessionId: string,
  status: SessionStatus,
  error?: string,
  challengeType?: string,
): Promise<void> {
  await db.instagramSession.update({
    where: { id: sessionId },
    data: {
      status,
      lastError: error ?? null,
      challengeType: challengeType ?? null,
    },
  });
  log.warn({ sessionId, status, error }, 'Instagram session status changed');
}

/**
 * Reset daily send counts for all sessions (called at midnight ET).
 */
export async function resetDailyCounts(): Promise<void> {
  await db.instagramSession.updateMany({
    where: { status: 'ACTIVE' },
    data: { sentToday: 0, sentTodayDate: new Date() },
  });
  log.info('Instagram session daily counts reset');
}
