import { z } from 'zod';
export declare const baseEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
}, {
    DATABASE_URL: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
}>;
export declare const apiEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    JWT_SECRET: z.ZodString;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    JWT_SECRET: string;
    CORS_ORIGINS: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
}, {
    DATABASE_URL: string;
    JWT_SECRET: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    CORS_ORIGINS?: string | undefined;
}>;
export declare const voiceEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    ELEVENLABS_API_KEY: z.ZodOptional<z.ZodString>;
    ELEVENLABS_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    TWILIO_ACCOUNT_SID: z.ZodOptional<z.ZodString>;
    TWILIO_AUTH_TOKEN: z.ZodOptional<z.ZodString>;
    TWILIO_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    BASE_URL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    ELEVENLABS_API_KEY?: string | undefined;
    ELEVENLABS_WEBHOOK_SECRET?: string | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_WEBHOOK_SECRET?: string | undefined;
    BASE_URL?: string | undefined;
}, {
    DATABASE_URL: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    ELEVENLABS_API_KEY?: string | undefined;
    ELEVENLABS_WEBHOOK_SECRET?: string | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_WEBHOOK_SECRET?: string | undefined;
    BASE_URL?: string | undefined;
}>;
export declare const chatbotEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    ANTHROPIC_API_KEY: z.ZodString;
    CHATBOT_API_URL: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    ANTHROPIC_API_KEY: string;
    CHATBOT_API_URL: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
}, {
    DATABASE_URL: string;
    ANTHROPIC_API_KEY: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    CHATBOT_API_URL?: string | undefined;
}>;
export declare const leadEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    TWILIO_ACCOUNT_SID: z.ZodOptional<z.ZodString>;
    TWILIO_AUTH_TOKEN: z.ZodOptional<z.ZodString>;
    TWILIO_FROM_NUMBER: z.ZodOptional<z.ZodString>;
    SENDGRID_API_KEY: z.ZodOptional<z.ZodString>;
    SENDGRID_FROM_EMAIL: z.ZodOptional<z.ZodString>;
    SENDGRID_FROM_NAME: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    SENDGRID_FROM_NAME: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
}, {
    DATABASE_URL: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    SENDGRID_FROM_NAME?: string | undefined;
}>;
export declare const surveyEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    SURVEY_BASE_URL: z.ZodDefault<z.ZodString>;
    TWILIO_ACCOUNT_SID: z.ZodOptional<z.ZodString>;
    TWILIO_AUTH_TOKEN: z.ZodOptional<z.ZodString>;
    TWILIO_FROM_NUMBER: z.ZodOptional<z.ZodString>;
    SENDGRID_API_KEY: z.ZodOptional<z.ZodString>;
    SENDGRID_FROM_EMAIL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    SURVEY_BASE_URL: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
}, {
    DATABASE_URL: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    SURVEY_BASE_URL?: string | undefined;
}>;
export declare const socialEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    ANTHROPIC_API_KEY: z.ZodString;
    FACEBOOK_APP_ID: z.ZodOptional<z.ZodString>;
    FACEBOOK_APP_SECRET: z.ZodOptional<z.ZodString>;
    INSTAGRAM_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    REPLICATE_API_TOKEN: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    ANTHROPIC_API_KEY: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    FACEBOOK_APP_ID?: string | undefined;
    FACEBOOK_APP_SECRET?: string | undefined;
    INSTAGRAM_WEBHOOK_SECRET?: string | undefined;
    REPLICATE_API_TOKEN?: string | undefined;
}, {
    DATABASE_URL: string;
    ANTHROPIC_API_KEY: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    FACEBOOK_APP_ID?: string | undefined;
    FACEBOOK_APP_SECRET?: string | undefined;
    INSTAGRAM_WEBHOOK_SECRET?: string | undefined;
    REPLICATE_API_TOKEN?: string | undefined;
}>;
export declare const websiteGenEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    VERCEL_API_TOKEN: z.ZodOptional<z.ZodString>;
    VERCEL_TEAM_ID: z.ZodOptional<z.ZodString>;
    ANTHROPIC_API_KEY: z.ZodString;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    ANTHROPIC_API_KEY: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    VERCEL_API_TOKEN?: string | undefined;
    VERCEL_TEAM_ID?: string | undefined;
}, {
    DATABASE_URL: string;
    ANTHROPIC_API_KEY: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    VERCEL_API_TOKEN?: string | undefined;
    VERCEL_TEAM_ID?: string | undefined;
}>;
export declare const proposalEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    ANTHROPIC_API_KEY: z.ZodString;
    PROPOSAL_BASE_URL: z.ZodDefault<z.ZodString>;
    SENDGRID_API_KEY: z.ZodOptional<z.ZodString>;
    SENDGRID_FROM_EMAIL: z.ZodOptional<z.ZodString>;
    OWNER_EMAIL: z.ZodOptional<z.ZodString>;
    EMBEDO_BUSINESS_ID: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    ANTHROPIC_API_KEY: string;
    PROPOSAL_BASE_URL: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    OWNER_EMAIL?: string | undefined;
    EMBEDO_BUSINESS_ID?: string | undefined;
}, {
    DATABASE_URL: string;
    ANTHROPIC_API_KEY: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    PROPOSAL_BASE_URL?: string | undefined;
    OWNER_EMAIL?: string | undefined;
    EMBEDO_BUSINESS_ID?: string | undefined;
}>;
export declare const crmEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    CALENDLY_CLIENT_ID: z.ZodOptional<z.ZodString>;
    CALENDLY_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    CALENDLY_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    INTERNAL_NOTIFICATION_EMAIL: z.ZodOptional<z.ZodString>;
    SENDGRID_API_KEY: z.ZodOptional<z.ZodString>;
    SENDGRID_FROM_EMAIL: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    CALENDLY_CLIENT_ID?: string | undefined;
    CALENDLY_CLIENT_SECRET?: string | undefined;
    CALENDLY_WEBHOOK_SECRET?: string | undefined;
    INTERNAL_NOTIFICATION_EMAIL?: string | undefined;
}, {
    DATABASE_URL: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    CALENDLY_CLIENT_ID?: string | undefined;
    CALENDLY_CLIENT_SECRET?: string | undefined;
    CALENDLY_WEBHOOK_SECRET?: string | undefined;
    INTERNAL_NOTIFICATION_EMAIL?: string | undefined;
}>;
export declare const prospectorEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    GEOAPIFY_API_KEY: z.ZodOptional<z.ZodString>;
    BRAVE_SEARCH_API_KEY: z.ZodOptional<z.ZodString>;
    APOLLO_API_KEY: z.ZodOptional<z.ZodString>;
    ANTHROPIC_API_KEY: z.ZodOptional<z.ZodString>;
    SENDGRID_API_KEY: z.ZodOptional<z.ZodString>;
    SENDGRID_FROM_EMAIL: z.ZodOptional<z.ZodString>;
    REPLY_TRACKING_EMAIL: z.ZodOptional<z.ZodString>;
    OWNER_EMAIL: z.ZodOptional<z.ZodString>;
    OWNER_PHONE: z.ZodOptional<z.ZodString>;
    TWILIO_ACCOUNT_SID: z.ZodOptional<z.ZodString>;
    TWILIO_AUTH_TOKEN: z.ZodOptional<z.ZodString>;
    TWILIO_FROM_NUMBER: z.ZodOptional<z.ZodString>;
    API_BASE_URL: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    API_BASE_URL: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    ANTHROPIC_API_KEY?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    OWNER_EMAIL?: string | undefined;
    GEOAPIFY_API_KEY?: string | undefined;
    BRAVE_SEARCH_API_KEY?: string | undefined;
    APOLLO_API_KEY?: string | undefined;
    REPLY_TRACKING_EMAIL?: string | undefined;
    OWNER_PHONE?: string | undefined;
}, {
    DATABASE_URL: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    ANTHROPIC_API_KEY?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENDGRID_FROM_EMAIL?: string | undefined;
    OWNER_EMAIL?: string | undefined;
    GEOAPIFY_API_KEY?: string | undefined;
    BRAVE_SEARCH_API_KEY?: string | undefined;
    APOLLO_API_KEY?: string | undefined;
    REPLY_TRACKING_EMAIL?: string | undefined;
    OWNER_PHONE?: string | undefined;
    API_BASE_URL?: string | undefined;
}>;
export declare const apiGatewayEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["trace", "debug", "info", "warn", "error", "fatal"]>>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    UPSTASH_REDIS_URL: z.ZodOptional<z.ZodString>;
} & {
    PORT: z.ZodDefault<z.ZodNumber>;
    JWT_SECRET: z.ZodString;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    EMBEDO_BUSINESS_ID: z.ZodOptional<z.ZodString>;
    OWNER_PHONE: z.ZodOptional<z.ZodString>;
    TWILIO_ACCOUNT_SID: z.ZodOptional<z.ZodString>;
    TWILIO_AUTH_TOKEN: z.ZodOptional<z.ZodString>;
    TWILIO_FROM_NUMBER: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "production" | "development" | "test";
    LOG_LEVEL: "info" | "fatal" | "error" | "warn" | "debug" | "trace";
    DATABASE_URL: string;
    PORT: number;
    JWT_SECRET: string;
    CORS_ORIGINS: string;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    EMBEDO_BUSINESS_ID?: string | undefined;
    OWNER_PHONE?: string | undefined;
}, {
    DATABASE_URL: string;
    JWT_SECRET: string;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    LOG_LEVEL?: "info" | "fatal" | "error" | "warn" | "debug" | "trace" | undefined;
    REDIS_URL?: string | undefined;
    UPSTASH_REDIS_URL?: string | undefined;
    PORT?: number | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    CORS_ORIGINS?: string | undefined;
    TWILIO_ACCOUNT_SID?: string | undefined;
    TWILIO_AUTH_TOKEN?: string | undefined;
    TWILIO_FROM_NUMBER?: string | undefined;
    EMBEDO_BUSINESS_ID?: string | undefined;
    OWNER_PHONE?: string | undefined;
}>;
/**
 * Validate env vars at service startup. Throws on missing/invalid values.
 */
export declare function validateEnv<T extends z.ZodSchema>(schema: T): z.infer<T>;
//# sourceMappingURL=env.schema.d.ts.map