import sgMail from '@sendgrid/mail';
import { db } from '@embedo/db';
import { createLogger } from '@embedo/utils';
import { env } from '../config.js';

const log = createLogger('prospector:digest');

/**
 * Generate and send a daily digest email summarizing campaign activity
 * from the last 24 hours. Called by a setInterval cron in index.ts.
 */
export async function sendDailyDigest(): Promise<void> {
  if (!env.SENDGRID_API_KEY || !env.OWNER_EMAIL) {
    log.debug('Digest skipped — SENDGRID_API_KEY or OWNER_EMAIL not set');
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Gather stats from last 24h
    const [newProspects, emailsSent, opens, replies, bounces] = await Promise.all([
      db.prospectBusiness.count({ where: { createdAt: { gte: since } } }),
      db.outreachMessage.count({ where: { sentAt: { gte: since }, status: { in: ['SENT', 'OPENED', 'REPLIED'] } } }),
      db.outreachMessage.count({ where: { openedAt: { gte: since } } }),
      db.outreachMessage.count({ where: { repliedAt: { gte: since } } }),
      db.outreachMessage.count({ where: { sentAt: { gte: since }, status: 'BOUNCED' } }),
    ]);

    // Get recent replies with details
    const recentReplies = await db.outreachMessage.findMany({
      where: { repliedAt: { gte: since }, status: 'REPLIED' },
      include: { prospect: { select: { name: true, email: true } } },
      orderBy: { repliedAt: 'desc' },
      take: 10,
    });

    // Get active campaigns with activity
    const activeCampaigns = await db.outboundCampaign.findMany({
      where: { active: true },
      include: { _count: { select: { prospects: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Skip if nothing happened
    if (newProspects === 0 && emailsSent === 0 && opens === 0 && replies === 0) {
      log.debug('Digest skipped — no activity in last 24h');
      return;
    }

    const openRate = emailsSent > 0 ? Math.round((opens / emailsSent) * 100) : 0;
    const replyRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0;

    // Build email HTML
    const repliesSection = recentReplies.length > 0
      ? `<h3 style="margin: 24px 0 12px; font-size: 14px; color: #333;">Recent Replies</h3>
         <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
           ${recentReplies.map((r) => `
             <tr style="border-bottom: 1px solid #eee;">
               <td style="padding: 8px 0; font-weight: 600; color: #222;">${r.prospect.name}</td>
               <td style="padding: 8px 0; color: #666;">${r.prospect.email ?? ''}</td>
               <td style="padding: 8px 0; color: #999; font-size: 12px;">${r.repliedAt ? new Date(r.repliedAt).toLocaleString() : ''}</td>
             </tr>
           `).join('')}
         </table>`
      : '';

    const campaignsSection = activeCampaigns.length > 0
      ? `<h3 style="margin: 24px 0 12px; font-size: 14px; color: #333;">Active Campaigns</h3>
         <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
           ${activeCampaigns.map((c) => `
             <tr style="border-bottom: 1px solid #eee;">
               <td style="padding: 8px 0; font-weight: 600; color: #222;">${c.name}</td>
               <td style="padding: 8px 0; color: #666;">${c.targetCity}</td>
               <td style="padding: 8px 0; color: #999;">${c._count.prospects} prospects</td>
             </tr>
           `).join('')}
         </table>`
      : '';

    const html = `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; color: #222; line-height: 1.6; font-size: 14px;">
  <h2 style="margin: 0 0 20px; font-size: 18px; color: #111;">Daily Outreach Digest</h2>
  <p style="color: #666; margin: 0 0 24px; font-size: 13px;">Last 24 hours — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center; width: 20%;">
        <div style="font-size: 24px; font-weight: 700; color: #111;">${newProspects}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">New Prospects</div>
      </td>
      <td style="width: 8px;"></td>
      <td style="padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center; width: 20%;">
        <div style="font-size: 24px; font-weight: 700; color: #111;">${emailsSent}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">Emails Sent</div>
      </td>
      <td style="width: 8px;"></td>
      <td style="padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center; width: 20%;">
        <div style="font-size: 24px; font-weight: 700; color: ${openRate >= 20 ? '#16a34a' : openRate >= 10 ? '#ca8a04' : '#dc2626'};">${opens}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">Opens (${openRate}%)</div>
      </td>
      <td style="width: 8px;"></td>
      <td style="padding: 16px; background: #f8f9fa; border-radius: 8px; text-align: center; width: 20%;">
        <div style="font-size: 24px; font-weight: 700; color: ${replies > 0 ? '#16a34a' : '#111'};">${replies}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">Replies (${replyRate}%)</div>
      </td>
      <td style="width: 8px;"></td>
      <td style="padding: 16px; background: ${bounces > 0 ? '#fef2f2' : '#f8f9fa'}; border-radius: 8px; text-align: center; width: 20%;">
        <div style="font-size: 24px; font-weight: 700; color: ${bounces > 0 ? '#dc2626' : '#111'};">${bounces}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">Bounces</div>
      </td>
    </tr>
  </table>

  ${repliesSection}
  ${campaignsSection}

  <p style="margin-top: 32px; font-size: 11px; color: #bbb;">Sent automatically by Embedo Prospector</p>
</div>`;

    sgMail.setApiKey(env.SENDGRID_API_KEY);
    await sgMail.send({
      to: env.OWNER_EMAIL,
      from: { email: env.SENDGRID_FROM_EMAIL ?? 'hello@embedo.io', name: 'Embedo Digest' },
      subject: `Outreach Digest: ${replies} replies, ${opens} opens, ${emailsSent} sent`,
      html,
    });

    log.info({ newProspects, emailsSent, opens, replies, bounces }, 'Daily digest sent');
  } catch (err) {
    log.error({ err }, 'Daily digest failed');
  }
}
