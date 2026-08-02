# Ledgerly

Premium multi-tenant SaaS expense tracking platform — built with **Next.js 16**, **Supabase**, and **Tailwind CSS v4**. Dark-first design, real-time exchange rates, VAT support, role-based dashboards, and rich analytics.

**Live:** [expense-tracker-iq7pempv3-joan-kaburas-projects.vercel.app](https://expense-tracker-iq7pempv3-joan-kaburas-projects.vercel.app) · **Alias:** [expense-tracker-ruddy-five-r8k6s4r6zg.vercel.app](https://expense-tracker-ruddy-five-r8k6s4r6zg.vercel.app)
**Repository:** [github.com/kafura0/expense_tracker](https://github.com/kafura0/expense_tracker)

---

## Table of Contents

- [Features](#features)
- [Three-User Model](#three-user-model)
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
- Persona-tailored dashboards — every role gets a distinct layout (Solo, Client, Manager, Org Admin, Platform Admin)
- Org-aware widgets that scope to the active org (or to the user's own data when solo)
- Budget-vs-actual tracking, team spend leaderboard, org health card, and announcements
- Organization (org) management with member roles, a role badge, and a multi-org switcher
- Invite-based onboarding (`manager` / `client`), access-request flow, and OTP email verification

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
- Middleware with session management, rate limiting, and security headers
- Audit logging, 59 unit/integration tests, zero-lint baseline

**Polish**
- PWA installable on mobile and desktop (manifest + service worker)
- Dark-first glassmorphic UI with animated charts and skeleton loading states
- Fully responsive with a mobile drawer navigation

---

## Three-User Model

| Role | Description |
|------|-------------|
| **Super Admin** | Full system access — user/org management, announcements, message replies. Has no personal expense scope. |
| **Solo Client** | Independent user with no org — personal expense tracking only. |
| **Org — Admin** | Org owner. Full write access + member management + subscription visibility. |
| **Org — Manager** | Team oversight — manages org expenses, categories, budgets, and invites. |
| **Org — Client** | Contributor — records and views expenses (org-scoped) and personal budgets. |

### Permission matrix

| Capability | Super Admin | Org Admin | Org Manager | Org Client | Solo |
|---|---|---|---|---|---|
| Manage expenses | ✅ (all) | ✅ (org) | ✅ (org) | ➖ (view org + own) | ✅ (own) |
| Manage categories | ✅ | ✅ | ✅ | ➖ (view) | ✅ (own) |
| Budgets | ✅ | ✅ | ✅ | ✅ (own) | ✅ (own) |
| Invite members | ✅ | ✅ | ✅ | ➖ | ➖ |
| Manage org/subscription | ✅ | ✅ | ➖ | ➖ | ➖ |
| View org analytics | ✅ | ✅ | ✅ | ✅ (own + org) | ➖ |
| Admin panel | ✅ | ➖ | ➖ | ➖ | ➖ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.10 (App Router, Turbopack) |
| Language | TypeScript |
| UI | Tailwind CSS v4, Radix UI primitives, Lucide icons, Framer Motion |
| Charts | Recharts |
| State | TanStack React Query, React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage) |
| Auth | Supabase Auth — email/password + OTP, password reset |
| PDF / CSV | jsPDF + jspdf-autotable, native CSV generation |
| Exchange Rates | Frankfurter API (ECB data) with local caching |
| Testing | Vitest, Testing Library, JSDOM |
| Deployment | Vercel (auto-deploy on push to `main`) |
| Architecture | Feature-Sliced Design (FSD) |

---

## Architecture

Ledgerly follows **Feature-Sliced Design (FSD)** — a layered frontend architecture where each layer depends only on the layers beneath it.

```
┌────────────────────────────────────────────┐
│  app/   — Next.js routes, pages, layouts   │
├────────────────────────────────────────────┤
│  widgets/ — composable blocks (dashboard)  │
├────────────────────────────────────────────┤
│  features/ — user-facing feature modules   │
├────────────────────────────────────────────┤
│  entities/ — domain models + repositories  │
├────────────────────────────────────────────┤
│  shared/   — UI kit, libs, types           │
└────────────────────────────────────────────┘
```

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
│   ├── page.tsx                    # Public landing page
│   ├── layout.tsx / globals.css    # Root layout + design tokens
│   └── middleware.ts               # Session, rate limiting, security headers
├── widgets/dashboard/              # KPI cards, charts, activity, insights, summaries,
│                                   # budget, leaderboard, org health, announcements
├── features/                       # auth, expenses, budgets, admin, org, invites, onboarding,
│                                   # exchange-rates, export, pwa, settings
├── entities/                       # org, invite, expense, budget, exchange-rate
├── shared/                         # ui/ (Button, Card, Dialog, Badge, …)
│                                   # lib/ (supabase clients, org context, rate-limit,
│                                   #       security-headers, utils)
supabase/migrations/                # 7 SQL migrations (001–006)
scripts/
├── seed-test-users.mjs             # Canonical seeder — 5 demo users + org
└── seed.ts                         # Legacy seeder — 90 days / 100 expenses
docs/                               # PRD, architecture, API, UX, sprint, code review
tests/
├── unit/                           # VAT, utils, PDF, CSV
└── integration/                    # expense actions, API routes
```

---

## Route Map

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Landing page |
| `/login` | Public | Sign in |
| `/signup` | Public | Solo signup |
| `/org-signup` | Public | Organization signup |
| `/verify-otp` | Public | OTP email verification |
| `/reset-password` | Public | Request password reset |
| `/update-password` | Public | Set new password |
| `/request-access` | Public | Request org access |
| `/invite` | Public | Accept org invite |
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

Seven migrations manage the schema (run in order). **Supabase project ref:** `weitlewvoufvgfpkryvg`

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables (`profiles`, `categories`, `expenses`, `settings`, `exchange_rates`) + `handle_new_user` trigger + RLS |
| `002_tenancy_and_security.sql` | `plans`, `organizations`, `org_members`, `client_requests`, `subscriptions`, `audit_logs`; adds `org_id` columns; RLS rewrite; helper functions; `create_org_for_user` + `approve_client_request` RPCs; plan seeds |
| `002_performance_optimization.sql` | Composite indexes for dashboard date-range analytics |
| `003_onboarding.sql` | `profiles.onboarding_completed` flag + index |
| `004_messages_table.sql` | `messages` (support tickets + announcements) with RLS |
| `005_invites_and_solo_support.sql` | `invites` table + solo-user RLS policies + `is_solo_user` / `is_row_owner` helpers |
| `006_budgets.sql` | `budgets` table (user/org scopes), RLS policies, `set_updated_at` trigger, dedupe unique index via `COALESCE(org_id, …)` |

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Per-user profile (display name, avatar, org) |
| `categories` | Expense categories (personal or org-scoped) |
| `expenses` | Core transactions (`amount_cents`, currency, VAT/tax fields, soft-delete) |
| `settings` | Per-user preferences (base currency, VAT rate, theme) |
| `exchange_rates` | Cached FX rates |
| `plans` | Subscription tiers (Free / Pro / Enterprise) |
| `organizations` | Tenants (status: pending / active / suspended / cancelled) |
| `org_members` | User ↔ org mapping with role (`super_admin` / `manager` / `client`) |
| `client_requests` | Access-request form submissions |
| `subscriptions` | Per-org billing state |
| `audit_logs` | Sensitive action audit trail |
| `messages` | Support tickets + announcements |
| `invites` | Org member invites (token-based, 7-day expiry) |
| `budgets` | Per-category budgets (`user` personal / `org` org-wide) |

---

## Security Model

**Row Level Security (RLS)** is enforced on every data table. Access is driven by a set of security-definer helper functions:

| Helper | Definition |
|--------|------------|
| `is_super_admin()` | User holds `super_admin` role in any org |
| `is_org_member(org_id)` | User belongs to the given org |
| `can_write_in_org(org_id)` | User is `super_admin` or `manager` in the org |
| `get_org_role(org_id)` | Returns the user's role in an org |
| `user_org_ids()` | All org IDs the user belongs to |
| `is_solo_user()` | User has no org memberships |
| `is_row_owner(user_id)` | Row belongs to the authenticated user |

**Additional controls**
- **Middleware** (`src/middleware.ts`) runs on all non-static routes: session refresh, in-memory rate limiting, and security headers
- **`httpOnly` active-org cookie** — org context is resolved server-side via server actions (XSS-safe)
- **Service-role key is server-only**; the browser only ever holds the anon key (RLS-restricted)
- **Soft deletes** on expenses (`is_deleted` + `deleted_at`)
- **Audit logging** of sensitive admin actions
- Server actions re-validate authorization on every call (defense in depth)

---

## Getting Started

### Prerequisites

- Node.js 18+
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
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server only) |
| `NEXT_PUBLIC_SITE_URL` | No | Deployed URL for auth redirects (defaults to localhost:3000) |

> Find your keys in the Supabase dashboard under **Project Settings → API**. Never commit `.env.local`.

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
```

Each file is applied with `POST https://api.supabase.com/v1/projects/{project_ref}/database/query`
(Authorization: `Bearer $SUPABASE_ACCESS_TOKEN`), body `{ "query": "<file contents>" }`.

### Seed Demo Data

The canonical seeder creates **5 demo users**, one org ("Carter Enterprises"), 6 months of expenses
(org-wide USD + solo KES), and real budget rows per category:

```bash
node scripts/seed-test-users.mjs
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

**59 tests across 6 files** — run with `npm test` (Vitest).

| Test File | Type | Coverage |
|-----------|------|----------|
| `tests/unit/vat.test.ts` | Unit | VAT calculation logic |
| `tests/unit/utils.test.ts` | Unit | Shared utilities |
| `tests/unit/pdf-export.test.ts` | Unit | PDF generation |
| `tests/unit/csv-export.test.ts` | Unit | CSV generation |
| `tests/integration/expense-actions.test.ts` | Integration | Expense server actions |
| `tests/integration/api-routes.test.ts` | Integration | API routes |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint (zero-error baseline) |
| `npm run seed` | Legacy seeder (100 expenses / 90 days) |
| `npm test` | Run test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Run tests with Vitest UI |

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
| `architecture.md` | Technical architecture |
| `API.md` | API reference |
| `ux-design-specs.md` | UX and design specifications |
| `technical-research.md` | Technology research |
| `epics-and-stories.md` | Epics and user stories |
| `sprint-plan.md` | Sprint plan |
| `code-review.md` | Code review findings |
| `implementation-readiness-report.md` | Readiness assessment |

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

---

## License

Private — not for distribution.
