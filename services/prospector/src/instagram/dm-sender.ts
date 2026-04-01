import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { buildTemplateVars } from '../outreach/templates.js';
import {
  getAvailableSession,
  createBrowserContext,
  validateSessionPage,
  saveCookies,
  incrementSessionSend,
  markSessionStatus,
} from './session-manager.js';
import { getSelectors } from './selectors.js';
import { handleToUrl } from './handle-extractor.js';
import { env } from '../config.js';

const log = createLogger('prospector:ig-dm-sender');

export interface DmSendResult {
  success: boolean;
  dmId: string;
  error?: string;
}

/**
 * Send an Instagram DM to a prospect.
 *
 * Flow:
 * 1. Load prospect + campaign data
 * 2. Get available session (under daily limit)
 * 3. Launch Playwright with session cookies
 * 4. Validate session (check login, challenges)
 * 5. Navigate to prospect's Instagram profile
 * 6. Click "Message" button
 * 7. Type message with human-like delays
 * 8. Send the message
 * 9. Update records
 * 10. Save updated cookies
 */
export async function sendInstagramDm(
  prospectId: string,
  campaignId: string,
  sessionId?: string,
  stepNumber?: number,
): Promise<DmSendResult> {
  // 1. Load prospect + campaign
  const prospect = await db.prospectBusiness.findUnique({
    where: { id: prospectId },
    include: { campaign: true },
  });

  if (!prospect) throw new Error(`Prospect ${prospectId} not found`);
  if (!prospect.instagramHandle) throw new Error(`Prospect ${prospectId} has no Instagram handle`);

  // Duplicate check — don't DM someone we've already successfully DM'd
  const existingDm = await db.instagramDM.findFirst({
    where: { prospectId, status: 'SENT' },
  });
  if (existingDm) {
    log.info({ prospectId, handle: prospect.instagramHandle }, 'Already DM\'d this prospect — skipping');
    return { success: true, dmId: existingDm.id };
  }

  const campaign = await db.outboundCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  const dmTemplate = campaign.instagramDmBody;
  if (!dmTemplate) throw new Error(`Campaign ${campaignId} has no Instagram DM template`);

  // Build the message from template
  const vars = await buildTemplateVars(prospect, {
    city: campaign.targetCity,
    anthropicKey: env.ANTHROPIC_API_KEY,
  });
  // Simple variable substitution (no HTML rendering for DMs)
  let message = Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    dmTemplate,
  );

  // 2. Get available session
  const session = sessionId
    ? await db.instagramSession.findUnique({ where: { id: sessionId } })
    : await getAvailableSession();

  if (!session) {
    // Create a FAILED DM record
    const dm = await db.instagramDM.create({
      data: {
        prospectId,
        campaignId,
        sessionId: 'none',
        body: message,
        status: 'FAILED',
        failureReason: 'no_active_session',
        stepNumber: stepNumber ?? null,
      },
    });
    return { success: false, dmId: dm.id, error: 'No active Instagram session available' };
  }

  // Create the DM record as QUEUED
  const dm = await db.instagramDM.create({
    data: {
      prospectId,
      campaignId,
      sessionId: session.id,
      body: message,
      status: 'QUEUED',
      stepNumber: stepNumber ?? null,
    },
  });

  const selectors = getSelectors(
    'selectors' in session ? (session.selectors as Record<string, string> | null) : null
  );
  const profileUrl = handleToUrl(prospect.instagramHandle);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let context: any = null;

  try {
    // 3. Launch browser with session cookies
    const cookies = ('cookies' in session ? session.cookies : []) as Array<{
      name: string; value: string; domain: string; path: string;
      expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None';
    }>;
    const result = await createBrowserContext(
      cookies,
      'userAgent' in session ? (session.userAgent as string | null) : null,
    );
    browser = result.browser;
    context = result.context;

    const page = await context.newPage();

    // Block unnecessary resources
    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,mp4,mov}', (route: { abort: () => void }) => route.abort());

    // 4. Validate session
    const status = await validateSessionPage(page, selectors);
    if (status !== 'ACTIVE') {
      await markSessionStatus(session.id, status);
      await db.instagramDM.update({
        where: { id: dm.id },
        data: { status: 'FAILED', failureReason: `session_${status.toLowerCase()}` },
      });
      return { success: false, dmId: dm.id, error: `Session is ${status}` };
    }

    // 5. Navigate to profile
    log.info({ prospectId, handle: prospect.instagramHandle, url: profileUrl }, 'Navigating to Instagram profile');
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000 + Math.random() * 2000);

    // Check if profile exists
    const notFound = await page.$(selectors.notFoundIndicator).catch(() => null);
    if (notFound) {
      await db.instagramDM.update({
        where: { id: dm.id },
        data: { status: 'FAILED', failureReason: 'profile_not_found' },
      });
      return { success: false, dmId: dm.id, error: 'Instagram profile not found' };
    }

    // Check follower count — skip accounts with 100k+ followers
    try {
      const pageHtml = await page.content();
      // Instagram shows follower counts in meta tags or in the page text
      // Format: "123K followers" or "1.2M followers" or "12,345 followers"
      const followerMatch = pageHtml.match(/(\d[\d,.]*[KMkm]?)\s*(?:followers|Followers)/);
      if (followerMatch?.[1]) {
        let count = 0;
        const raw = followerMatch[1].replace(/,/g, '');
        if (/[Kk]$/.test(raw)) count = parseFloat(raw) * 1000;
        else if (/[Mm]$/.test(raw)) count = parseFloat(raw) * 1000000;
        else count = parseInt(raw);

        if (count > 0) {
          log.info({ handle: prospect.instagramHandle, followers: count }, 'Follower count detected');
          // Store on prospect for future filtering
          await db.prospectBusiness.update({
            where: { id: prospectId },
            data: { instagramFollowers: count },
          }).catch(() => {});
        }

        const maxFollowers = 100000;
        if (count > maxFollowers) {
          await db.instagramDM.update({
            where: { id: dm.id },
            data: { status: 'FAILED', failureReason: `too_many_followers:${count}` },
          });
          log.info({ handle: prospect.instagramHandle, followers: count }, 'Skipping — too many followers');
          return { success: false, dmId: dm.id, error: `Account has ${count.toLocaleString()} followers (limit: ${maxFollowers.toLocaleString()})` };
        }
      }
    } catch {
      // Don't block sending if follower check fails
    }

    // Check if private
    const isPrivate = await page.$(selectors.privateIndicator).catch(() => null);
    if (isPrivate) {
      await db.instagramDM.update({
        where: { id: dm.id },
        data: { status: 'FAILED', failureReason: 'private_account' },
      });
      return { success: false, dmId: dm.id, error: 'Account is private' };
    }

    // 6. Click "Message" button
    const msgButton = await page.$(selectors.messageButton).catch(() => null);
    if (!msgButton) {
      await db.instagramDM.update({
        where: { id: dm.id },
        data: { status: 'FAILED', failureReason: 'message_button_not_found' },
      });
      log.warn({ prospectId, handle: prospect.instagramHandle }, 'Message button not found — selector may need updating');
      return { success: false, dmId: dm.id, error: 'Message button not found on profile' };
    }

    await msgButton.click();
    await page.waitForTimeout(2000 + Math.random() * 1500);

    // 7. Type message with human-like delays
    const textArea = await page.$(selectors.textArea).catch(() => null);
    if (!textArea) {
      await db.instagramDM.update({
        where: { id: dm.id },
        data: { status: 'FAILED', failureReason: 'textarea_not_found' },
      });
      return { success: false, dmId: dm.id, error: 'DM text area not found' };
    }

    await textArea.click();
    await page.waitForTimeout(500);

    // Type character by character with randomized delays (human-like)
    for (const char of message) {
      await page.keyboard.type(char, { delay: 30 + Math.random() * 60 });
    }

    await page.waitForTimeout(500 + Math.random() * 1000);

    // 8. Send — try Enter key first, then send button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // 9. Update records
    await db.instagramDM.update({
      where: { id: dm.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    await incrementSessionSend(session.id);

    // Update prospect status if this is their first outreach
    if (prospect.status === 'ENRICHED' || prospect.status === 'NEW') {
      await db.prospectBusiness.update({
        where: { id: prospectId },
        data: { status: 'CONTACTED' },
      });
    }

    // 10. Save updated cookies
    await saveCookies(session.id, context);

    log.info(
      { prospectId, handle: prospect.instagramHandle, dmId: dm.id, sessionId: session.id },
      'Instagram DM sent successfully',
    );

    return { success: true, dmId: dm.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log.error({ err, prospectId, handle: prospect.instagramHandle }, 'Instagram DM send failed');

    await db.instagramDM.update({
      where: { id: dm.id },
      data: { status: 'FAILED', failureReason: errorMsg.slice(0, 500) },
    });

    // If it looks like a challenge/block, mark the session
    if (errorMsg.includes('challenge') || errorMsg.includes('checkpoint') || errorMsg.includes('suspicious')) {
      await markSessionStatus(session.id, 'CHALLENGE_REQUIRED', errorMsg);
    }

    return { success: false, dmId: dm.id, error: errorMsg };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
