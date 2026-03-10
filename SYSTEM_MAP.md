# Embedo System Map

## Architecture Overview

Event-driven modular architecture. Services share one PostgreSQL database via Prisma.
Async inter-service communication via BullMQ (Redis). The API gateway is the single sync HTTP entry point.

```
External Traffic
     │
     ▼
┌─────────────────────┐
│   apps/api          │  ← Fastify API Gateway (port 3000)
│   (Gateway)         │    Handles: auth, routing, webhooks
└──────────┬──────────┘
           │ HTTP + BullMQ
    ┌──────┴──────┐
    │   Services  │
    └─────────────┘
    crm-core   :3001  ← Business/Contact CRUD, onboarding orchestration
    voice-agent :3002  ← ElevenLabs + Twilio integration
    chatbot-agent :3003 ← Claude AI chatbot, web widget, IG/FB DMs
    lead-engine :3004  ← Lead normalization, dedup, SMS/email sequences
    survey-engine :3005 ← Survey builder, delivery, response automation
    social-media :3006  ← Content gen, scheduling, comment monitoring
    website-gen  :3007  ← Site generation, Vercel deployment
    proposal-engine :3008 ← AI proposals, PDF, shareable links
```

---

## Service Registry

| Service | Port (dev) | Deployed On | Primary Responsibility |
|---|---|---|---|
| api (gateway) | 3000 | Railway | Auth, routing, all webhooks |
| crm-core | 3001 | Railway | Business + Contact master data; onboarding |
| voice-agent | 3002 | Railway | ElevenLabs + Twilio; calls, reservations |
| chatbot-agent | 3003 | Railway | Claude chatbot + JS widget delivery |
| lead-engine | 3004 | Railway | Lead normalization + SMS/email sequences |
| survey-engine | 3005 | Railway | Survey creation, delivery, response triggers |
| social-media | 3006 | Railway | Content gen, scheduling, auto-engagement |
| website-gen | 3007 | Railway | Apple-style site generation + Vercel deploy |
| proposal-engine | 3008 | Railway | AI proposal generation + PDF |
| web (Next.js) | 3010 | Vercel | Embedo public landing page |
| platform (Next.js) | 3011 | Vercel | Admin dashboard |

---

## Complete Event Flow Map

### Lead Capture Events
```
voice-agent    ──► lead.created ──► lead-engine (normalize, dedup, score)
chatbot-agent  ──►               ──► crm-core (create/update Contact)
survey-engine  ──►
social-media   ──►
website-gen    ──►
```

### Post-Call Events
```
voice-agent ──► call.completed ──► lead-engine (extract lead from transcript)
                                ──► crm-core (log VoiceCallLog + ContactActivity)
                                ──► survey-engine (queue post-call satisfaction survey, 5min delay)
```

### Survey Events
```
survey-engine ──► survey.response.submitted ──► lead-engine (update lead score)
                                             ──► crm-core (log ContactActivity)
                                             ──► lead-engine (trigger SMS/email sequence)
```

### Appointment Events (via Calendly webhook)
```
External: Calendly webhook ──► crm-core /webhooks/calendly
  crm-core ──► appointment.booked ──► lead-engine (update Contact status to PROSPECT)
                                   ──► survey-engine (schedule post-appointment follow-up)
```

### Business Lifecycle Events
```
crm-core POST /onboarding ──► business.onboarded
  ──► voice-agent worker:    Create ElevenLabs agent → provision Twilio number
  ──► website-gen worker:    Generate restaurant website → deploy to Vercel
  ──► chatbot-agent worker:  Generate widget config + embed snippet
  ──► social-media worker:   Connect accounts → schedule first content batch
  crm-core: sets Business.status = ACTIVE
  crm-core: sends welcome email to business owner
```

### Proposal Events
```
proposal-engine ──► proposal.viewed ──► crm-core (log ContactActivity)
                                     ──► lead-engine (trigger follow-up sequence)
```

### Social Engagement Events
```
Instagram/FB comment ──► social-media /webhooks/meta
  ──► social-media: generate reply, post comment
  ──► social-media: if buying intent detected → auto-DM flow
    ──► auto-dm queue ──► social-media worker: send DM
    ──► lead.created ──► lead-engine, crm-core
```

---

## Data Sources for Lead Engine

| Source | Captured Data | Trigger |
|---|---|---|
| Voice calls | name, phone, intent, reservation details | On call end (ElevenLabs webhook) |
| Chatbot (web) | name, email, phone, service interest | On lead capture tool call |
| Chatbot (IG/FB) | Instagram/Facebook user, message intent | On DM conversation |
| Survey responses | satisfaction score, contact info, preferences | On form submission |
| Social media | platform user, comment/DM content | On comment/follow event |
| Website forms | name, email, phone, inquiry type | On form submit |
| Calendly bookings | name, email, appointment details | On Calendly webhook |

---

## External API Dependency Map

```
voice-agent ──────────► ElevenLabs Conversational AI API
voice-agent ──────────► Twilio Voice API + Programmable Numbers
lead-engine ──────────► Twilio Messaging API (outbound SMS)
lead-engine ──────────► SendGrid API (email sequences)
survey-engine ─────────► Twilio Messaging API (survey SMS delivery)
survey-engine ─────────► SendGrid API (survey email delivery)
chatbot-agent ─────────► Anthropic Claude API (claude-haiku-4-5-20251001)
social-media ──────────► Instagram Graph API
social-media ──────────► Facebook Pages API
social-media ──────────► Anthropic Claude API (content generation)
social-media ──────────► Replicate API (image generation)
proposal-engine ───────► Anthropic Claude API (claude-sonnet-4-6)
proposal-engine ───────► SendGrid API (proposal delivery)
crm-core ──────────────► Calendly Webhooks + API
website-gen ───────────► Vercel API (deployment)
website-gen ───────────► Anthropic Claude API (content fill)
apps/web + platform ───► Supabase Auth
all services ──────────► Supabase PostgreSQL (via Prisma)
all async services ────► Upstash Redis (BullMQ)
```

