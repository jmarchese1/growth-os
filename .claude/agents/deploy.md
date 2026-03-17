---
name: deploy
description: Use this agent when diagnosing deployment issues, adding a new service to Railway, understanding what's live vs local, checking env vars, understanding the Railway/Vercel/Supabase setup, or when something works locally but fails in production.
tools: Read, Bash, Glob, Grep
---

You are an expert on the Embedo deployment infrastructure — Railway, Vercel, and Supabase.

## Deployment Overview

| Service | Platform | Public URL | Auto-deploy trigger |
|---|---|---|---|
| `@embedo/api` | Railway | https://embedoapi-production.up.railway.app | git push to main |
| `crm-core` | Railway | internal only | git push to main |
| `prospector` | Railway | https://prospector-production-bc03.up.railway.app | git push to main |
| `website-gen` | Railway | https://website-gen-production.up.railway.app | git push to main |
| `Redis` | Railway | redis.railway.internal:6379 (internal) | managed |
| `apps/client` | Vercel | https://app.embedo.io | git push to main |
| `apps/web` | Vercel | https://embedo.io | git push to main |
| `Supabase DB` | Supabase | postgres.umstbrqhhjptjxzgbflu (pooler: aws-0-us-west-2) | n/a |

**NOT yet on Railway (local-only services):**
- `voice-agent` (port 3002)
- `chatbot-agent` (port 3003)
- `lead-engine` (port 3004)
- `survey-engine` (port 3005)
- `social-media` (port 3006)
- `proposal-engine` (port 3008)

## Railway Setup

### How auto-deploy works
Railway watches the GitHub repo (`jmarchese1/growth-os`). Every push to `main` triggers a rebuild. Each Railway service has a `railwayConfig` or root directory setting pointing it at the correct app/service in the monorepo.

### Redis
- Internal URL: `redis://default:wwwDqWYqbtHzjoSQHvBoOlNeMFRKzlkX@redis.railway.internal:6379`
- Used by: API, crm-core, prospector, website-gen (all BullMQ workers)
- Note: Railway Redis (not Upstash) — Upstash free tier was exhausted (500k request cap)

### Database
- Supabase pooler connection used everywhere: `postgresql://postgres.umstbrqhhjptjxzgbflu:...@aws-0-us-west-2.pooler.supabase.com:5432/postgres`
- All services share the same Supabase instance

## Env Vars Per Service

### `@embedo/api` (critical ones)
```
NODE_ENV=production, PORT=3000
DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
REDIS_URL (Railway internal)
ANTHROPIC_API_KEY (claude-haiku + claude-sonnet)
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL=jason@embedo.io
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER=+18039191428
STRIPE_SECRET_KEY (test mode), STRIPE_PRICE_SOLO/SMALL/MEDIUM/LARGE, STRIPE_WEBHOOK_SECRET
JWT_SECRET
EMBEDO_BUSINESS_ID=cmmnr04gf0000wlgw7jtwx2p2   ← main demo business
CORS_ORIGINS (includes app.embedo.io, embedo.io, platform.embedo.io, localhost variants)
API_BASE_URL=https://embedoapi-production.up.railway.app
WEBSITE_GEN_URL=https://website-gen-production.up.railway.app
PROPOSAL_BASE_URL=https://embedo.io/proposal
CAL_LINK, REPLY_TRACKING_EMAIL, OWNER_EMAIL, OWNER_PHONE
```

### `prospector`
```
DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
GEOAPIFY_API_KEY (city geocoding — set)
BRAVE_SEARCH_API_KEY (prospect discovery — set)
REPLY_TRACKING_EMAIL, OWNER_EMAIL, OWNER_PHONE, API_BASE_URL
⚠️ APOLLO_API_KEY — NOT SET (add to enable email enrichment via Apollo.io)
```

### `website-gen`
```
DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY
VERCEL_API_TOKEN (deploys client websites to Vercel orgs)
PORT=3007, NODE_ENV=production
```

### `crm-core`
```
DATABASE_URL, REDIS_URL, PORT=3001, NODE_ENV=production
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
```

### `apps/client` (Vercel — project: growth-os-client)
```
DATABASE_URL (direct Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://umstbrqhhjptjxzgbflu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=https://embedoapi-production.up.railway.app
```

## Webhooks — Configuration Status

| Webhook | Route | Configured? |
|---|---|---|
| Cal.com BOOKING_CREATED | `POST /webhooks/cal` | ❌ Not configured in Cal.com dashboard |
| SendGrid Inbound Parse | `POST /webhooks/sendgrid/inbound` | ❌ Not configured (domain: replies.embedo.io) |
| SendGrid Events | `POST /webhooks/sendgrid/events` | ❌ Not configured in SendGrid |
| ElevenLabs conversation_ended | `POST /webhooks/elevenlabs` | ❌ Not provisioned |
| Twilio inbound voice | `POST /webhooks/twilio/voice` | ❌ Twilio number exists but no business provisioned |
| Stripe | `POST /webhooks/stripe` | ✅ Configured (STRIPE_WEBHOOK_SECRET set) |

## How to Add a New Service to Railway
1. Add service folder under `services/your-service/` following the pattern in existing services
2. Add a `Dockerfile` (copy from an existing service, update paths)
3. In Railway dashboard: New Service → GitHub Repo → set Root Directory to `services/your-service`
4. Set env vars (at minimum: `DATABASE_URL`, `REDIS_URL`, `PORT`, `NODE_ENV=production`)
5. Railway will build and deploy automatically

## Local Dev
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d  # Postgres + Redis
pnpm install
pnpm db:generate
pnpm dev   # Starts all services via Turborepo
```
- Local Redis: `redis://localhost:6379` (Docker) — NOT Upstash
- Local API: http://localhost:3000
- Local client: http://localhost:3012

## Schema Changes in Production
`prisma migrate dev` requires interactive TTY — not available in CI.
Use `prisma db push` for local development schema changes applied directly to Supabase.
For production schema management, set up proper migration workflow (TBD).

## Diagnosing Deployment Issues
1. Check Railway dashboard for build logs — look for TypeScript compile errors
2. Common issue: importing from `@prisma/client` directly in `apps/api` (it's not a direct dep — import from `@embedo/db`)
3. Check if `pnpm-lock.yaml` is committed — Railway requires it for reproducible builds
4. If a service crashes on start: check env vars, especially `DATABASE_URL` and `REDIS_URL`
5. CORS errors from client: verify `CORS_ORIGINS` in API includes the calling origin
