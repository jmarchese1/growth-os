# Embedo Platform — Current Status

> Last updated: 2026-03-17. Update this file at the end of any session that changes deployment state, implements a new feature, or discovers a broken integration.

---

## Deployed Services

| Service | Platform | URL | Status |
|---|---|---|---|
| `@embedo/api` | Railway | https://embedoapi-production.up.railway.app | ✅ Online |
| `crm-core` | Railway | internal only (no public domain) | ✅ Online |
| `prospector` | Railway | https://prospector-production-bc03.up.railway.app | ✅ Online |
| `website-gen` | Railway | https://website-gen-production.up.railway.app | ✅ Online |
| `Redis` | Railway | redis.railway.internal:6379 | ✅ Online |
| `apps/client` | Vercel | https://app.embedo.io | ✅ Live |
| `apps/web` | Vercel | https://embedo.io | ✅ Live (assumed) |
| `Supabase DB` | Supabase | postgres.umstbrqhhjptjxzgbflu | ✅ Online |

**NOT yet deployed to Railway:**
- `voice-agent` (port 3002) — implemented but not on Railway
- `chatbot-agent` (port 3003) — implemented but not on Railway
- `lead-engine` (port 3004) — partially implemented, not on Railway
- `survey-engine` (port 3005) — implemented but not on Railway (survey routes exist directly in API gateway)
- `social-media` (port 3006) — skeleton only, not on Railway
- `proposal-engine` (port 3008) — implemented but not on Railway (proposal routes exist directly in API gateway)

---

## Environment Variables Per Service

### `@embedo/api` (Railway)
```
NODE_ENV=production, PORT=3000
DATABASE_URL=postgresql://postgres.umstbrqhhjptjxzgbflu:...@aws-0-us-west-2.pooler.supabase.com:5432/postgres
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
REDIS_URL=redis://default:...@redis.railway.internal:6379
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL=jason@embedo.io, SENDGRID_FROM_NAME=Jason
ANTHROPIC_API_KEY (claude-haiku for proposals/chatbot, claude-sonnet for heavy lifting)
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER=+18039191428
JWT_SECRET
EMBEDO_BUSINESS_ID=cmmnr04gf0000wlgw7jtwx2p2   ← Jason's business ID (the demo/main business)
CORS_ORIGINS (localhost 3010/3011/3012 + embedo.io + platform.embedo.io + app.embedo.io)
REPLY_TRACKING_EMAIL=outreach@replies.embedo.io
CAL_LINK=https://cal.com/jason-marchese-mkfkwl/30min
API_BASE_URL=https://embedoapi-production.up.railway.app
PROPOSAL_BASE_URL=https://embedo.io/proposal
WEBSITE_GEN_URL=https://website-gen-production.up.railway.app
STRIPE_SECRET_KEY (test mode), STRIPE_PRICE_SOLO/SMALL/MEDIUM/LARGE, STRIPE_WEBHOOK_SECRET
OWNER_EMAIL=jason@embedo.io, OWNER_PHONE=+19177041382
```

### `crm-core` (Railway)
```
DATABASE_URL, REDIS_URL, PORT=3001, NODE_ENV=production, LOG_LEVEL=info
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL=jason@embedo.io
```

### `prospector` (Railway)
```
NODE_ENV=production, DATABASE_URL, REDIS_URL
ANTHROPIC_API_KEY, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
GEOAPIFY_API_KEY (city geocoding)
BRAVE_SEARCH_API_KEY (prospect discovery)
REPLY_TRACKING_EMAIL=outreach@replies.embedo.io
OWNER_EMAIL, OWNER_PHONE, API_BASE_URL
⚠️ APOLLO_API_KEY — NOT SET (email enrichment falls back to Brave/scraping)
```

### `website-gen` (Railway)
```
DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY
VERCEL_API_TOKEN (deploys client websites to Vercel)
PORT=3007, NODE_ENV=production
```

### `apps/client` (Vercel — growth-os-client project)
```
DATABASE_URL (Supabase direct connection)
NEXT_PUBLIC_SUPABASE_URL=https://umstbrqhhjptjxzgbflu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=https://embedoapi-production.up.railway.app
```

