import sgMail from '@sendgrid/mail';
import { createLogger } from '@embedo/utils';

const log = createLogger('api:reward-email');

interface RewardEmailParams {
  to: string;
  recipientName?: string | undefined;
  businessName: string;
  // Reward details
  rewardTitle: string;       // e.g. "10% Off", "Free Dessert"
  rewardType: 'spin_prize' | 'discount' | 'survey_reward' | 'signup';
  discountCode?: string | undefined;
  // Branding
  accentColor?: string | undefined;
  logoUrl?: string | undefined;
  // Custom text overrides (from business settings)
  customSubject?: string | undefined;
  customHeading?: string | undefined;
  customBodyText?: string | undefined;
}

function buildRewardHtml(params: RewardEmailParams): string {
  const accent = params.accentColor || '#7C3AED';
  const name = params.recipientName?.split(' ')[0] || 'there';
  const logo = params.logoUrl;

  const defaultHeadline: Record<string, string> = {
    spin_prize: 'You won a prize!',
    discount: 'Your exclusive discount',
    survey_reward: 'Thanks for your feedback!',
    signup: 'Welcome aboard!',
  };

  const headline = (params.customHeading || defaultHeadline[params.rewardType] || 'Your reward')
    .replace(/\{\{business\}\}/g, params.businessName)
    .replace(/\{\{reward\}\}/g, params.rewardTitle);

  const defaultBody: Record<string, string> = {
    spin_prize: `Congratulations! You spun the wheel at <strong>${params.businessName}</strong> and won:`,
    discount: `Here&rsquo;s your exclusive discount from <strong>${params.businessName}</strong>:`,
    survey_reward: `Thanks for sharing your feedback with <strong>${params.businessName}</strong>! Here&rsquo;s your reward:`,
    signup: `Welcome to <strong>${params.businessName}</strong>! Here&rsquo;s a little something for joining:`,
  };

  const subtext = (params.customBodyText || defaultBody[params.rewardType] || `Here's your reward from <strong>${params.businessName}</strong>:`)
    .replace(/\{\{business\}\}/g, params.businessName)
    .replace(/\{\{reward\}\}/g, params.rewardTitle);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="background:#f4f2ee;padding:40px 20px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6;">

      <!-- Header -->
      <div style="background:${accent};padding:28px 36px;text-align:left;">
        ${logo
          ? `<img src="${logo}" width="40" height="40" alt="${params.businessName}" style="display:inline-block;vertical-align:middle;margin-right:12px;border-radius:8px;" />`
          : ''
        }
        <span style="color:#fff;font-size:20px;font-weight:700;font-family:Georgia,serif;letter-spacing:-0.3px;vertical-align:middle;">${params.businessName}</span>
      </div>

      <!-- Body -->
      <div style="padding:40px 36px;">
        <p style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${accent};margin:0 0 12px;">Your Reward</p>
        <h1 style="font-size:26px;font-weight:700;color:#1a1a1a;margin:0 0 16px;line-height:1.25;font-family:Georgia,serif;">Hey ${name}, ${headline.toLowerCase()}</h1>
        <p style="font-size:15px;color:#555;line-height:1.65;margin:0 0 28px;">${subtext}</p>

        <!-- Reward Card -->
        <div style="background:linear-gradient(135deg, ${accent}, ${accent}dd);border-radius:12px;padding:28px 24px;text-align:center;margin:0 0 28px;">
          <p style="font-size:32px;font-weight:800;color:#fff;margin:0;line-height:1.2;">${params.rewardTitle}</p>
          ${params.discountCode
            ? `<div style="margin-top:16px;background:rgba(255,255,255,0.2);border-radius:8px;padding:10px 16px;display:inline-block;">
                <p style="font-size:11px;color:rgba(255,255,255,0.7);margin:0 0 2px;text-transform:uppercase;letter-spacing:1px;">Discount Code</p>
                <p style="font-size:22px;font-weight:700;color:#fff;margin:0;font-family:'Courier New',monospace;letter-spacing:2px;">${params.discountCode}</p>
              </div>`
            : ''
          }
        </div>

        <p style="font-size:15px;color:#555;line-height:1.65;margin:0 0 0;">Show this email to your server or cashier to redeem your reward.</p>

        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f0ede8;">
          <p style="font-size:13px;color:#999;line-height:1.6;margin:0;">This reward was sent because you interacted with a promotion from ${params.businessName}. If you didn&rsquo;t expect this email, you can safely ignore it.</p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f9f8f6;padding:20px 36px;border-top:1px solid #f0ede8;">
        <p style="font-size:12px;color:#aaa;margin:0;">&copy; ${new Date().getFullYear()} ${params.businessName} &middot; Powered by Embedo</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendRewardEmail(params: RewardEmailParams): Promise<boolean> {
  const apiKey = process.env['SENDGRID_API_KEY'];
  const fromEmail = process.env['SENDGRID_FROM_EMAIL'] ?? 'rewards@embedo.io';

  if (!apiKey) {
    log.warn('SENDGRID_API_KEY not set — skipping reward email');
    return false;
  }

  const defaultSubject: Record<string, string> = {
    spin_prize: `You won ${params.rewardTitle}! 🎉`,
    discount: `Your discount from ${params.businessName}`,
    survey_reward: `Your reward from ${params.businessName}`,
    signup: `Welcome to ${params.businessName}!`,
  };

  const subject = (params.customSubject || defaultSubject[params.rewardType] || `Your reward from ${params.businessName}`)
    .replace(/\{\{business\}\}/g, params.businessName)
    .replace(/\{\{reward\}\}/g, params.rewardTitle);

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: params.to,
      from: { email: fromEmail, name: params.businessName },
      subject,
      html: buildRewardHtml(params),
    });
    log.info({ to: params.to, businessName: params.businessName, rewardType: params.rewardType }, 'Reward email sent');
    return true;
  } catch (err) {
    log.error({ err, to: params.to }, 'Failed to send reward email');
    return false;
  }
}
