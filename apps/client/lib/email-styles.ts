// Email template styles — color, logo, and font are configurable

export interface EmailStyleOptions {
  color?: string;
  logoUrl?: string;
  businessName?: string;
  font?: string;
}

export interface EmailStyle {
  id: string;
  name: string;
  description: string;
  wrap: (content: string, opts: EmailStyleOptions) => string;
}

function unsub() {
  return `<p style="margin-top: 32px; font-size: 11px; color: #bbb; text-align: center;"><a href="#" style="color: #bbb;">Unsubscribe</a></p>`;
}

function logoBlock(opts: EmailStyleOptions, invert = false) {
  if (!opts.logoUrl) return '';
  const filter = invert ? ' filter: brightness(0) invert(1);' : '';
  return `<img src="${opts.logoUrl}" alt="${opts.businessName ?? ''}" style="max-height: 40px; max-width: 160px; display: inline-block;${filter}" />`;
}

function ff(opts: EmailStyleOptions) {
  return opts.font ?? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
}

export const EMAIL_STYLES: EmailStyle[] = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'Simple and readable',
    wrap: (content, opts) => {
      return `<div style="font-family: ${ff(opts)}; max-width: 560px; color: #1a1a1a; line-height: 1.7; font-size: 15px; padding: 24px 0;">
  ${opts.logoUrl ? `<div style="margin-bottom: 20px;">${logoBlock(opts)}</div>` : ''}
  ${content}
  ${unsub()}
</div>`;
    },
  },
  {
    id: 'card',
    name: 'Card',
    description: 'Floating card on soft background',
    wrap: (content, opts) => {
      const c = opts.color ?? '#4f46e5';
      return `<div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #f0f9ff 100%); padding: 48px 20px; font-family: ${ff(opts)};">
  ${opts.logoUrl ? `<div style="text-align: center; margin-bottom: 28px;">${logoBlock(opts)}</div>` : ''}
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px 36px; box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);">
    <div style="color: #1a1a1a; line-height: 1.7; font-size: 15px;">${content}</div>
  </div>
  <div style="text-align: center; margin-top: 16px;">
    <a href="#" style="color: ${c}; font-size: 12px; text-decoration: none; font-family: ${ff(opts)};">Powered by your business</a>
  </div>
  <div style="text-align: center;">${unsub()}</div>
</div>`;
    },
  },
  {
    id: 'hero',
    name: 'Hero Banner',
    description: 'Bold color header with CTA area',
    wrap: (content, opts) => {
      const c = opts.color ?? '#4f46e5';
      const headerContent = opts.logoUrl
        ? logoBlock(opts, true)
        : `<span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${opts.businessName ?? 'Your Business'}</span>`;
      return `<div style="font-family: ${ff(opts)}; background-color: #ffffff; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, ${c} 0%, ${adjustColor(c, -30)} 100%); padding: 36px 32px; text-align: center; border-radius: 0 0 24px 24px;">
    ${headerContent}
    <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 8px 0 0; font-weight: 500;">Special message for you</p>
  </div>
  <div style="padding: 32px; color: #1a1a1a; line-height: 1.7; font-size: 15px;">
    ${content}
  </div>
  <div style="padding: 0 32px 24px; text-align: center;">
    <div style="border-top: 1px solid #f0f0f0; padding-top: 20px;">
      ${unsub()}
    </div>
  </div>
</div>`;
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Sleek dark background',
    wrap: (content, opts) => {
      const c = opts.color ?? '#818cf8';
      return `<div style="background-color: #0f172a; padding: 40px 20px; font-family: ${ff(opts)};">
  <div style="max-width: 520px; margin: 0 auto;">
    ${opts.logoUrl ? `<div style="text-align: center; margin-bottom: 28px;">${logoBlock(opts, true)}</div>` : ''}
    <div style="background: linear-gradient(180deg, #1e293b 0%, #1a2332 100%); border-radius: 16px; padding: 36px 32px; border: 1px solid rgba(255,255,255,0.06);">
      <div style="color: #e2e8f0; line-height: 1.7; font-size: 15px;">
        ${content.replace(/color:\s*#1a1a1a/g, 'color: #e2e8f0').replace(/color:\s*#222/g, 'color: #e2e8f0')}
      </div>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <a href="#" style="color: ${c}; font-size: 12px; text-decoration: none;">Powered by your business</a>
    </div>
    <div style="text-align: center;">${unsub().replace(/#bbb/g, '#475569')}</div>
  </div>
</div>`;
    },
  },
];

