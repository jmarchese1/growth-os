import { createLogger } from '@embedo/utils';
import { db } from '@embedo/db';
import { getAvailableSession, createBrowserContext, saveCookies } from './session-manager.js';
import { env } from '../config.js';

const log = createLogger('prospector:ig-reply-checker');

/**
 * Check Instagram DM inbox for replies to prospects we've messaged.
 * Opens the DM inbox via Playwright, scans for unread messages from
 * known prospect handles, and marks them as REPLIED.
 */
export async function checkForReplies(): Promise<{ checked: number; newReplies: number }> {
  // Only run Mon-Sat, 8am-11pm ET
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = et.getHours();
  const day = et.getDay(); // 0 = Sunday

  if (day === 0) {
    log.debug('Skipping reply check — Sunday');
    return { checked: 0, newReplies: 0 };
  }
  if (hour < 8 || hour >= 23) {
    log.debug({ hour }, 'Skipping reply check — outside 8am-11pm ET');
    return { checked: 0, newReplies: 0 };
  }

  const session = await getAvailableSession();
  if (!session) {
    log.warn('No active Instagram session — skipping reply check');
    return { checked: 0, newReplies: 0 };
  }

  // Get all SENT DMs that haven't been marked as REPLIED yet
  const sentDms = await db.instagramDM.findMany({
    where: { status: 'SENT' },
    include: {
      prospect: { select: { id: true, name: true, shortName: true, instagramHandle: true } },
    },
  });

  if (sentDms.length === 0) {
    log.debug('No sent DMs to check for replies');
    return { checked: 0, newReplies: 0 };
  }

  // Build a lookup of handles we've DM'd
  const handleToDm = new Map<string, typeof sentDms[0]>();
  for (const dm of sentDms) {
    const handle = dm.prospect.instagramHandle?.toLowerCase();
    if (handle) handleToDm.set(handle, dm);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null;
  let newReplies = 0;

  try {
    const result = await createBrowserContext(session.cookies, session.userAgent);
    browser = result.browser;
    const context = result.context;
    const page = await context.newPage();

    // Block heavy resources
    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,mp4,mov}', (route: { abort: () => void }) => route.abort());

    // Navigate to DM inbox
    log.info('Opening Instagram DM inbox');
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4000);

    // Check if we're logged in
    const url = page.url();
    if (url.includes('/accounts/login') || url.includes('/challenge')) {
      log.warn('Session expired or challenged during reply check');
      await db.instagramSession.update({
        where: { id: session.id },
        data: { status: url.includes('/challenge') ? 'CHALLENGE_REQUIRED' : 'EXPIRED' },
      });
      await browser.close();
      return { checked: 0, newReplies: 0 };
    }

    // Get the page HTML to scan for conversation threads
    const html = await page.content();

    // Look for unread indicators and conversation participants
    // Instagram DM inbox shows conversation previews with usernames
    for (const [handle, dm] of handleToDm) {
      // Check if this handle appears in the inbox with an unread indicator
      // Instagram shows conversation threads with the username visible
      const handleRegex = new RegExp(handle, 'i');
      if (!handleRegex.test(html)) continue;

      // Navigate to the specific conversation to check for new messages
      try {
        await page.goto(`https://www.instagram.com/direct/t/${handle}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);

        const threadHtml = await page.content();

        // Check if there are messages from the other person (not just our sent message)
        // Look for message elements that aren't from us
        // This is a heuristic — we check if there's more than one message group in the thread
        const messageGroups = threadHtml.match(/role="listitem"/gi) ?? [];

        // If there are multiple message groups and the thread contains text we didn't send,
        // it likely means they replied
        if (messageGroups.length > 1) {
          // Extract the last message text to store as reply body
          // Try to get text from the last message element
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lastMessages: string[] = await page.$$eval('[role="listitem"]', (elements: any[]) => {
            return elements.slice(-3).map((el: any) => el.textContent?.trim() ?? '');
          }).catch(() => [] as string[]);

          // Filter out our own message
          const ourMessage = dm.body.substring(0, 50);
          const replyMessages = lastMessages.filter((m: string) =>
            m.length > 0 && !m.includes(ourMessage) && m.length < 2000
          );

          if (replyMessages.length > 0) {
            const replyBody = replyMessages[replyMessages.length - 1] ?? '';

            await db.instagramDM.update({
              where: { id: dm.id },
              data: {
                status: 'REPLIED',
                repliedAt: new Date(),
                replyBody: replyBody.substring(0, 2000),
              },
            });

            // Update prospect status
            await db.prospectBusiness.update({
              where: { id: dm.prospectId },
              data: { status: 'REPLIED' },
            });

            log.info({ handle, prospectName: dm.prospect.name, replyPreview: replyBody.substring(0, 100) }, 'Instagram reply detected');

            // Send email notification
            await sendReplyNotification(dm.prospect.name, dm.prospect.shortName, handle, replyBody);

            newReplies++;
          }
        }

        // Small delay between thread checks
        await page.waitForTimeout(1000 + Math.random() * 2000);
      } catch (err) {
        log.debug({ err, handle }, 'Error checking conversation thread');
      }
    }

    // Save updated cookies
    await saveCookies(session.id, context);
    await browser.close();

    log.info({ checked: handleToDm.size, newReplies }, 'Instagram reply check complete');
    return { checked: handleToDm.size, newReplies };
  } catch (err) {
    log.error({ err }, 'Instagram reply check failed');
    if (browser) try { await browser.close(); } catch { /* ignore */ }
    return { checked: 0, newReplies: 0 };
  }
}

/**
 * Send email notification when an Instagram reply is detected.
 */
async function sendReplyNotification(
  prospectName: string,
  shortName: string | null,
  handle: string,
  replyBody: string,
): Promise<void> {
  if (!env.SENDGRID_API_KEY) return;

  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(env.SENDGRID_API_KEY);

    const displayName = shortName ?? prospectName;

    await sgMail.send({
      to: 'jason@embedo.io',
      from: env.SENDGRID_FROM_EMAIL ?? 'jason@embedo.io',
      subject: `Instagram reply from ${displayName} (@${handle})`,
      text: `${displayName} (@${handle}) replied to your Instagram DM:\n\n"${replyBody}"\n\nView on Instagram: https://instagram.com/direct/t/${handle}/`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Instagram DM Reply</p>
          <h2 style="margin: 0 0 16px; font-size: 20px; color: #111;">${displayName} <span style="font-weight: normal; color: #E1306C;">@${handle}</span></h2>
          <div style="background: #f8f8f8; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">"${replyBody}"</p>
          </div>
          <a href="https://instagram.com/direct/t/${handle}/" style="display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045); color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Reply on Instagram</a>
        </div>
      `,
    });

    log.info({ handle, prospectName }, 'Reply notification email sent');
  } catch (err) {
    log.warn({ err, handle }, 'Failed to send reply notification email');
  }
}
