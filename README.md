# Ledgerly

Premium SaaS expense tracking platform built with Next.js 16, Supabase, and Tailwind CSS. Track expenses across multiple currencies with real-time exchange rates, VAT support, and beautiful data visualizations.

**Live:** [https://expense-tracker-lrfy9uzif-joan-kaburas-projects.vercel.app](https://expense-tracker-lrfy9uzif-joan-kaburas-projects.vercel.app)

---

## Features

- Expense tracking with categories, multi-currency support, and VAT calculations
- Real-time exchange rates via Frankfurter API (ECB data) with local caching
- Interactive dashboard with KPI cards, charts, and activity feed (Recharts)
- Admin panel with client management, error logs, messages, and plan management
- CSV and PDF export with date range and category filtering
- Row Level Security (RLS) on every table — each user sees only their own data
- PWA installable on mobile and desktop
- Dark-themed premium UI with glass morphism and gradient effects
- OTP-based email verification and password reset flow
- Onboarding wizard for new users to configure currency and VAT settings
- 100-seeded demo expenses for instant evaluation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | Tailwind CSS v4, Radix UI, Framer Motion, Lucide icons |
| Charts | Recharts |
| State | TanStack React Query, React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage) |
| PDF | jsPDF + jspdf-autotable |
| Exchange Rates | Frankfurter API (ECB data) |
| Testing | Vitest, Testing Library, JSDOM |
| Deployment | Vercel |
| Architecture | Feature-Sliced Design (FSD) |

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@ledgerly.app` | `Admin@123456789!` |
| Demo Client | `client@demo.com` | `Client@123456789!` |

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
```

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Deployed URL for auth redirects |

### Database Setup

Run the following migrations in the Supabase SQL Editor in order:

```bash
supabase/migrations/001_initial_schema.sql   # Core tables + RLS
supabase/migrations/002_add_profiles.sql     # Profile roles + status CHECK constraints
supabase/migrations/002_add_vat_rate_to_settings.sql  # VAT rate column
supabase/migrations/003_add_title_column.sql # Expense title column
supabase/migrations/004_messages_table.sql   # Support messages with CHECK constraints
```

### Seed Demo Data (Optional)

```bash
npm run seed
```

Creates 10 categories, 100 sample expenses over 90 days, and user settings.

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (dashboard)/              # Dashboard layout group (protected)
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   └── settings/page.tsx     # User settings
│   ├── (onboarding)/             # Onboarding flow
│   │   └── onboarding/page.tsx
│   ├── admin/page.tsx            # Admin panel (4 tabs)
│   ├── auth/                     # OAuth callback handler
│   ├── login/page.tsx            # Login
│   ├── signup/page.tsx           # Registration
│   ├── verify-otp/page.tsx       # OTP verification
│   ├── reset-password/page.tsx   # Password reset request
│   ├── update-password/page.tsx  # Password reset form
│   └── page.tsx                  # Public landing page
├── features/                     # Feature modules (FSD)
│   ├── auth/                     # Login, signup, OTP, password reset
│   ├── expenses/                 # Expense CRUD, forms, filters
│   ├── dashboard/                # Dashboard widgets, KPI cards, charts
│   ├── settings/                 # User settings
│   ├── export/                   # CSV + PDF export
│   └── admin/                    # Admin panel actions
├── entities/                     # Domain entities
│   ├── expense/                  # Expense model + API
│   ├── category/                 # Category model
│   ├── exchange-rate/            # Exchange rate API client
│   ├── profile/                  # User profile
│   └── settings/                 # User settings
├── shared/                       # Shared utilities
│   ├── ui/                       # Reusable UI components (Button, Card, Input, etc.)
│   ├── lib/                      # Supabase client, utilities
│   └── types/                    # TypeScript types
supabase/
└── migrations/                   # Database migrations (001–004)
tests/
├── integration/                  # Integration tests (API routes, actions, CSV)
├── unit/                         # Unit tests (components, entities)
scripts/
└── seed.ts                       # Database seeder
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed demo data into Supabase |
| `npm run test` | Run test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Run tests with Vitest UI |

---

## Architecture

Ledgerly follows **Feature-Sliced Design (FSD)** — a scalable frontend architecture pattern:

- **`app/`** — Next.js routes and page components
- **`features/`** — User-facing features (auth, expenses, dashboard, export, admin)
- **`entities/`** — Domain models and data access (expense, category, profile, settings)
- **`shared/`** — Reusable UI components, Supabase client, types, utilities

### Security

- **Row Level Security (RLS)** enforced on all database tables
- **CHECK constraints** on roles (`admin`/`client`), statuses, message types, and priorities
- **Middleware** protects all `/dashboard`, `/settings`, `/admin`, and `/onboarding` routes
- **Service role key** is server-only — never exposed to the client bundle
- **Supabase anon key** is public but RLS policies restrict data access per user

---

## Testing

The test suite covers 59 tests across 6 files:

| Test File | Type | Coverage |
|-----------|------|----------|
| `tests/integration/api-routes.test.ts` | API routes | Exchange rate + expense endpoints |
| `tests/integration/expense-actions.test.ts` | Server actions | CRUD operations |
| `tests/integration/csv-export.test.ts` | Export | CSV generation and download |
| `tests/unit/components.test.tsx` | UI components | Button, Card, Input rendering |
| `tests/unit/expenses.test.ts` | Entity logic | Expense calculations |
| `tests/unit/csv-generator.test.ts` | Utility | CSV content generation |

Run all tests:

```bash
npm run test
```

---

## Deployment

### Vercel (Recommended)

```bash
# Push to GitHub
git push origin main

# Import in Vercel dashboard, add environment variables, deploy
```

Or via CLI:

```bash
npx vercel --prod
```

### Environment Variables in Vercel

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel deployment URL |

---

## Database Schema

Five migrations manage the schema:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | Core tables: `profiles`, `categories`, `expenses`, `settings`, `exchange_rates` + RLS + auto-seeding triggers |
| `002_add_profiles.sql` | Role CHECK (`admin`/`client`), status CHECK (`active`/`suspended`/`pending`) |
| `002_add_vat_rate_to_settings.sql` | `vat_rate` column on `settings` |
| `003_add_title_column.sql` | `title` column on `expenses` |
| `004_messages_table.sql` | `messages` table with type CHECK (`support`/`announcement`), status CHECK (`open`/`replied`/`closed`), priority CHECK (`low`/`normal`/`high`/`urgent`) |

---

## License

Private — not for distribution.
