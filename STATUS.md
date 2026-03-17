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

**NOT yet deployed to Railway (services are skeletal — logic lives in API gateway):**
- `voice-agent` (port 3002) — provisioning now handled inline in API gateway; ElevenLabs + Twilio work without this service
- `chatbot-agent` (port 3003) — chatbot routes in gateway proxy to this; not deployed
- `lead-engine` (port 3004) — event workers exist but no HTTP routes; not deployed
- `survey-engine` (port 3005) — survey routes live directly in API gateway; this service not needed
- `social-media` (port 3006) — skeleton only; social routes live in API gateway
- `proposal-engine` (port 3008) — proposal routes live directly in API gateway; this service not needed

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
ELEVENLABS_API_KEY (for voice agent provisioning)
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

**Infrastructure & Auth**
- **Auth flow**: Supabase email/password signup → email verification → `/setup` → business creation → dashboard
- **Cal.com webhook**: `BOOKING_CREATED` fires to `/webhooks/cal` — prospect → lead conversion on meeting booked
- **SendGrid Inbound Parse**: `replies.embedo.io` forwards to `/webhooks/sendgrid/inbound` — prospect → lead on email reply
- **SendGrid Event Webhook**: pointing to `/webhooks/sendgrid/events` — open/click/bounce tracking

**Outbound / Prospecting**
- **Cold outreach pipeline**: Campaign creation → prospect discovery (Geoapify + Brave) → email enrichment (Brave/scraping) → multi-step email sequences via SendGrid → reply tracking
- **Automated follow-up sequences**: Multi-step sequences fire on schedule; countdown timers in UI; sequence timeline on prospect detail

**Pipeline / Proposals**
- **Proposal generation**: POST `/proposals/generate` → Claude Haiku → shareable HTML link
- **Lead detail page**: View lead info, reply history, convert-to-business action

**Client Dashboard**
- **QR codes**: Full CRUD, all 7 purposes (survey, discount, spin wheel, signup, menu, review, custom), public `/qr/[token]` page, scan tracking, contact capture, detail page with analytics
- **Surveys**: Full CRUD, public `/s/[slug]` page, response collection, contact capture, question builder (rating/text/multiple choice/yes-no)
- **Social media AI generation**: On-demand post generation via Claude Haiku, optional schedule date/time → `SCHEDULED` status, saved as drafts otherwise
- **Contacts/CRM**: List, view, paginate, manually add contacts, edit contact fields (name/email/phone/notes), send survey via SMS or email directly from contact detail page
- **Campaigns (client)**: EMAIL/SMS campaigns to contacts — create draft, send via SendGrid/Twilio
- **Voice agent provisioning**: `POST /voice-agent/provision` → creates ElevenLabs agent + provisions Twilio number inline (no separate service needed); idempotent
- **Website generation**: POST `/websites/generate` → Claude → Vercel deployment
- **Billing/Subscriptions**: Stripe checkout → webhook → Subscription record in DB; billing dashboard (view, upgrade, cancel, portal)
- **Integrations page**: OAuth param cleanup (strips `?connected=` from URL after callback)
- **Public routes**: `/qr/` and `/s/` middleware-exempted (no auth required)

### ⚠️ Built but Not Wired / Untested in Production

- **Chatbot**: API routes exist but proxy to `chatbot-agent` service which isn't deployed
- **OAuth social connections**: Routes exist (`/auth/:provider/authorize` + `/auth/:provider/callback`) but no Meta App / Google Cloud project / TikTok App created — blocked by Meta device verification
- **ElevenLabs inbound webhook**: Route exists; now possible to provision agents via dashboard but no business has been provisioned yet in production

### ❌ Not Implemented / Placeholder

- **Social media service**: Meta webhook stub only; comment/DM processing marked TODO
- **Lead-engine**: Event workers exist but no HTTP routes; not deployed
- **Email/SMS sequence automation**: Sequences defined in DB but no scheduler deployed

---

## Known Missing Wiring (Action Items)

| Item | What's needed | Priority |
|---|---|---|
| Apollo.io API key | Set `APOLLO_API_KEY` in prospector Railway env to enable email enrichment | Medium |
| Deploy chatbot-agent | Add to Railway project | Low |
| Meta/Google/TikTok OAuth apps | Create developer apps, set client IDs/secrets in API env | Low (blocked by Meta device verification) |
| Provision first voice agent | Use `/voice-agent/provision` in the client dashboard for the demo business | Low |

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
