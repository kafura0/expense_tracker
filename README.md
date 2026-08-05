# Ledgerly

> Premium multi-tenant SaaS expense tracking platform — **Next.js 16 · Supabase · Tailwind CSS v4**

Dark-first, PWA-enabled expense tracking with real-time exchange rates, VAT support, per-org dashboards, budgets, and bank-grade security (RLS + nonce-based CSP).

**Live:** [expense-tracker-iq7pempv3-joan-kaburas-projects.vercel.app](https://expense-tracker-iq7pempv3-joan-kaburas-projects.vercel.app) · **Alias:** [expense-tracker-ruddy-five-r8k6s4r6zg.vercel.app](https://expense-tracker-ruddy-five-r8k6s4r6zg.vercel.app)
**Repository:** [github.com/kafura0/expense_tracker](https://github.com/kafura0/expense_tracker)

---

## Demo

![Ledgerly dashboard demo](public/demo/dashboard-demo.gif)

▶ **Watch the full walkthrough video:** [`dashboard_landing_page demo.mp4`](docs/template/demo_files/dashboard_landing_page%20demo.mp4) · also at [`docs/demo.mp4`](docs/demo.mp4)
Source media lives in [`docs/template/demo_files/`](docs/template/demo_files/) (GIF, MP4, logo, intro audio).

---

## Table of Contents

- [Features](#features)
- [User Model](#user-model)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Route Map](#route-map)
- [Database Schema](#database-schema)
- [Security Model](#security-model)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Demo Credentials](#demo-credentials)
- [Testing](#testing)
- [CI / CD](#ci--cd)
- [Available Scripts](#available-scripts)
- [PWA](#pwa)
- [Design System](#design-system)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

**Core expense tracking**
- Full expense CRUD with categories, currencies, VAT/tax fields, notes, and soft-delete
- Multi-currency support with **live exchange rates** (Frankfurter / ECB) and local caching
- Exchange rate fallback (hardcoded `USD/KES = 153.5`) when the API is unavailable
- CSV and PDF export with date-range and category filtering

**Role-aware experience**
- Persona-tailored dashboards (Solo, Org, Super Admin) scoped to the active org — or the user's own data when solo
- Budget-vs-actual tracking, team spend leaderboard, org health card, and announcements
- Organization management with member roles, a role badge, and a multi-org switcher
- Invite-based onboarding (token + email via Resend), access-request flow, and OTP email verification

**Analytics & insights**
- KPI cards (total spend, transactions, average expense), 6-month spending trend, category breakdown (Recharts)
- Real-data Reports page (monthly/quarterly/yearly ranges) with CSV/PDF export
- Recent activity feed, rule-based insights, tax summary, and currency breakdown
- Real `budgets` table with per-category budget setting and over-budget indicators on Categories

**Admin platform**
- Super Admin panel with Users, Clients, Invites, Announcements, and Messages management
- Org status control (active / suspended), client request approval, and plan management

**Security & quality**
- Row Level Security (RLS) on every table with granular helper functions
- Next.js 16 Proxy with session management, rate limiting, and nonce-based CSP security headers
- Audit logging, 200 unit/component tests across 25 files, 21 E2E tests, zero-lint baseline

**Polish**
- PWA installable on mobile and desktop (manifest + service worker)
- Dark-first glassmorphic UI with animated charts and skeleton loading states
- Fully responsive with a mobile bottom navigation

---

## User Model

| Role | Description |
|------|-------------|
| **Super Admin** | Platform staff (`org_members.role = 'super_admin'`). Full system access — user/org management, announcements, message replies. Home is `/admin` (middleware routes them away from the org dashboards). |
| **Org Admin** | Org-level administrator (`org_admin`) — roster, invites, and org settings. |
| **Member** | Any organization member (`member`) — org-wide write access to expenses, categories, and budgets. Manager/client tiers were consolidated into a single member role (migration 011). |
| **Solo** | Independent user with no org — personal expense tracking only. |

The org persona (`solo | org | platform-admin`) is resolved in `src/features/dashboard/scope.ts`; database roles are `super_admin`, `org_admin`, and `member`.

### Permission matrix

| Capability | Super Admin | Org Admin | Member | Solo |
|---|---|---|---|---|
| Manage expenses | ✅ (all) | ✅ (org) | ✅ (org) | ✅ (own) |
| Manage categories | ✅ | ✅ | ✅ | ✅ (own) |
| Budgets | ✅ | ✅ | ✅ | ✅ (own) |
| Invite members / roster | ✅ | ✅ | ➖ | ➖ |
| Manage org settings | ✅ | ✅ | ➖ | ➖ |
| View org analytics | ✅ | ✅ | ✅ | ➖ |
| Admin panel | ✅ | ➖ | ➖ | ➖ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.10 (App Router, Turbopack) |
| Language | TypeScript |
| UI | Tailwind CSS v4, Radix UI primitives, Lucide icons |
| Charts | Recharts |
| State | TanStack React Query, React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage) |
| Auth | Supabase Auth — email/password + OTP, password reset |
| Email | Resend (invites, onboarding, OTP) |
| PDF / CSV | jsPDF + jspdf-autotable, native CSV generation |
| Exchange Rates | Frankfurter API (ECB data) with local caching |
| Unit/Integration Tests | Vitest, Testing Library, JSDOM |
| E2E Tests | Playwright (Chromium, 21 tests) |
| CI/CD | GitHub Actions (lint → test → e2e → build) |
| Deployment | Vercel (auto-deploy on push to `main`) |
| Architecture | Feature-Sliced Design (FSD) |

---

## Architecture

Ledgerly follows **Feature-Sliced Design (FSD)** — a layered architecture where each layer depends only on the layers beneath it. Domain logic lives in `entities`, user-facing features in `features`, composite blocks in `widgets`, and routes/layouts in `app`. Everything reusable sits in `shared`.

```
┌────────────────────────────────────────────┐
│  app/      Next.js routes, pages, layouts  │
├────────────────────────────────────────────┤
│  widgets/  composable blocks (dashboard)   │
├────────────────────────────────────────────┤
│  features/ user-facing feature modules     │
├────────────────────────────────────────────┤
│  entities/ domain models + repositories    │
├────────────────────────────────────────────┤
│  shared/   UI kit, libs, types             │
└────────────────────────────────────────────┘
```

### Request lifecycle

Next.js 16 delegates every non-static request to `src/proxy.ts`, which runs a deterministic pipeline before the page/route handler executes:

```
Browser
  │
  ▼
proxy.ts (Next 16 Proxy)                         ← runs on all non-static paths
  ├─ 1. rateLimit(request)                       ← auth 5/min · api 60/min · general 100/min
  │       Memory store (default) or Upstash Redis (env-configured)
  │       429 + Retry-After + X-RateLimit-* headers when exceeded
  ├─ 2. generate nonce (crypto.randomUUID)       ← fresh per request
  ├─ 3. set Content-Security-Policy header       ← 'self' + nonce + 82 build-time sha256 hashes
  ├─ 4. updateSession(nextRequest)               ← middleware.ts (below)
  ├─ 5. addRateLimitHeaders + addSecurityHeaders ← X-Frame-Options, nosniff, HSTS (prod), CSP
  ▼
Next.js page / API handler
  ▼
Supabase  ← RLS enforces org/row isolation at the query layer
```

`src/shared/lib/supabase/middleware.ts` (`updateSession`) is the authorization spine:

1. **Session refresh** — `createServerClient` + `getUser()` refresh tokens on every request.
2. **Route classification** — public / protected (`/dashboard`, `/expenses`, `/reports`, `/categories`, `/settings`) / admin (`/admin`) / API (`/api/*`). Unauthenticated users on protected/admin/API paths are redirected to `/login`.
3. **Consolidated lookups** — the user's `profiles` row and `org_members` memberships are fetched once, in parallel (two Supabase round trips total).
4. **Org cookie validation** — the `ledgerly_active_org` cookie is checked against real memberships, never trusted blindly.
5. **Fail-open posture** — a transient Supabase error downgrades to pass-through (with a `x-middleware-mode: fail-open` header). `MIDDLEWARE_FAIL_CLOSED=1` flips admin/suspension checks to fail-closed.

### Content Security Policy

- Static prerendered pages carry inline bootstrap/RSC scripts trusted by **SHA-256 hashes** generated at build time (`scripts/generate-csp-hashes.mjs`, 82 hashes in `src/shared/lib/csp-hashes.generated.ts`).
- Dynamically rendered pages trust scripts via the **per-request nonce**.
- `'unsafe-eval'` ships only in development; `style-src 'unsafe-inline'` is retained for Tailwind/chart inline styles; `frame-ancestors 'none'` blocks clickjacking.
- The build pipeline is deterministic and self-verifying: `next build` → generate hashes → `next build` → `--verify` fails CI if the committed hash file drifts.

### Data & query architecture

- **RLS is the real security boundary.** Helper functions (`is_super_admin`, `is_org_member`, `can_write_in_org`, `can_admin_org`, `is_solo_user`, `is_row_owner`) gate every row. Server actions re-validate authorization on each call.
- **Consolidated dashboard queries.** `src/features/dashboard/use-dashboard-data.ts` loads 6 months of scoped expenses, categories, budgets, and the base-currency rate map in **4 parallel round trips** (previously ~15–21 sequential). Nine widgets derive their numbers client-side from this shared payload, deduped by a single TanStack Query key.
- **Audit logging** goes exclusively through the `log_audit_event` RPC with a pinned vocabulary (`src/shared/lib/audit-logger.ts`).

### Project structure

```
src/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # invite, org-signup
│   ├── (dashboard)/                # dashboard, expenses, reports, categories, settings
│   ├── (onboarding)/               # onboarding wizard
│   ├── admin/                      # Super Admin panel
│   ├── api/rates/route.ts          # Exchange rate API endpoint
│   ├── auth/callback/route.ts      # Supabase auth callback
│   ├── login/ signup/ verify-otp/  # Auth pages
│   ├── reset-password/ update-password/
│   ├── request-access/             # Org access request form
│   ├── page.tsx                    # Public landing page (with demo GIF)
│   ├── layout.tsx / globals.css    # Root layout + design tokens
│   └── proxy.ts                    # Next 16 proxy: rate limit, CSP, session, headers
├── widgets/dashboard/              # KPI cards, charts, activity, insights, summaries,
│                                   # budget, leaderboard, org health, announcements
├── features/                       # auth, expenses, budgets, admin, org, invites, onboarding,
│                                   # exchange-rates, export, pwa, settings
├── entities/                       # org, invite, expense, budget, exchange-rate
├── shared/
│   ├── ui/                         # Button, Card, Dialog, Badge, …
│   ├── lib/security-headers.ts     # buildCsp + addSecurityHeaders
│   ├── lib/rate-limit.ts           # Memory/Upstash stores, env-overridable limits
│   ├── lib/csp-hashes.generated.ts # build-time script hashes (auto-generated)
│   └── lib/supabase/               # client + server clients, middleware
supabase/migrations/                # 16 SQL migrations (001–014)
public/demo/dashboard-demo.gif      # Landing page + README demo
scripts/
├── seed-test-users.mjs             # Canonical seeder — 5 demo users + org (env-driven)
├── generate-csp-hashes.mjs         # Build-time CSP hash generator
└── seed.ts                         # Legacy seeder — 90 days / 100 expenses
tests/
├── e2e/                            # Playwright (21 tests)
├── unit/                           # 22 files — VAT, utils, PDF, CSV, rate-limit, CSP, …
└── integration/                    # expense actions, API routes
```

---

## Route Map

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Landing page (with dashboard demo) |
| `/login` | Public | Sign in |
| `/signup` | Public | Solo signup |
| `/org-signup` | Public | Organization signup |
| `/verify-otp` | Public | OTP email verification |
| `/reset-password` | Public | Request password reset |
| `/update-password` | Public | Set new password |
| `/request-access` | Public | Request org access |
| `/invite` | Public | Accept org invite |
| `/suspended` | Public | Suspended-account confinement page |
| `/no-access` | Public | Removed-member confinement page |
| `/auth/callback` | Public | Supabase OAuth callback |
| `/onboarding` | Auth | Onboarding wizard |
| `/dashboard` | Auth | Role-tailored dashboard |
| `/expenses` | Auth | Expense list + CRUD |
| `/reports` | Auth | Spending reports |
| `/categories` | Auth | Categories + budget planning |
| `/settings` | Auth | User settings |
| `/admin` | Super Admin | Admin panel |
| `/api/rates` | Auth | Exchange rate proxy |

---

## Database Schema

Sixteen migrations manage the schema — note there are two `002_*` and two `014_*` files (order of creation, both applied). **Supabase project ref:** `weitlewvoufvgfpkryvg`

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables (`profiles`, `categories`, `expenses`, `settings`, `exchange_rates`) + `handle_new_user` trigger + RLS |
| `002_tenancy_and_security.sql` | `plans`, `organizations`, `org_members`, `client_requests`, `subscriptions`, `audit_logs`; `org_id` columns; RLS rewrite; helper functions; `create_org_for_user` + `approve_client_request` RPCs; plan seeds |
| `002_performance_optimization.sql` | Composite indexes for dashboard date-range analytics |
| `003_onboarding.sql` | `profiles.onboarding_completed` flag + index |
| `004_messages_table.sql` | `messages` (support tickets + announcements) with RLS |
| `005_invites_and_solo_support.sql` | `invites` table + solo-user RLS policies + `is_solo_user` / `is_row_owner` helpers |
| `006_budgets.sql` | `budgets` table (user/org scopes), RLS policies, `set_updated_at` trigger, dedupe unique index via `COALESCE(org_id, …)` |
| `007_income_and_public_plans.sql` | Income support + public plan seeds |
| `008_announcements_and_suspension.sql` | Announcements + `profiles.is_suspended` + suspension confinement |
| `009_super_admin_profile_updates.sql` | Super-admin profile write policies |
| `010_unify_org_member_write.sql` | `can_write_in_org()` grants every member write access |
| `011_remove_legacy_org_roles.sql` | Drops legacy `manager` / `client` roles |
| `012_security_hardening.sql` | RLS hardening + defense-in-depth |
| `013_org_administration.sql` | Org admin management (`can_admin_org`) |
| `014_accept_invite_expired_persist.sql` | Invite acceptance + expiry handling |
| `014_query_performance.sql` | Additional query-performance indexes |

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Per-user profile (display name, avatar, org, onboarding, suspension) |
| `categories` | Expense categories (personal or org-scoped) |
| `expenses` | Core transactions (`amount_cents`, currency, VAT/tax fields, soft-delete) |
| `settings` | Per-user preferences (base currency, VAT rate, theme) |
| `exchange_rates` | Cached FX rates |
| `plans` | Subscription tiers (Free / Pro / Enterprise) |
| `organizations` | Tenants (status: pending / active / suspended / cancelled) |
| `org_members` | User ↔ org mapping with role (`super_admin` / `org_admin` / `member`) |
| `client_requests` | Access-request form submissions |
| `subscriptions` | Per-org billing state |
| `audit_logs` | Sensitive action audit trail |
| `messages` | Support tickets + announcements |
| `invites` | Org member invites (token-based, 7-day expiry) |
| `budgets` | Per-category budgets (`user` personal / `org` org-wide) |

---

## Security Model

**Row Level Security (RLS)** is enforced on every data table. Access is driven by security-definer helper functions:

| Helper | Definition |
|--------|------------|
| `is_super_admin()` | User holds `super_admin` role in any org |
| `is_org_member(org_id)` | User belongs to the given org |
| `can_write_in_org(org_id)` | User is a member of the given org (all members write) |
| `can_admin_org(org_id)` | User is an org admin of the given org |
| `is_solo_user()` | User has no org memberships |
| `is_row_owner(user_id)` | Row belongs to the authenticated user |

**Additional controls**
- **Proxy** (`src/proxy.ts`) runs on all non-static routes: rate limiting, per-request nonce, and security headers (CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS in production)
- **Per-request CSP nonce + 82 build-time script hashes** — no `unsafe-inline`/`unsafe-eval` in production scripts
- **Rate limiting** — auth 5/min, API 60/min, general 100/min, env-overridable (`RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_API_MAX`, `RATE_LIMIT_GENERAL_MAX`), in-process or Upstash Redis store
- **`httpOnly` active-org cookie** — org context resolved server-side (XSS-safe)
- **Service-role key is server-only**; the browser only ever holds the anon key (RLS-restricted)
- **Soft deletes** on expenses (`is_deleted` + `deleted_at`)
- **Audit logging** of sensitive admin actions via the `log_audit_event` RPC
- **Fail-open middleware** with `MIDDLEWARE_FAIL_CLOSED=1` opt-in for admin/suspension checks
- Server actions re-validate authorization on every call (defense in depth)

---

## Getting Started

### Prerequisites

- Node.js 20+ (CI uses 22)
- npm
- A Supabase account (free tier works)

### Installation

```bash
git clone https://github.com/kafura0/expense_tracker.git
cd expense_tracker
npm install
cp .env.example .env.local   # then fill in your values
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server/scripts only) |
| `NEXT_PUBLIC_SITE_URL` | No | Deployed URL for auth redirects (defaults to localhost:3000) |
| `RESEND_API_KEY` | No | Transactional email (invites, onboarding) |
| `DEV_EMAIL_LOG` | No | Log email to console instead of sending (dev convenience) |
| `UPSTASH_REDIS_REST_URL` | No | Shared rate-limit store (fallback: in-process) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash token (must accompany URL) |
| `RATE_LIMIT_AUTH_MAX` | No | Auth requests per minute (default `5`) |
| `RATE_LIMIT_API_MAX` | No | API requests per minute (default `60`) |
| `RATE_LIMIT_GENERAL_MAX` | No | General requests per minute (default `100`) |
| `MIDDLEWARE_FAIL_CLOSED` | No | `1` enables fail-closed admin/suspension checks |
| `SUPABASE_MGMT_TOKEN` | No | Management API token for schema-verification scripts |

> Find your Supabase keys under **Project Settings → API**. Never commit `.env.local`.

### Database Setup

Apply the migrations in order **via the Supabase Management API** (never the SQL Editor or `supabase db push`):

```bash
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_tenancy_and_security.sql
supabase/migrations/002_performance_optimization.sql
supabase/migrations/003_onboarding.sql
supabase/migrations/004_messages_table.sql
supabase/migrations/005_invites_and_solo_support.sql
supabase/migrations/006_budgets.sql
supabase/migrations/007_income_and_public_plans.sql
supabase/migrations/008_announcements_and_suspension.sql
supabase/migrations/009_super_admin_profile_updates.sql
supabase/migrations/010_unify_org_member_write.sql
supabase/migrations/011_remove_legacy_org_roles.sql
supabase/migrations/012_security_hardening.sql
supabase/migrations/013_org_administration.sql
supabase/migrations/014_accept_invite_expired_persist.sql
supabase/migrations/014_query_performance.sql
```

Each file is applied with `POST https://api.supabase.com/v1/projects/{project_ref}/database/query`
(Authorization: `Bearer $SUPABASE_ACCESS_TOKEN`), body `{ "query": "<file contents>" }`.

### Seed Demo Data

The canonical seeder creates **5 demo users**, one org ("Carter Enterprises"), 6 months of expenses
(org-wide USD + solo KES), and real budget rows per category:

```bash
node --env-file=.env.local scripts/seed-test-users.mjs
```

A legacy seeder (100 expenses over 90 days for `client@demo.com`) also ships:

```bash
npm run seed
```

### Start the Development Server

```bash
npm run dev              # default port 3000
npm run dev -- -p 3003   # or pin a specific port
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@ledgerly.app` | `Admin@123456789!` |
| Org Admin | `orgadmin@ledgerly.app` | `OrgAdmin@123!` |
| Manager | `manager@ledgerly.app` | `Manager@123!` |
| Client | `client@ledgerly.app` | `Client@123!` |
| Solo | `solo@ledgerly.app` | `Solo@123!` |

Personas seeded: **Sarah Mitchell** (Super Admin) · **James Carter** (Org Admin, Carter Enterprises) · **Emily Chen** (Manager) · **David Park** (Client) · **Alex Rivera** (Solo).

---

## Testing

### Unit & integration — Vitest

**200 tests across 25 files** — run with `npm test` (or `npm run test:coverage` for coverage).

| Area | Files | What's covered |
|------|-------|----------------|
| `tests/unit/` | 22 files | VAT, currency/totals, exchange-rate service + base rates, rate limiting, CSP/security headers, CSRF, password rules, expense schema, PDF/CSV export, schemas, caching, category icons, audit logger, date/time, middleware mode, utils |
| `tests/integration/` | 2 files | Expense server actions, API routes |

### End-to-end — Playwright

**21 E2E tests** (`npm run test:e2e`, Chromium):

| Spec | Coverage |
|------|----------|
| `smoke.spec.ts` | Landing page, login/signup render, full security-header assertions (CSP nonce + hashes, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`) |
| `public-routes.spec.ts` | All 10 public routes render (title + key form elements) |
| `route-protection.spec.ts` | Unauthenticated access to protected, admin, and API routes redirects to `/login` (asserted at the 307 layer) |

Configuration notes:
- `bypassCSP: true` — the app's strict hash/nonce CSP would otherwise block Playwright's injected utility scripts
- The web server (production build in CI, dev locally) runs with relaxed `RATE_LIMIT_*_MAX` env vars so the suite never trips the auth rate limiter
- First install browsers with `npm run test:e2e:install`

---

## CI / CD

GitHub Actions (`.github/workflows/ci.yml`) runs four gated jobs on push to `main`/`develop` and PRs to `main`:

```
lint → test → e2e → build
```

- **lint** — ESLint + `tsc --noEmit`
- **test** — Vitest with coverage (artifacts uploaded, 7-day retention)
- **e2e** — Playwright against a production build (`npm run build && npm run start`), chromium installed with system deps, report uploaded on failure
- **build** — deterministic two-pass production build with CSP hash verification

Secrets required for e2e/build jobs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Deterministic build: `next build` → generate CSP hashes → `next build` → verify |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint (zero-error baseline) |
| `npx tsc --noEmit` | TypeScript type check |
| `npm test` | Run unit/integration suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:e2e` | Run Playwright E2E suite |
| `npm run test:e2e:install` | Install Playwright chromium |
| `node --env-file=.env.local scripts/seed-test-users.mjs` | Seed 5 demo users + org + expenses |
| `npm run seed` | Legacy seeder (100 expenses / 90 days) |

---

## PWA

Ledgerly is a progressive web app:

- Web app manifest with theme color and icons
- Service worker registration (`src/features/pwa/`)
- Install prompt for mobile/desktop
- Mobile-first responsive layout with bottom-nav-aware toasts

---

## Design System

- **Dark-first**: background `#0a0f1e`, cards `#111827`, borders `#1e293b`
- **Primary**: emerald `#34d399` · **Secondary**: indigo `#818cf8`
- Tokenized via Tailwind v4 `@theme inline` — `text-foreground`, `bg-card`, `border-border`, `text-primary-foreground`, etc.
- Chart palette (`chart-1`…`chart-5`) + glassmorphic cards (`glass-card`), gradient borders, and entrance animations

> Deprecated tokens (`text-on-surface`, `bg-surface-container`, `border-outline-variant`, …) must not be used.

---

## Documentation

Project docs live in [`docs/`](docs/):

| Doc | Contents |
|-----|----------|
| `prd.md` | Product requirements |
| `architecture.md` | Technical architecture (deep dive) |
| `API.md` | API reference |
| `ux-design-specs.md` | UX and design specifications |
| `technical-research.md` | Technology research |
| `epics-and-stories.md` | Epics and user stories |
| `sprint-plan.md` | Sprint plan |
| `code-review.md` | Code review findings |
| `implementation-readiness-report.md` | Readiness assessment |
| `assessment.md` | Project assessment |
| `deferred-work.md` | Deferred backlog |
| `PREMIUM_AUDIT.md` | Premium audit findings |
| `ANSWERS.md` | Decision log / Q&A |
| `demo.mp4` | Dashboard walkthrough video |

---

## Deployment

### Vercel (Recommended)

```bash
# Push to GitHub — auto-deploys on main
git push origin main
```

Or via CLI:

```bash
npx vercel --prod
```

Set the [environment variables](#environment-variables) in the Vercel dashboard. `NEXT_PUBLIC_SITE_URL` should point to the production deployment URL.

---

## Roadmap

- [x] Real `budgets` table + budget-vs-actual analytics on dashboards and Categories
- [x] Per-user expenses for org clients (own-expense dashboards) and spend-by-member leaderboards for managers
- [x] Wire Reports page to real query data (replacing mocks)
- [x] Rich 6-month seed data across all personas (USD + KES)
- [x] Consolidated dashboard queries (4 parallel round trips)
- [x] Deterministic build-time CSP with 82 script hashes
- [x] Real E2E suite (21 tests) gating CI

---

## License

Private — not for distribution.
