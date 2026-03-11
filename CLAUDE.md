# CLAUDE.md — Embedo Platform

## What This Is

Embedo is an AI automation platform for small businesses (initial vertical: restaurants).
When a business is onboarded, it automatically deploys a complete AI layer:
voice agent, chatbot, website, social media automation, lead system, surveys, and proposals.

Think of it as: **"AI infrastructure for local businesses."**

---

## Repository Structure

```
embedo/
├── apps/
│   ├── web/          Next.js — Embedo public landing page (Apple-style)
│   ├── platform/     Next.js — Internal admin dashboard for Embedo staff
│   └── api/          Fastify — API gateway (single HTTP entry point for all services)
├── packages/
│   ├── db/           Prisma client + master schema (shared by all services)
│   ├── types/        Shared TypeScript interfaces and BullMQ job payload types
│   ├── utils/        Logger (Pino), typed errors, Zod validation, crypto helpers
│   ├── queue/        BullMQ queue definitions + Redis connection
│   └── config/       Zod env validation schemas per service
├── services/
│   ├── crm-core/     Business + Contact master data; onboarding orchestration
│   ├── prospector/   Cold outreach engine — prospect discovery, email campaigns, follow-up sequences
│   ├── voice-agent/  ElevenLabs + Twilio; inbound calls, reservations, lead capture
│   ├── chatbot-agent/ Claude chatbot; web widget, IG/FB DMs, lead capture
│   ├── lead-engine/  Lead normalization, deduplication, SMS/email sequences
│   ├── survey-engine/ Survey builder, delivery (SMS/email), response automation
│   ├── social-media/ Content generation, scheduling, comment monitoring, auto-DM
│   ├── website-gen/  Apple-style site generation; deploys to Vercel
│   └── proposal-engine/ AI proposal generation; PDF + shareable link
├── infrastructure/
│   ├── docker/       docker-compose for local dev (Postgres + Redis)
│   └── scripts/      Setup scripts, CLI onboarding tool
└── docs/             Architecture docs, ADRs, module runbooks
```

---

## Package Manager

**Always use `pnpm`.** Never use `npm` or `yarn`.

```bash
pnpm install          # Install all workspace packages
pnpm dev              # Start all services in dev mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm db:migrate       # Run Prisma migrations
pnpm db:generate      # Regenerate Prisma client
pnpm db:studio        # Open Prisma Studio
```

---

## TypeScript Rules

- **Strict mode everywhere.** `noImplicitAny: true`. No `any` — use `unknown` and narrow.
- All shared types live in `@embedo/types`.
- Import types with `import type { ... }` when not using runtime values.
- Every service validates its env vars at startup using `@embedo/config`.

---

## Key Packages

| Package | Import | Purpose |
|---|---|---|
| `@embedo/db` | `import { db } from '@embedo/db'` | Prisma client singleton |
| `@embedo/types` | `import type { ... } from '@embedo/types'` | All TypeScript interfaces |
| `@embedo/utils` | `import { createLogger, EmbedoError } from '@embedo/utils'` | Logger, errors, helpers |
| `@embedo/queue` | `import { smsQueue, emailQueue } from '@embedo/queue'` | BullMQ queues |
| `@embedo/config` | `import { validateEnv, voiceEnvSchema } from '@embedo/config'` | Env validation |

---

## Database

- **Supabase PostgreSQL** (production) — local Postgres via Docker (development)
- **Prisma ORM** — schema at `packages/db/prisma/schema.prisma`
- **Multi-tenancy**: every table (except `Business`) carries a `businessId` foreign key
- Schema changes require a migration: `pnpm db:migrate`
- Never modify the DB directly — always through Prisma migrations

### Key Models
- `Business` — anchor entity; stores integration IDs (ElevenLabs, Twilio, Calendly, social)
- `Contact` — unified customer record, source-tracked, lead-scored
- `Lead` — raw capture before normalization to a Contact
- `VoiceCallLog` — transcript, intent, extracted data from calls
- `ChatSession` — conversation messages JSON, channel, lead capture flag
- `Survey + SurveyResponse` — question schema, answers, trigger timestamps
- `ContentPost` — social posts with scheduling and engagement metrics
- `Proposal` — AI-generated proposals with share token and PDF link
- `GeneratedWebsite` — template config and Vercel deployment info
- `Appointment` — Calendly events, reminders, status tracking

---

## Event-Driven Architecture