---

## BullMQ Queue Reference

All queue names are exported from `packages/queue/src/queues/index.ts`.

| Queue Name | Producer | Consumer(s) | Purpose |
|---|---|---|---|
| `embedo:sms` | lead-engine, survey-engine | lead-engine worker | Send outbound SMS |
| `embedo:email` | lead-engine, survey-engine, proposal-engine | lead-engine worker | Send outbound email |
| `embedo:lead.created` | all source services | lead-engine, crm-core | Process new lead |
| `embedo:call.completed` | voice-agent | lead-engine, crm-core, survey-engine | Post-call processing |
| `embedo:survey.response` | survey-engine | lead-engine, crm-core | Survey automation |
| `embedo:survey.delivery` | crm-core, voice-agent | survey-engine | Deliver survey to contact |
| `embedo:appointment.booked` | crm-core | lead-engine, survey-engine | Post-booking automation |
| `embedo:business.onboarded` | crm-core | voice-agent, chatbot-agent, website-gen, social-media | Provisioning |
| `embedo:social.post` | social-media scheduler | social-media worker | Post scheduled content |
| `embedo:social.autodm` | social-media monitor | social-media worker | Send auto-DM |
| `embedo:proposal.viewed` | proposal-engine | crm-core, lead-engine | Follow-up on view |
| `embedo:website.generate` | crm-core (onboarding) | website-gen worker | Generate + deploy site |
| `embedo:sequence.step` | lead-engine | lead-engine worker | Drip sequence delivery |

---

## Database Schema Relationships

```
Business (1) ──── (many) Contact
Business (1) ──── (many) Lead
Business (1) ──── (many) VoiceCallLog
Business (1) ──── (many) ChatSession
Business (1) ──── (many) Survey
Business (1) ──── (many) ContentPost
Business (1) ──── (many) SocialAccount
Business (1) ──── (many) GeneratedWebsite
Business (1) ──── (many) Proposal
Business (1) ──── (many) Appointment
Business (1) ──── (many) EmailSequence
Business (1) ──── (many) SmsSequence
Business (1) ──── (many) OnboardingLog

Contact (1) ──── (many) Lead
Contact (1) ──── (many) ContactActivity
Contact (1) ──── (many) SurveyResponse
Contact (1) ──── (many) Appointment
Contact (1) ──── (many) ChatSession
Contact (1) ──── (many) VoiceCallLog
```

---

## Inbound Call Flow (Detail)

```
1. Customer calls business phone number (Twilio)
2. Twilio calls POST /webhooks/twilio/voice (API gateway)
3. API gateway returns TwiML connecting call to ElevenLabs WebSocket
4. ElevenLabs Conversational AI handles the conversation
   - System prompt built from Business settings (hours, menu, personality)
   - Handles: inquiries, reservations, general questions
   - For reservations: queries Calendly API for availability, books slot
5. Call ends → ElevenLabs sends webhook: POST /webhooks/elevenlabs
6. voice-agent processes webhook:
   - Stores VoiceCallLog (transcript, intent, duration, extractedData)
   - Adds job to embedo:call.completed queue
   - Adds job to embedo:lead.created queue
7. lead-engine worker processes lead.created:
   - Normalizes raw data from call transcript
   - Checks for duplicate Contact (by phone)
   - Creates or updates Contact in DB
   - Triggers SMS/email sequence if configured
8. survey-engine worker processes call.completed (5min delay):
   - Sends post-call satisfaction survey via SMS
```

---

## Business Onboarding Flow (Detail)

```
1. POST /api/onboarding { name, type, phone, email, address, ... }
2. crm-core:
   a. Validates input
   b. Creates Business record (status: PROVISIONING)
   c. Creates OnboardingLog entry
   d. Adds job to embedo:business.onboarded queue
   e. Returns { businessId, status: "provisioning" }

3. Workers process business.onboarded in parallel:

   voice-agent worker:
     a. Calls ElevenLabs API → creates conversational agent with business system prompt
     b. Calls Twilio API → provisions a local phone number
     c. Registers Twilio webhook → points to /webhooks/twilio/voice
     d. Updates Business.elevenLabsAgentId + Business.twilioPhoneNumber
     e. Logs: "voice_agent_provisioned"

   website-gen worker:
     a. Generates website config from business data (Claude fills content)
     b. Creates Vercel project + deploys restaurant template
     c. Updates GeneratedWebsite record with deploy URL
     d. Logs: "website_deployed"

   chatbot-agent worker:
     a. Creates ChatbotConfig for the business
     b. Returns embed snippet (JS <script> tag)
     c. Logs: "chatbot_configured"

   social-media worker:
     a. Stores social account config (waits for OAuth from business owner)
     b. Generates first week of content
     c. Schedules posts
     d. Logs: "social_scheduled"

4. crm-core polls OnboardingLog → when all steps complete:
   a. Sets Business.status = ACTIVE
   b. Sends welcome email to business owner with:
      - Their new AI phone number
      - Website URL
      - Chatbot embed code
      - Social media schedule preview
```