---

## What's Actually Working End-to-End

### ✅ Fully Working in Production
- **Auth flow**: Supabase email/password signup → email verification → `/setup` → business creation → dashboard
- **Cold outreach pipeline**: Campaign creation → prospect discovery (Geoapify + Brave) → email enrichment (Brave/scraping) → multi-step email sequences via SendGrid → reply tracking via inbound parse (if configured)
- **Proposal generation**: POST `/proposals/generate` → Claude Haiku → shareable HTML link
- **Billing/Subscriptions**: Stripe checkout → webhook → Subscription record in DB
- **Website generation**: POST `/websites/generate` → Claude → Vercel deployment
- **QR codes**: Full CRUD, all 7 purposes, public `/qr/[token]` page, scan tracking, contact capture, detail page with analytics
- **Surveys**: Full CRUD, public `/s/[slug]` page, response collection, contact capture
- **Campaigns**: Basic CRUD (EMAIL/SMS drafts) — sending not yet implemented
- **Contacts/CRM**: List, view, paginated contacts per business
- **Billing dashboard**: View subscription, upgrade, cancel, portal

### ⚠️ Built but Not Wired / Untested in Production
- **Cal.com webhook**: Route exists at `/webhooks/cal` but Cal.com dashboard not configured to point there
- **SendGrid Inbound Parse**: Route at `/webhooks/sendgrid/inbound` but SendGrid not configured with the domain
- **SendGrid Event Webhook**: Route at `/webhooks/sendgrid/events` but not configured in SendGrid
- **Voice agent provisioning**: API routes exist (`/voice-agent/provision`) but proxy to `voice-agent` service which isn't deployed
- **Chatbot**: API routes exist but proxy to `chatbot-agent` service which isn't deployed
- **OAuth social connections**: Routes exist (`/auth/:provider/authorize` + `/auth/:provider/callback`) but no Meta App / Google Cloud project / TikTok App created with valid client IDs
- **Campaign sending**: Draft creation works; actual sending (SendGrid dispatch) not implemented
- **ElevenLabs webhook**: Route exists but no ElevenLabs agent provisioned for any business

### ❌ Not Implemented / Placeholder
- **Social media page** (`/social`): Shows empty state, no content generation UI
- **Social media service**: Meta webhook stub only, comment/DM processing marked TODO
- **Lead-engine**: Event workers exist but no HTTP routes; not deployed
- **Email/SMS sequence automation**: Sequences defined in DB but no scheduler deployed

---

## Known Missing Wiring (Action Items)

| Item | What's needed | Priority |
|---|---|---|
| Cal.com webhook | Point `BOOKING_CREATED` to `https://embedoapi-production.up.railway.app/webhooks/cal` in Cal.com dashboard | High |
| SendGrid Inbound Parse | Configure domain `replies.embedo.io` → forward to `/webhooks/sendgrid/inbound` | High |
| SendGrid Event Webhook | Point to `/webhooks/sendgrid/events` in SendGrid dashboard | Medium |
| Apollo.io API key | Set `APOLLO_API_KEY` in prospector Railway env | Medium |
| Deploy voice-agent | Add to Railway project | Low |
| Deploy chatbot-agent | Add to Railway project | Low |
| Meta/Google/TikTok OAuth apps | Create developer apps, set client IDs/secrets in API env | Low |

---

## Schema State

The Prisma schema has been pushed to Supabase (`prisma db push`) and includes all models.
Last schema change: Added `Campaign`, `QrCode`, `QrCodeScan` models + `CampaignType`, `CampaignStatus`, `QrPurpose`, `QR_CODE` to `LeadSource` enum.
Migration method: `prisma db push` (non-interactive — use this for local dev; proper migrations TBD).

---

## Active Business (Demo)
- **Business ID**: `cmmnr04gf0000wlgw7jtwx2p2`
- **Owner**: jason@embedo.io
- **Used in**: `EMBEDO_BUSINESS_ID` env var on API and prospector
