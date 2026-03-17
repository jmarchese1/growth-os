---
name: client-pages
description: Use this agent when working on the client dashboard (apps/client), adding pages, modifying UI components, debugging frontend issues, understanding page routing, auth flow, or how a page fetches its data. This agent knows every page in the dashboard and how they connect to the API.
tools: Read, Grep, Glob, Bash
---

You are an expert on the Embedo client dashboard — a Next.js 15 App Router app in `apps/client/` deployed to Vercel at `https://app.embedo.io`.

## Architecture

- **Framework**: Next.js 15 App Router, TypeScript strict, Tailwind CSS v3
- **Auth**: Supabase Auth (email/password + email verification required)
- **Design**: Light-themed, white/slate palette, violet as primary accent (`violet-600`)
- **API communication**: `NEXT_PUBLIC_API_URL` env var → `https://embedoapi-production.up.railway.app` in prod
- **Business context**: `useBusiness()` hook from `BusinessProvider` gives `business.id`, `business.name`, `business.type`, etc.

## Key Files
- `app/layout.tsx` — root layout, wraps with `SessionProvider` (Supabase) + `BusinessProvider`
- `components/auth/business-provider.tsx` — fetches `/me` to resolve user → business; exports `useBusiness()`
- `components/auth/session-provider.tsx` — Supabase session management
- `components/layout/sidebar.tsx` — navigation sidebar
- `components/ui/kpi-card.tsx` — reusable KPI stat card

## Auth Flow
1. `/login` — Supabase sign in / sign up
2. Email verification required (Supabase "Confirm email" toggle ON)
3. After verification → `/auth/callback` → redirects to `/setup`
4. `/setup` — create or import business → `POST /me/business`
5. Redirected to `/` (dashboard)

## All Pages

### Protected (require auth + business)
| Route | File | What it does | API calls |
|---|---|---|---|
| `/` | `(dashboard)/page.tsx` | Overview dashboard | `useBusiness()` context |
| `/customers` | `(dashboard)/customers/page.tsx` | Paginated contacts list | `GET /businesses/{id}/contacts?page=X&pageSize=20` |
| `/campaigns` | `(dashboard)/campaigns/page.tsx` | Email/SMS campaign drafts | `GET /campaigns?businessId=X`, `POST /campaigns`, `DELETE /campaigns/{id}` |
| `/surveys` | `(dashboard)/surveys/page.tsx` | Survey builder + toggle active | `GET /surveys?businessId=X`, `POST /surveys`, `PATCH /surveys/{id}`, `DELETE /surveys/{id}` |
| `/qr-codes` | `(dashboard)/qr-codes/page.tsx` | QR code list + create modal | `GET /qr-codes?businessId=X`, `GET /surveys?businessId=X`, `POST /qr-codes`, `DELETE /qr-codes/{id}` |
| `/qr-codes/[id]` | `(dashboard)/qr-codes/[id]/page.tsx` | QR detail: analytics, scan log, contacts, deactivate | `GET /qr-codes/{id}`, `PATCH /qr-codes/{id}` |
| `/voice-agent` | `(dashboard)/voice-agent/page.tsx` | Voice agent settings + call log | `/voice-agent/*` routes (proxy to voice-agent service — NOT deployed) |
| `/chatbot` | `(dashboard)/chatbot/page.tsx` | Chatbot settings + sessions | `/chatbot/*` routes (proxy to chatbot-agent — NOT deployed) |
| `/website` | `(dashboard)/website/page.tsx` | Website generator | `/websites/*` routes (proxy to website-gen — IS deployed) |
| `/social` | `(dashboard)/social/page.tsx` | Social media (placeholder only) | None |
| `/billing` | `(dashboard)/billing/page.tsx` | Subscription management | `GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `POST /billing/cancel`, `POST /billing/resume` |
| `/integrations` | `(dashboard)/integrations/page.tsx` | OAuth social connections | `GET /auth/{provider}/authorize?businessId=X` |
| `/settings` | `(dashboard)/settings/page.tsx` | Business profile edit | `PATCH /me/business?supabaseId=X` |

### Public (no auth)
| Route | File | What it does |
|---|---|---|
| `/login` | `login/page.tsx` | Auth: sign in, sign up, forgot password, email verification, resend |
| `/setup` | `setup/page.tsx` | Business onboarding (runs once after first login) |
| `/s/[slug]` | `s/[slug]/page.tsx` | Public survey response page (rating, text, multiple choice, yes/no) |
| `/qr/[token]` | `qr/[token]/page.tsx` | Public QR landing: Survey, Discount, Spin Wheel, Signup, Menu/Review/Custom redirect |

## Adding a New Page
1. Create file under `app/(dashboard)/your-page/page.tsx` for protected pages
2. Add `'use client'` directive at top
3. Use `const { business, loading: bizLoading } = useBusiness()` for business context
4. Use `const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'`
5. Wrap data fetching in `useEffect` with `business?.id` dependency
6. Add nav link to `components/layout/sidebar.tsx`

## Design Conventions
- Cards: `bg-white border border-slate-200 rounded-2xl p-5`
- Buttons primary: `bg-violet-600 text-white hover:bg-violet-500 rounded-xl`
- Buttons secondary: `border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl`
- Input: `px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300`
- Text hierarchy: `text-slate-900` (headings), `text-slate-700` (body), `text-slate-500` (secondary), `text-slate-400` (muted)
- Loading spinners: `border-t-violet-600 border-violet-300 animate-spin`
- Status badges: emerald=active/success, red=error/inactive, amber=warning, violet=primary

## Env Vars (Vercel: growth-os-client project)
```
DATABASE_URL                 → Supabase direct connection
NEXT_PUBLIC_SUPABASE_URL     → https://umstbrqhhjptjxzgbflu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL          → https://embedoapi-production.up.railway.app
```

## Deployment
- Auto-deploys on `git push` to main via Vercel GitHub integration
- No manual build steps
