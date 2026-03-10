# Embedo

**AI infrastructure for local businesses.**

Embedo installs a complete AI automation layer into a business. When a restaurant (or any local business) is onboarded, the platform automatically deploys:

- AI Voice Receptionist (ElevenLabs)
- AI Website Chatbot (Claude)
- Lead Generation & CRM
- Automated SMS/Email Follow-ups
- Social Media Content & Automation
- Custom Survey Engine
- Website Generation
- Appointment Scheduling (Calendly)
- Custom Proposal Generation

---

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Setup

```bash
# Clone and install
git clone https://github.com/your-org/embedo.git
cd embedo
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start local infrastructure (Postgres + Redis)
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Initialize database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Start all services
pnpm dev
```

### Services (dev mode)

| Service | URL |
|---|---|
| API Gateway | http://localhost:3000 |
| Embedo Landing Page | http://localhost:3010 |
| Admin Platform | http://localhost:3011 |
| Prisma Studio | http://localhost:5555 |

---

## Architecture

See [SYSTEM_MAP.md](./SYSTEM_MAP.md) for the complete data flow and integration blueprint.

See [CLAUDE.md](./CLAUDE.md) for development guidelines and architecture decisions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Fastify + TypeScript |
| Frontend | Next.js 15 + Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) + Prisma |
| Queue | BullMQ + Redis |
| Voice AI | ElevenLabs |
| Chat AI | Anthropic Claude |
| SMS | Twilio |
| Email | SendGrid |
| Deployment | Vercel (web) + Railway (services) |

---

## Project Structure

```
embedo/
├── apps/           # Deployable Next.js applications
├── packages/       # Shared libraries (db, types, utils, queue, config)
├── services/       # Domain-specific backend services
├── infrastructure/ # Docker, Railway config, setup scripts
└── docs/           # Architecture docs and runbooks
```

---

## License

Private — All rights reserved. Embedo © 2025.
