"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiGatewayEnvSchema = exports.prospectorEnvSchema = exports.crmEnvSchema = exports.proposalEnvSchema = exports.websiteGenEnvSchema = exports.socialEnvSchema = exports.surveyEnvSchema = exports.leadEnvSchema = exports.chatbotEnvSchema = exports.voiceEnvSchema = exports.apiEnvSchema = exports.baseEnvSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
// ─── Base env (required by all services) ─────────────────────────────────────
exports.baseEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    DATABASE_URL: zod_1.z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
    REDIS_URL: zod_1.z.string().optional(),
    UPSTASH_REDIS_URL: zod_1.z.string().optional(),
});
// ─── API Gateway env ──────────────────────────────────────────────────────────
exports.apiEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3000),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:3010,http://localhost:3011'),
});
// ─── Voice Agent env ──────────────────────────────────────────────────────────
exports.voiceEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3002),
    ELEVENLABS_API_KEY: zod_1.z.string().optional(),
    ELEVENLABS_WEBHOOK_SECRET: zod_1.z.string().optional(),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_WEBHOOK_SECRET: zod_1.z.string().optional(),
    BASE_URL: zod_1.z.string().url().optional(),
});
// ─── Chatbot Agent env ────────────────────────────────────────────────────────
exports.chatbotEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3003),
    ANTHROPIC_API_KEY: zod_1.z.string().min(1, 'ANTHROPIC_API_KEY is required'),
    CHATBOT_API_URL: zod_1.z.string().url().default('http://localhost:3003'),
});
// ─── Lead Engine env ──────────────────────────────────────────────────────────
exports.leadEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3004),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_FROM_NUMBER: zod_1.z.string().optional(),
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    SENDGRID_FROM_EMAIL: zod_1.z.string().optional(),
    SENDGRID_FROM_NAME: zod_1.z.string().default('Embedo'),
});
// ─── Survey Engine env ────────────────────────────────────────────────────────
exports.surveyEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3005),
    SURVEY_BASE_URL: zod_1.z.string().url().default('http://localhost:3010/survey'),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_FROM_NUMBER: zod_1.z.string().optional(),
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    SENDGRID_FROM_EMAIL: zod_1.z.string().optional(),
});
// ─── Social Media env ─────────────────────────────────────────────────────────
exports.socialEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3006),
    ANTHROPIC_API_KEY: zod_1.z.string().min(1, 'ANTHROPIC_API_KEY is required'),
    FACEBOOK_APP_ID: zod_1.z.string().optional(),
    FACEBOOK_APP_SECRET: zod_1.z.string().optional(),
    INSTAGRAM_WEBHOOK_SECRET: zod_1.z.string().optional(),
    REPLICATE_API_TOKEN: zod_1.z.string().optional(),
});
// ─── Website Gen env ──────────────────────────────────────────────────────────
exports.websiteGenEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3007),
    VERCEL_API_TOKEN: zod_1.z.string().optional(),
    VERCEL_TEAM_ID: zod_1.z.string().optional(),
    ANTHROPIC_API_KEY: zod_1.z.string().min(1, 'ANTHROPIC_API_KEY is required'),
});
// ─── Proposal Engine env ──────────────────────────────────────────────────────
exports.proposalEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3008),
    ANTHROPIC_API_KEY: zod_1.z.string().min(1, 'ANTHROPIC_API_KEY is required'),
    PROPOSAL_BASE_URL: zod_1.z.string().url().default('http://localhost:3010/proposal'),
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    SENDGRID_FROM_EMAIL: zod_1.z.string().optional(),
    OWNER_EMAIL: zod_1.z.string().email().optional(),
    EMBEDO_BUSINESS_ID: zod_1.z.string().optional(),
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
});
// ─── CRM Core env ─────────────────────────────────────────────────────────────
exports.crmEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3001),
    CALENDLY_CLIENT_ID: zod_1.z.string().optional(),
    CALENDLY_CLIENT_SECRET: zod_1.z.string().optional(),
    CALENDLY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    INTERNAL_NOTIFICATION_EMAIL: zod_1.z.string().email().optional(),
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    SENDGRID_FROM_EMAIL: zod_1.z.string().optional(),
});
// ─── Prospector env ───────────────────────────────────────────────────────────
exports.prospectorEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3009),
    GEOAPIFY_API_KEY: zod_1.z.string().optional(),
    BRAVE_SEARCH_API_KEY: zod_1.z.string().optional(),
    HUNTER_API_KEY: zod_1.z.string().optional(), // Hunter.io — $49/mo Starter, 2k credits. Drop in key to enable email enrichment.
    ANTHROPIC_API_KEY: zod_1.z.string().optional(), // Claude AI — enables per-prospect email personalization at send time.
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    SENDGRID_FROM_EMAIL: zod_1.z.string().optional(),
    REPLY_TRACKING_EMAIL: zod_1.z.string().email().optional(),
    OWNER_EMAIL: zod_1.z.string().email().optional(),
    OWNER_PHONE: zod_1.z.string().optional(),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_FROM_NUMBER: zod_1.z.string().optional(),
    API_BASE_URL: zod_1.z.string().url().default('http://localhost:3000'),
});
// ─── API Gateway env (extended) ───────────────────────────────────────────────
exports.apiGatewayEnvSchema = exports.baseEnvSchema.extend({
    PORT: zod_1.z.coerce.number().default(3000),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:3010,http://localhost:3011'),
    EMBEDO_BUSINESS_ID: zod_1.z.string().optional(),
    OWNER_PHONE: zod_1.z.string().optional(),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_FROM_NUMBER: zod_1.z.string().optional(),
});
/**
 * Validate env vars at service startup. Throws on missing/invalid values.
 */
function validateEnv(schema) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
        console.error('Invalid environment variables:');
        for (const issue of result.error.issues) {
            console.error(`  ${issue.path.join('.')}: ${issue.message}`);
        }
        process.exit(1);
    }
    return result.data;
}
//# sourceMappingURL=env.schema.js.map