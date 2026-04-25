import sgMail from '@sendgrid/mail';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('prospector:agent-update');

const APP_URL = process.env['PLATFORM_URL'] ?? 'https://app.embedo.io';

/**
 * Strip HTML to clean text + collapse whitespace, capped at maxLen chars.
 * Used for the sample-email body previews so the email stays compact.
 */
function htmlToPreview(html: string, maxLen = 280): string {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>(\s*<br\s*\/?>)+/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/not\s+interested\?\s*unsubscribe/gi, '')
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate and send the daily Agent Update email.
 * Apple-styled HTML matching the platform aesthetic.
 */
export async function sendDailyDigest(): Promise<void> {
  if (!env.SENDGRID_API_KEY || !env.OWNER_EMAIL) {
    log.debug('Agent update skipped — SENDGRID_API_KEY or OWNER_EMAIL not set');
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Stats
    const [emailsSent, opens, replies, bounces, activeAgents, totalCapacity] = await Promise.all([
      db.outreachMessage.count({ where: { sentAt: { gte: since } } }),
      db.outreachMessage.count({ where: { openedAt: { gte: since } } }),
      db.outreachMessage.count({ where: { repliedAt: { gte: since } } }),
      db.outreachMessage.count({ where: { sentAt: { gte: since }, status: 'BOUNCED' } }),
      db.agent.count({ where: { active: true } }).catch(() => 0),
      db.agent.aggregate({ where: { active: true }, _sum: { dailyCap: true } })
        .then((r) => r._sum.dailyCap ?? 0)
        .catch(() => 0),
    ]);

    // Sample emails — 3 most recent agent sends with full body for review
    const sampleEmails = await db.outreachMessage.findMany({
      where: { sentAt: { gte: since } },
      include: {
        prospect: {
          select: {
            name: true,
            email: true,
            campaign: { select: { name: true, agentId: true } },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 3,
    });

    // Replies — last 10
    const recentReplies = await db.outreachMessage.findMany({
      where: { repliedAt: { gte: since }, status: 'REPLIED' },
      include: { prospect: { select: { name: true, email: true } } },
      orderBy: { repliedAt: 'desc' },
      take: 10,
    });

    // Skip if literally nothing happened
    if (emailsSent === 0 && opens === 0 && replies === 0 && bounces === 0) {
      log.debug('Agent update skipped — no activity in last 24h');
      return;
    }

    const openRate  = emailsSent > 0 ? Math.round((opens   / emailsSent) * 100) : 0;
    const replyRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0;
    const dateLabel = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    // ── Apple-styled HTML ──────────────────────────────────────────────
    // Inline styles only (email-client safe). Tables for layout (no flex).
    // Palette matches the platform: white #ffffff bg, near-black #1d1d1f
    // text, Apple blue #0071e3 accent, light grey #f5f5f7 cards.

    const APPLE_BLUE   = '#0071e3';
    const APPLE_NEAR   = '#1d1d1f';
    const APPLE_GREY_2 = '#424245';
    const APPLE_GREY_3 = '#86868b';
    const APPLE_GREY_4 = '#b8b8be';
    const CARD_BG      = '#f5f5f7';
    const SURFACE_BG   = '#fbfbfd';
    const RULE         = '#d2d2d7';

    const statCard = (label: string, value: string | number, tint?: string) => `
      <td valign="top" style="padding: 16px 18px; background: ${CARD_BG}; border-radius: 12px; vertical-align: top;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif; font-size: 12px; color: ${APPLE_GREY_3}; font-weight: 500; margin-bottom: 8px;">${label}</div>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif; font-size: 28px; font-weight: 600; color: ${tint ?? APPLE_NEAR}; letter-spacing: -0.02em; line-height: 1;">${value}</div>
      </td>
    `;

    // Stats: 4 columns with 8px spacers between
    const statsRow = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 28px;">
        <tr>
          ${statCard('Sent', emailsSent)}
          <td width="8"></td>
          ${statCard('Opens', `${opens}<span style="font-size:14px;font-weight:500;color:${APPLE_GREY_3};margin-left:6px;">${openRate}%</span>`, opens > 0 ? '#5ac8fa' : APPLE_NEAR)}
          <td width="8"></td>
          ${statCard('Replies', `${replies}<span style="font-size:14px;font-weight:500;color:${APPLE_GREY_3};margin-left:6px;">${replyRate}%</span>`, replies > 0 ? APPLE_BLUE : APPLE_NEAR)}
          <td width="8"></td>
          ${statCard('Bounces', bounces, bounces > 0 ? '#ff3b30' : APPLE_NEAR)}
        </tr>
      </table>
    `;

    const samplesSection = sampleEmails.length === 0 ? '' : `
      <div style="margin-top: 32px; margin-bottom: 12px;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 18px; font-weight: 600; color: ${APPLE_NEAR}; letter-spacing: -0.015em;">Sample emails sent</div>
        <div style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 13px; color: ${APPLE_GREY_3}; margin-top: 4px;">A few of what your agent put in the world today. Review the voice, flag anything off.</div>
      </div>
      ${sampleEmails.map((m) => {
        const preview = htmlToPreview(m.body, 320);
        const subject = m.subject ?? '(no subject)';
        const business = m.prospect.name;
        const email = m.prospect.email ?? '';
        const campaign = m.prospect.campaign?.name ?? '';
        return `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 12px;">
            <tr>
              <td style="background: ${SURFACE_BG}; border: 1px solid ${RULE}; border-radius: 12px; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
                <div style="font-size: 11px; font-weight: 500; color: ${APPLE_GREY_3}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">${escapeHtml(campaign)}</div>
                <div style="font-size: 15px; font-weight: 600; color: ${APPLE_NEAR}; letter-spacing: -0.01em;">${escapeHtml(business)}</div>
                <div style="font-size: 12px; color: ${APPLE_GREY_3}; margin-top: 2px; font-family: ui-monospace, 'SF Mono', monospace;">${escapeHtml(email)}</div>
                <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid ${RULE};">
                  <div style="font-size: 13px; font-weight: 600; color: ${APPLE_GREY_2}; margin-bottom: 8px;">${escapeHtml(subject)}</div>
                  <div style="font-size: 13px; line-height: 1.55; color: ${APPLE_GREY_2}; white-space: pre-wrap;">${escapeHtml(preview)}</div>
                </div>
              </td>
            </tr>
          </table>
        `;
      }).join('')}
    `;

    const repliesSection = recentReplies.length === 0 ? '' : `
      <div style="margin-top: 32px; margin-bottom: 12px;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 18px; font-weight: 600; color: ${APPLE_NEAR}; letter-spacing: -0.015em;">Replies received</div>
        <div style="font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size: 13px; color: ${APPLE_GREY_3}; margin-top: 4px;">${recentReplies.length} ${recentReplies.length === 1 ? 'reply' : 'replies'} since yesterday.</div>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: ${SURFACE_BG}; border: 1px solid ${RULE}; border-radius: 12px; overflow: hidden;">
        ${recentReplies.map((r, i) => `
          <tr>
            <td style="padding: 14px 18px; ${i < recentReplies.length - 1 ? `border-bottom: 1px solid ${RULE};` : ''} font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
              <div style="font-size: 14px; font-weight: 600; color: ${APPLE_NEAR}; letter-spacing: -0.01em;">${escapeHtml(r.prospect.name)}</div>
              <div style="font-size: 12px; color: ${APPLE_GREY_3}; margin-top: 2px; font-family: ui-monospace, 'SF Mono', monospace;">${escapeHtml(r.prospect.email ?? '')}</div>
              <div style="font-size: 11px; color: ${APPLE_GREY_4}; margin-top: 4px;">${r.repliedAt ? escapeHtml(new Date(r.repliedAt).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) : ''} ET</div>
            </td>
          </tr>
        `).join('')}
      </table>
    `;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin: 0; padding: 0; background: #f5f5f7; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f5f5f7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06); overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 8px 32px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="display: inline-block; width: 28px; height: 28px; background: linear-gradient(160deg, #1d8cff 0%, #0071e3 50%, #0058b9 100%); border-radius: 7px; vertical-align: middle; text-align: center; line-height: 28px; color: white; font-weight: 700; font-size: 14px;">✦</div>
                  </td>
                  <td style="padding-left: 10px; vertical-align: middle;">
                    <span style="font-size: 16px; font-weight: 600; color: ${APPLE_NEAR}; letter-spacing: -0.01em;">Embedo</span>
                  </td>
                </tr>
              </table>

              <div style="font-size: 13px; color: ${APPLE_GREY_3}; margin-top: 28px;">${dateLabel} · last 24 hours</div>
              <div style="font-size: 32px; font-weight: 600; color: ${APPLE_NEAR}; letter-spacing: -0.025em; line-height: 1.15; margin-top: 6px;">Agent update</div>
              <div style="font-size: 15px; color: ${APPLE_GREY_2}; margin-top: 8px; line-height: 1.5;">
                ${activeAgents > 0
                  ? `${activeAgents} agent${activeAgents !== 1 ? 's' : ''} armed · ${totalCapacity} emails/day capacity`
                  : 'No agents currently armed.'}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 0 32px;">
              ${statsRow}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              ${samplesSection}
              ${repliesSection}
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 32px 32px 32px; font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <a href="${APP_URL}/data" style="display: inline-block; background: ${APPLE_BLUE}; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; letter-spacing: -0.005em;">View all activity →</a>
                  </td>
                  <td align="right" style="font-size: 12px; color: ${APPLE_GREY_3};">
                    Sent automatically by Embedo
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    sgMail.setApiKey(env.SENDGRID_API_KEY);
    await sgMail.send({
      to: env.OWNER_EMAIL,
      from: { email: env.SENDGRID_FROM_EMAIL ?? 'hello@embedo.io', name: 'Embedo' },
      subject: `Agent update · ${emailsSent} sent · ${replies} ${replies === 1 ? 'reply' : 'replies'} · ${opens} ${opens === 1 ? 'open' : 'opens'}`,
      html,
    });

    log.info({ emailsSent, opens, replies, bounces, samples: sampleEmails.length }, 'Agent update sent');
  } catch (err) {
    log.error({ err }, 'Agent update failed');
  }
}
