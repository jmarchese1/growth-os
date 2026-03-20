import { z } from 'zod';

// ─── Base env (required by all services) ─────────────────────────────────────
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_URL: z.string().optional(),
});

// ─── API Gateway env ──────────────────────────────────────────────────────────
export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3010,http://localhost:3011,http://localhost:3012'),
});

// ─── Voice Agent env ──────────────────────────────────────────────────────────
export const voiceEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3002),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WEBHOOK_SECRET: z.string().optional(),
  BASE_URL: z.string().url().optional(),
});

// ─── Chatbot Agent env ────────────────────────────────────────────────────────
export const chatbotEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3003),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CHATBOT_API_URL: z.string().url().default('http://localhost:3003'),
});

// ─── Lead Engine env ──────────────────────────────────────────────────────────
export const leadEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3004),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
  SENDGRID_FROM_NAME: z.string().default('Embedo'),
});

// ─── Survey Engine env ────────────────────────────────────────────────────────
export const surveyEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3005),
  SURVEY_BASE_URL: z.string().url().default('http://localhost:3010/survey'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
});

// ─── Social Media env ─────────────────────────────────────────────────────────
export const socialEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3006),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  INSTAGRAM_WEBHOOK_SECRET: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
});

// ─── Website Gen env ──────────────────────────────────────────────────────────
export const websiteGenEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3007),
  VERCEL_API_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  OPENAI_API_KEY: z.string().optional(),
  PEXELS_API_KEY: z.string().optional(),
  WEBSITE_GEN_URL: z.string().optional(),
  CHATBOT_API_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

// ─── Proposal Engine env ──────────────────────────────────────────────────────
export const proposalEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3008),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  PROPOSAL_BASE_URL: z.string().url().default('http://localhost:3010/proposal'),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
  OWNER_EMAIL: z.string().email().optional(),
  EMBEDO_BUSINESS_ID: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

// ─── CRM Core env ─────────────────────────────────────────────────────────────
export const crmEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3001),
  CALENDLY_CLIENT_ID: z.string().optional(),
  CALENDLY_CLIENT_SECRET: z.string().optional(),
  CALENDLY_WEBHOOK_SECRET: z.string().optional(),
  INTERNAL_NOTIFICATION_EMAIL: z.string().email().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
});

// ─── Prospector env ───────────────────────────────────────────────────────────
export const prospectorEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3009),
  GEOAPIFY_API_KEY: z.string().optional(),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  APOLLO_API_KEY: z.string().optional(), // Apollo.io — $49/mo Basic, 10k credits. Much better SMB/restaurant coverage than Hunter.
  HUNTER_API_KEY: z.string().optional(), // Hunter.io — $49/mo Starter, 2k credits. Domain-based email finder, great for restaurant websites.
  ANTHROPIC_API_KEY: z.string().optional(), // Claude AI — enables per-prospect email personalization at send time.
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),
  REPLY_TRACKING_EMAIL: z.string().email().optional(),
  OWNER_EMAIL: z.string().email().optional(),
  OWNER_PHONE: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
});

// ─── API Gateway env (extended) ───────────────────────────────────────────────
export const apiGatewayEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3010,http://localhost:3011,http://localhost:3012'),
  EMBEDO_BUSINESS_ID: z.string().optional(),
  OWNER_PHONE: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  // OAuth — Social platform credentials
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  CLIENT_APP_URL: z.string().url().default('http://localhost:3012'),
  // Stripe — Billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_SOLO: z.string().optional(),
  STRIPE_PRICE_SMALL: z.string().optional(),
  STRIPE_PRICE_MEDIUM: z.string().optional(),
  STRIPE_PRICE_LARGE: z.string().optional(),
});

/**
 * Validate env vars at service startup. Throws on missing/invalid values.
 */
export function validateEnv<T extends z.ZodSchema>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data as z.infer<T>;
}
