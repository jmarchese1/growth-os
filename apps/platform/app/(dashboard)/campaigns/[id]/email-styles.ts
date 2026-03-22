// 5 email template styles for campaign emails
// Each wraps the email content in a different visual layout

export interface EmailStyle {
  id: string;
  name: string;
  description: string;
  preview: string; // short visual hint
  wrap: (content: string, signature: string) => string;
}

const SIGNATURE = `<table style="margin-top: 28px; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0"><tr><td style="padding-right: 12px; vertical-align: middle; width: 56px;"><img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" /></td><td style="vertical-align: middle;"><p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p><p style="margin: 2px 0 0; font-size: 13px; color: #666;">Data Scientist · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p></td></tr></table>`;

const UNSUBSCRIBE = `<p style="margin-top: 32px; font-size: 11px; color: #bbb;"><a href="mailto:{{replyEmail}}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a></p>`;

export const EMAIL_STYLES: EmailStyle[] = [
  {
    id: 'plain',
    name: 'Plain Text',
    description: 'No HTML styling — just clean text',
    preview: 'Aa',
    wrap: (content, _sig) => {
      return `<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; color: #222; line-height: 1.7; font-size: 14px; padding: 20px;">${content}${UNSUBSCRIBE}</div>`;
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean and professional with signature',
    preview: 'Cl',
    wrap: (content, _sig) => {
      return `<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px;">${content}${SIGNATURE}${UNSUBSCRIBE}</div>`;
    },
  },
  {
    id: 'modern-card',
    name: 'Modern Card',
    description: 'Centered card with subtle shadow',
    preview: 'Mc',
    wrap: (content, _sig) => {
      return `<div style="background-color: #f4f4f7; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 36px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="color: #1a1a1a; line-height: 1.7; font-size: 15px;">${content}</div>
    ${SIGNATURE}
  </div>
  <div style="text-align: center; margin-top: 24px;">${UNSUBSCRIBE}</div>
</div>`;
    },
  },
  {
    id: 'branded',
    name: 'Branded',
    description: 'Purple header with embedo branding',
    preview: 'Br',
    wrap: (content, _sig) => {
      return `<div style="background-color: #f8f7ff; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px 32px; text-align: center;">
    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">embedo</span>
  </div>
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; padding: 32px; border-left: 1px solid #e8e5f0; border-right: 1px solid #e8e5f0;">
    <div style="color: #1a1a1a; line-height: 1.7; font-size: 15px;">${content}</div>
    ${SIGNATURE}
  </div>
  <div style="max-width: 520px; margin: 0 auto; background: #faf9ff; padding: 20px 32px; border: 1px solid #e8e5f0; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
    ${UNSUBSCRIBE}
  </div>
</div>`;
    },
  },
  {
    id: 'minimal-border',
    name: 'Minimal Border',
    description: 'Left accent border — editorial style',
    preview: 'Mb',
    wrap: (content, _sig) => {
      return `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; padding: 24px 0;">
  <div style="border-left: 3px solid #4f46e5; padding-left: 24px; color: #2d2d2d; line-height: 1.8; font-size: 15px;">
    ${content}
  </div>
  <div style="padding-left: 27px; margin-top: 24px;">
    ${SIGNATURE}
    ${UNSUBSCRIBE}
  </div>
</div>`;
    },
  },
];

export function getStyleById(id: string): EmailStyle {
  return EMAIL_STYLES.find((s) => s.id === id) ?? EMAIL_STYLES[1]; // default to classic
}