**Modules communicate via BullMQ jobs, NOT direct HTTP between services.**

- A service **PRODUCES** events by adding jobs to named queues
- A service **CONSUMES** events by registering BullMQ Workers on those queues
- Queue names are defined in `packages/queue/src/queues/index.ts` (`QUEUE_NAMES` object)
- Job payload types are defined in `packages/types/src/events.types.ts`

### Key Event Flows
```
lead.created      → [lead-engine, crm-core]
call.completed    → [lead-engine, crm-core, survey-engine]
survey.response   → [lead-engine, crm-core]
appointment.booked → [lead-engine, survey-engine]
business.onboarded → [voice-agent, chatbot-agent, website-gen, social-media]
proposal.viewed   → [crm-core, lead-engine]
```

---

## Error Handling

Use typed errors from `@embedo/utils`:

```typescript
import { NotFoundError, ValidationError, ExternalApiError } from '@embedo/utils';

throw new NotFoundError('Business', businessId);
throw new ValidationError('Invalid input', { email: ['Must be valid'] });
throw new ExternalApiError('ElevenLabs', 'Failed to create agent', originalError);
```

All errors get logged with Pino at the service boundary.

---

## Service Structure Pattern

Every service in `services/` follows this structure:

```
services/[service-name]/
├── src/
│   ├── index.ts      # Entrypoint: validateEnv, setup, start server
│   ├── config.ts     # Export validated env (calls validateEnv at import)
│   ├── routes.ts     # Fastify route definitions (or route folder)
│   └── [domain]/     # Domain logic organized by feature
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## External APIs — Critical Notes

| API | Service | Notes |
|---|---|---|
| ElevenLabs | voice-agent | One agent per business. Agent ID stored on `Business.elevenLabsAgentId`. Rate limits apply. |
| Twilio Voice | voice-agent | TwiML routes inbound calls to ElevenLabs WebSocket |
| Twilio SMS | lead-engine, survey-engine | One provisioned number per business for outbound |
| Anthropic Claude | chatbot-agent, social-media, proposal-engine | Use `claude-haiku-4-5-20251001` for high-volume (chatbot, social). Use `claude-sonnet-4-6` for proposals. |
| Instagram Graph API | social-media | Access tokens expire — implement refresh. Store encrypted in `Business.settings`. |
| Calendly | crm-core | Webhooks must be registered per business. Verify signatures. |
| SendGrid | lead-engine, survey-engine, proposal-engine | Use Dynamic Templates for email sequences |
| Vercel API | website-gen | Each generated site = one Vercel project. Store project ID on `GeneratedWebsite`. |
| Supabase Storage | proposal-engine | Store proposal PDFs here. Public bucket for shareable links. |

---

## Adding a New Module

1. Create `services/your-module/` following the existing service structure
2. Add types to `packages/types/src/your-module.types.ts` + export from `index.ts`
3. Add event payload types to `packages/types/src/events.types.ts`
4. Add Prisma models to `packages/db/prisma/schema.prisma` + run `pnpm db:migrate`
5. Register Fastify plugin in `apps/api/src/plugins/your-module.plugin.ts`
6. Define BullMQ queues in `packages/queue/src/queues/index.ts` if async work needed
7. Add env schema to `packages/config/src/env.schema.ts`
8. Update `SYSTEM_MAP.md` with the new event flows
9. Document in `docs/modules/your-module.md`

---

## Development Setup

```bash
# 1. Start local infrastructure
docker compose -f infrastructure/docker/docker-compose.yml up -d

# 2. Copy env vars
cp .env.example .env.local

# 3. Install dependencies
pnpm install

# 4. Generate Prisma client + migrate
pnpm db:generate
pnpm db:migrate

# 5. Seed demo data
pnpm db:seed

# 6. Start all services
pnpm dev
```

---

## Deployment

| App/Service | Platform | Notes |
|---|---|---|
| `apps/web` | Vercel | Auto-deploy from main branch |
| `apps/platform` | Vercel | Auto-deploy from main branch |
| `apps/api` + all `services/*` | Railway | Docker container per service |
| Database | Supabase | Cloud-hosted PostgreSQL |
| Redis | Upstash | Serverless Redis for BullMQ |

---

## Testing

- Unit tests: Vitest
- Never call real external APIs in tests — mock with `vi.mock()` or MSW
- Use test DB (separate `DATABASE_URL` in CI) with Prisma seed data
- Run: `pnpm test`