/** Darken or lighten a hex color */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function getStyleById(id: string): EmailStyle {
  return EMAIL_STYLES.find((s) => s.id === id) ?? EMAIL_STYLES[0];
}

export const COLOR_PRESETS = [
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Black', hex: '#18181b' },
];

export const FONT_OPTIONS = [
  { id: 'system', label: 'System Default', value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { id: 'arial', label: 'Arial', value: "Arial, Helvetica, sans-serif" },
  { id: 'georgia', label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { id: 'verdana', label: 'Verdana', value: "Verdana, Geneva, sans-serif" },
  { id: 'trebuchet', label: 'Trebuchet', value: "'Trebuchet MS', sans-serif" },
  { id: 'courier', label: 'Courier', value: "'Courier New', Courier, monospace" },
];

/** Tracked attachment that can be added/removed from an email */
export interface EmailAttachment {
  id: string;
  type: 'spin_wheel' | 'survey' | 'discount' | 'image' | 'cta';
  label: string;
  url: string;
  buttonText?: string;
}

/** Build combined HTML for all attachments */
export function buildAttachmentsHtml(attachments: EmailAttachment[], opts: EmailStyleOptions): string {
  if (attachments.length === 0) return '';
  return attachments.map((att) => {
    if (att.type === 'image') return buildImageHtml(att.url);
    if (att.type === 'cta') return buildCtaHtml(att.label, att.url, opts);
    return buildEmbedHtml({ type: att.type, label: att.label, url: att.url, buttonText: att.buttonText ?? 'Click Here' }, opts);
  }).join('\n');
}

/** Generate a CTA button block */
export function buildCtaHtml(text: string, url: string, opts: EmailStyleOptions): string {
  const c = opts.color ?? '#4f46e5';
  return `<div style="margin: 24px 0; text-align: center;">
  <a href="${url}" style="display: inline-block; background: ${c}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; font-family: ${ff(opts)};">${text}</a>
</div>`;
}

/** Generate an embed block for a QR code / spin wheel / survey / discount */
export interface EmbedBlock {
  type: 'spin_wheel' | 'survey' | 'discount';
  label: string;
  url: string;
  buttonText: string;
  imageUrl?: string;
}

export function buildEmbedHtml(embed: EmbedBlock, opts: EmailStyleOptions): string {
  const c = opts.color ?? '#4f46e5';
  const font = ff(opts);

  if (embed.type === 'spin_wheel') {
    return `<div style="margin: 24px 0; padding: 24px; background: linear-gradient(135deg, ${c}10, ${c}20); border-radius: 16px; text-align: center; font-family: ${font};">
  <div style="font-size: 32px; margin-bottom: 8px;">🎰</div>
  <p style="font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px;">Spin to Win!</p>
  <p style="font-size: 13px; color: #666; margin: 0 0 16px;">${embed.label}</p>
  <a href="${embed.url}" style="display: inline-block; background: ${c}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">${embed.buttonText}</a>
</div>`;
  }

  if (embed.type === 'survey') {
    return `<div style="margin: 24px 0; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center; font-family: ${font};">
  <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
  <p style="font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px;">We'd Love Your Feedback</p>
  <p style="font-size: 13px; color: #666; margin: 0 0 16px;">${embed.label}</p>
  <a href="${embed.url}" style="display: inline-block; background: ${c}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700;">${embed.buttonText}</a>
</div>`;
  }

  // discount
  return `<div style="margin: 24px 0; padding: 24px; background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px dashed #f59e0b; border-radius: 16px; text-align: center; font-family: ${font};">
  <div style="font-size: 32px; margin-bottom: 8px;">🎁</div>
  <p style="font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px;">Exclusive Offer</p>
  <p style="font-size: 13px; color: #666; margin: 0 0 16px;">${embed.label}</p>
  <a href="${embed.url}" style="display: inline-block; background: ${c}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700;">${embed.buttonText}</a>
</div>`;
}

export function buildImageHtml(imageUrl: string): string {
  return `<div style="margin: 20px 0; text-align: center;">
  <img src="${imageUrl}" alt="" style="max-width: 100%; height: auto; border-radius: 12px; display: inline-block;" />
</div>`;
}
