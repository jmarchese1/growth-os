# Embedo Platform — Current Status

> Last updated: 2026-03-20. Update this file at the end of any session that changes deployment state, implements a new feature, or discovers a broken integration.

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
PEXELS_API_KEY (optional — curated fallback images work without it)
OPENAI_API_KEY (optional — for DALL-E 3 image generation in editor)
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
- **QR codes**: Full CRUD, all 7 purposes, public `/qr/[token]` page, scan tracking, contact capture
- **Surveys**: Full CRUD, public `/s/[slug]` page, response collection, contact capture, question builder
- **Social media AI generation**: On-demand post generation via Claude Haiku, optional scheduling
- **Contacts/CRM**: List, view, paginate, manually add, edit, send survey via SMS or email
- **Campaigns (client)**: EMAIL/SMS campaigns to contacts — create draft, send via SendGrid/Twilio
- **Voice agent provisioning**: ElevenLabs agent + Twilio number inline; idempotent; agent is live and answering calls
- **Voice agent configuration**: Voice browser (preview + select from 100+ voices), system prompt editor (4 industry templates), knowledge base upload (menu, FAQ, parking, etc.)
- **Image Library**: Full `/images` page — DALL-E 3 generation, save URLs, category filters (food/interior/team/logo/product/lifestyle), favorites, detail modal. Images persisted to Supabase Storage (permanent URLs, no DALL-E expiry).
- **Billing/Subscriptions**: Stripe checkout → webhook → Subscription record; billing dashboard
- **Integrations page**: OAuth param cleanup
- **Public routes**: `/qr/` and `/s/` middleware-exempted (no auth required)

**Website Generator (major overhaul this session)**
- **AI-generated websites**: When inspiration URLs provided, Claude generates COMPLETE custom HTML using Tailwind CSS CDN — unique layout, colors, typography per site
- **Inspiration site analysis**: Fetches raw CSS/HTML source of inspiration URLs, passes to Claude for visual DNA matching
- **Pexels image sourcing**: 60+ curated industry/cuisine-specific image URLs (italian, cookies, sushi, etc.) guaranteed to load. Optional Pexels API key for fresh searches.
- **Template fallback**: When no inspiration URLs, falls back to rigid template system (premium, bold, editorial) with color/font presets
- **6 industry types**: Restaurant, Gym, Salon, Spa, Coffee Shop, Retail Boutique
- **6-step wizard**: Industry → Import/Inspiration → Details → Structure → Style (skipped with inspiration) → Done
- **Fun loading overlay**: Rotating slogans (31 messages) with 3D cube animation + editing slogans in AI chat
- **4 template options**: Premium, Minimal, Bold, Editorial (used when no inspiration)
- **Gallery image upload**: Up to 6 image URLs with thumbnail preview in wizard
- **Menu import**: Paste text, upload photo, or upload PDF → AI extracts structured items
- **Analytics injection**: Google Analytics + Meta Pixel fields, injected into generated HTML
- **Contact form**: Working form on Contact page → creates Lead record in DB
- **SEO**: JSON-LD structured data, sitemap.xml, robots.txt, canonical URLs, Twitter cards
- **Custom domains**: Vercel API integration to add custom domain + DNS instructions UI
- **Version history**: Auto-numbered snapshots (Version 1, 2, 3...), inline rename, revert with Vercel redeploy
- **AI editor**: Chat-based editor modifies HTML directly for AI-generated sites (no template re-render). Rotating slogans during edits.
- **Editor toolbar**: Color Picker, Custom Domain, Search Photos (Pexels 200 results), AI Images (DALL-E 3), My Images dropdown (with category filters)
- **AI Editor User Guide**: Polished modal with 25+ example prompts across 5 categories + pro tips
- **DALL-E 3 image generator**: Generate images, persisted to Supabase Storage (permanent URLs)
- **Pexels photo search**: Search 200+ free stock photos, click to insert into AI chat
- **Vercel deployment**: Auto-deploys to Vercel on generation, returns live URL
- **HTML stored in DB**: AI-generated HTML saved in config.html — preview survives refresh without Vercel fetch

### ⚠️ Built but Not Wired / Untested in Production

- **Chatbot**: API routes exist but proxy to `chatbot-agent` service which isn't deployed
- **OAuth social connections**: Routes exist but no Meta App / Google Cloud project / TikTok App created
- **ElevenLabs inbound webhook**: Route exists; agent is provisioned but webhook for call completion logging not yet tested
- **AI self-review loop**: Runs on Sonnet after generation; may need tuning for quality threshold

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
| Pexels API key | Set `PEXELS_API_KEY` on website-gen Railway for dynamic image search (curated fallbacks work without it) | Low — already set |
| Supabase Storage | Fix SUPABASE_SERVICE_ROLE_KEY on website-gen (needs full JWT, not truncated) for DALL-E image persistence | High |
| OpenAI API key | Set `OPENAI_API_KEY` on website-gen Railway for DALL-E 3 image generation in editor | Low |
| Re-architect self-review | Self-review loop needs to work with AI-generated Tailwind HTML, not just template-based sites | Medium |
| WebsiteVersion schema push | Run `prisma db push` to create `WebsiteVersion` table in production Supabase | Medium |

---

## Schema State

The Prisma schema has been pushed to Supabase (`prisma db push`) and includes all models.
Last schema change: Added `WebsiteVersion` model for version history/undo on website edits.
Migration method: `prisma db push` (non-interactive — use this for local dev; proper migrations TBD).

---

## Active Business (Demo)
- **Business ID**: `cmmnr04gf0000wlgw7jtwx2p2`
- **Owner**: jason@embedo.io
- **Used in**: `EMBEDO_BUSINESS_ID` env var on API and prospector

---

## Website Generator Architecture

### Two Generation Paths

```
WITH inspiration URLs (AI-first):
  Import step → add inspiration URLs
  Details step → business info + menu + gallery images + analytics
  Structure step → pick sections → Generate (skips Style step)
       ↓
  HTTP fetch raw CSS/HTML from inspiration sites
       ↓
  Pexels image sourcing (cuisine-specific)
       ↓
  Claude Sonnet generates COMPLETE HTML with Tailwind CSS CDN
  - Unique layout, colors, typography per site
  - Real Pexels images throughout
  - Responsive, hover effects, transitions
       ↓
  Deploy to Vercel → return HTML + URL

WITHOUT inspiration URLs (template fallback):
  Full wizard with Style step (color scheme, font, animation, template)
  Rigid template system with style override tokens
  renderRestaurantPremium / renderBoldTemplate / renderEditorialTemplate
```

### Key Files
- `services/website-gen/src/generator/full-site-generator.ts` — AI full HTML generation
- `services/website-gen/src/generator/image-sourcer.ts` — Pexels image fetching
- `services/website-gen/src/generator/content.ts` — AI copy generation
- `services/website-gen/src/generator/style-generator.ts` — AI style token generation
- `services/website-gen/src/templates/restaurant/premium.ts` — Template renderer
- `services/website-gen/src/scraper/scrape.ts` — Website scraping + inspiration analysis
- `services/website-gen/src/routes.ts` — All generation endpoints
- `apps/client/app/(dashboard)/website/website-builder.tsx` — 6-step wizard UI
- `apps/client/app/(dashboard)/website/website-page-client.tsx` — Editor + list view
