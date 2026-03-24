// Shared billing tier data used by both the main billing page and the compare page

export const TIER_KEYS = ['FREE', 'SOLO', 'SMALL', 'MEDIUM', 'LARGE'] as const;
export type TierKey = (typeof TIER_KEYS)[number];

export interface TierInfo {
  name: string;
  price: number;
  desc: string;
  popular?: boolean;
  highlights: string[];
}

export const TIERS: Record<TierKey, TierInfo> = {
  FREE: {
    name: 'Free',
    price: 0,
    desc: 'Get started for free',
    highlights: [
      '50 contacts',
      '1 chatbot widget',
      '3 QR codes',
      'Basic dashboard',
      'Lead capture',
    ],
  },
  SOLO: {
    name: 'Solo',
    price: 249.99,
    desc: 'For solo operators',
    highlights: [
      '500 contacts',
      'AI Voice Agent + phone number',
      'Custom website',
      '10 QR codes & 5 surveys',
      '100 emails/mo',
      '50 AI images/mo',
    ],
  },
  SMALL: {
    name: 'Small',
    price: 399.99,
    desc: 'For small teams',
    popular: true,
    highlights: [
      '2,000 contacts',
      '3 chatbot widgets',
      'Social media automation',
      'Email sequences',
      'Unlimited surveys',
      '1,000 emails/mo',
    ],
  },
  MEDIUM: {
    name: 'Medium',
    price: 549.99,
    desc: 'For growing businesses',
    highlights: [
      '10,000 contacts',
      '10 chatbot widgets',
      '3 phone numbers',
      '100 social posts/mo',
      'Unlimited email sequences',
      'Priority support',
    ],
  },
  LARGE: {
    name: 'Large',
    price: 999.99,
    desc: 'For enterprises',
    highlights: [
      'Unlimited everything',
      '10 phone numbers',
      'White-label branding',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations',
    ],
  },
};

// ─── Full feature comparison matrix ─────────────────────────────────────────────
export type FeatureValue = boolean | string;

export interface FeatureRow {
  label: string;
  category: string;
  values: Record<TierKey, FeatureValue>;
}

export const FEATURES: FeatureRow[] = [
  // AI Tools
  { label: 'AI Chatbot Widget',        category: 'AI Tools',     values: { FREE: '1 widget',  SOLO: '1 widget',   SMALL: '3 widgets',    MEDIUM: '10 widgets',   LARGE: 'Unlimited' } },
  { label: 'AI Voice Agent',           category: 'AI Tools',     values: { FREE: false,        SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'Dedicated Phone Number',   category: 'AI Tools',     values: { FREE: false,        SOLO: '1 number',   SMALL: '1 number',     MEDIUM: '3 numbers',    LARGE: '10 numbers' } },
  { label: 'AI Image Generation',      category: 'AI Tools',     values: { FREE: '5/mo',      SOLO: '50/mo',      SMALL: '200/mo',       MEDIUM: '500/mo',       LARGE: 'Unlimited' } },
  // Website & QR
  { label: 'Custom Website',           category: 'Website & QR', values: { FREE: false,        SOLO: '1 site',     SMALL: '3 sites',      MEDIUM: '5 sites',      LARGE: 'Unlimited' } },
  { label: 'QR Code Tools',            category: 'Website & QR', values: { FREE: '3 codes',    SOLO: '10 codes',   SMALL: '50 codes',     MEDIUM: '200 codes',    LARGE: 'Unlimited' } },
  { label: 'Spin-to-Win / Discounts',  category: 'Website & QR', values: { FREE: true,         SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'Surveys',                  category: 'Website & QR', values: { FREE: '1 survey',   SOLO: '5 surveys',  SMALL: 'Unlimited',    MEDIUM: 'Unlimited',    LARGE: 'Unlimited' } },
  // Marketing
  { label: 'Social Media Automation',  category: 'Marketing',    values: { FREE: false,        SOLO: false,        SMALL: '30 posts/mo',  MEDIUM: '100 posts/mo', LARGE: 'Unlimited' } },
  { label: 'Email Campaigns',          category: 'Marketing',    values: { FREE: false,        SOLO: '100/mo',     SMALL: '1,000/mo',     MEDIUM: '10,000/mo',    LARGE: 'Unlimited' } },
  { label: 'Email Sequences',          category: 'Marketing',    values: { FREE: false,        SOLO: false,        SMALL: '5 sequences',  MEDIUM: 'Unlimited',    LARGE: 'Unlimited' } },
  { label: 'Reward Emails',            category: 'Marketing',    values: { FREE: '10/mo',      SOLO: '100/mo',     SMALL: '500/mo',       MEDIUM: '5,000/mo',     LARGE: 'Unlimited' } },
  // CRM
  { label: 'Contacts',                 category: 'CRM',          values: { FREE: '50',         SOLO: '500',        SMALL: '2,000',        MEDIUM: '10,000',       LARGE: 'Unlimited' } },
  { label: 'Lead Capture',             category: 'CRM',          values: { FREE: true,         SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'Contact Activity History', category: 'CRM',          values: { FREE: '30 days',    SOLO: '90 days',    SMALL: '1 year',       MEDIUM: 'Unlimited',    LARGE: 'Unlimited' } },
  // Platform
  { label: 'Image Library Storage',    category: 'Platform',     values: { FREE: '50 images',  SOLO: '500 images', SMALL: '2,000 images', MEDIUM: '10,000 images', LARGE: 'Unlimited' } },
  { label: 'Custom Branding',          category: 'Platform',     values: { FREE: false,        SOLO: true,         SMALL: true,           MEDIUM: true,           LARGE: true } },
  { label: 'White-label',              category: 'Platform',     values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: false,          LARGE: true } },
  { label: 'Priority Support',         category: 'Platform',     values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: true,           LARGE: true } },
  { label: 'Dedicated Account Manager',category: 'Platform',     values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: false,          LARGE: true } },
  { label: 'SLA Guarantee',            category: 'Platform',     values: { FREE: false,        SOLO: false,        SMALL: false,          MEDIUM: false,          LARGE: true } },
];

export const CATEGORIES = [...new Set(FEATURES.map((f) => f.category))];

// ─── Plan limits (used for enforcement across the app) ──────────────────────
export const PLAN_LIMITS: Record<TierKey, {
  websites: number;       // 0 = not available, Infinity = unlimited
  voiceAgents: number;
  chatbots: number;
  contacts: number;
  qrCodes: number;
  emailsPerMonth: number;
  imagesPerMonth: number;
}> = {
  FREE:   { websites: 0,        voiceAgents: 0,  chatbots: 1,         contacts: 50,       qrCodes: 3,   emailsPerMonth: 0,     imagesPerMonth: 5 },
  SOLO:   { websites: 1,        voiceAgents: 1,  chatbots: 1,         contacts: 500,      qrCodes: 10,  emailsPerMonth: 100,   imagesPerMonth: 50 },
  SMALL:  { websites: 3,        voiceAgents: 1,  chatbots: 3,         contacts: 2000,     qrCodes: 50,  emailsPerMonth: 1000,  imagesPerMonth: 200 },
  MEDIUM: { websites: 5,        voiceAgents: 3,  chatbots: 10,        contacts: 10000,    qrCodes: 200, emailsPerMonth: 10000, imagesPerMonth: 500 },
  LARGE:  { websites: Infinity, voiceAgents: 10, chatbots: Infinity,  contacts: Infinity, qrCodes: Infinity, emailsPerMonth: Infinity, imagesPerMonth: Infinity },
};
