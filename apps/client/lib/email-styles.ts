// 5 email template styles — color and logo are configurable per use

export interface EmailStyleOptions {
  color?: string;        // hex color, e.g. '#4f46e5'
  logoUrl?: string;      // optional logo image URL
  businessName?: string;
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

function logoBlock(opts: EmailStyleOptions) {
  if (!opts.logoUrl) return '';
  return `<img src="${opts.logoUrl}" alt="${opts.businessName ?? ''}" style="max-height: 40px; max-width: 160px; display: block;" />`;
}

export const EMAIL_STYLES: EmailStyle[] = [
  {
    id: 'plain',
    name: 'Plain Text',
    description: 'No styling — clean text only',
    wrap: (content, _opts) => {
      return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; color: #222; line-height: 1.7; font-size: 14px; padding: 20px;">${content}${unsub()}</div>`;
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Professional and clean',
    wrap: (content, opts) => {
      return `<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px; padding: 20px 0;">${opts.logoUrl ? `<div style="margin-bottom: 20px;">${logoBlock(opts)}</div>` : ''}${content}${unsub()}</div>`;
    },
  },
  {
    id: 'modern-card',
    name: 'Modern Card',
    description: 'Centered card with shadow',
    wrap: (content, opts) => {
      return `<div style="background-color: #f4f4f7; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  ${opts.logoUrl ? `<div style="text-align: center; margin-bottom: 24px;">${logoBlock(opts).replace('display: block', 'display: inline-block')}</div>` : ''}
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 36px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="color: #1a1a1a; line-height: 1.7; font-size: 15px;">${content}</div>
  </div>
  <div style="text-align: center; margin-top: 24px;">${unsub()}</div>
</div>`;
    },
  },
  {
    id: 'branded',
    name: 'Branded Header',
    description: 'Color header with logo or name',
    wrap: (content, opts) => {
      const c = opts.color ?? '#4f46e5';
      const headerContent = opts.logoUrl
        ? logoBlock({ ...opts }).replace('display: block', 'display: inline-block').replace(/max-height: 40px/, 'max-height: 36px; filter: brightness(0) invert(1)')
        : `<span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">${opts.businessName ?? 'Your Business'}</span>`;
      return `<div style="background-color: #f8f8fc; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: ${c}; padding: 24px 32px; text-align: center;">
    ${headerContent}
  </div>
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; padding: 32px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
    <div style="color: #1a1a1a; line-height: 1.7; font-size: 15px;">${content}</div>
  </div>
  <div style="max-width: 520px; margin: 0 auto; background: #fafafa; padding: 20px 32px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
    ${unsub()}
  </div>
</div>`;
    },
  },
  {
    id: 'minimal-border',
    name: 'Accent Border',
    description: 'Left color border — editorial feel',
    wrap: (content, opts) => {
      const c = opts.color ?? '#4f46e5';
      return `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; padding: 24px 0;">
  ${opts.logoUrl ? `<div style="margin-bottom: 20px; padding-left: 27px;">${logoBlock(opts)}</div>` : ''}
  <div style="border-left: 3px solid ${c}; padding-left: 24px; color: #2d2d2d; line-height: 1.8; font-size: 15px;">
    ${content}
  </div>
  <div style="padding-left: 27px; margin-top: 24px;">
    ${unsub()}
  </div>
</div>`;
    },
  },
];

export function getStyleById(id: string): EmailStyle {
  return EMAIL_STYLES.find((s) => s.id === id) ?? EMAIL_STYLES[1];
}

/** Color presets for the color picker */
export const COLOR_PRESETS = [
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Black', hex: '#18181b' },
];
