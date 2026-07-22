# Ledgerly

Personal expense tracking web application built with Next.js, Supabase, and Tailwind CSS.

## Features

- Expense tracking with categories, currencies, and VAT support
- Multi-currency support via Frankfurter exchange rate API with cached rates
- Dashboard with KPI cards, charts, and activity feed
- Settings for base currency, VAT rate, and theme
- PWA installable on mobile and desktop
- Row Level Security (RLS) on all tables — each user only sees their own data
- Demo mode with 100 seeded expenses

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Recharts
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Deployment:** Vercel
- **Exchange Rates:** Frankfurter API (ECB data)

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm run dev
```

Open http://localhost:3000

### Demo Credentials

- Email: `admin@ledgerly.app`
- Password: `123456`

### Seed Demo Data

```bash
npx tsx scripts/seed.ts
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_SITE_URL` | Deployed URL for auth redirects |

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    (dashboard)/          # Dashboard layout group
    auth/                 # OAuth callback handler
    login/                # Login page
    register/             # Registration page
    reset-password/       # Password reset request
    update-password/      # Password reset form
  features/               # Feature modules (auth, expenses, dashboard, settings, export)
  entities/               # Domain entities (expense, category, exchange-rate, profile, settings)
  shared/                 # Shared UI components, lib, types
scripts/
  seed.ts                 # Database seeder
```

## Demo

https://github.com/kafura0/expense_tracker/blob/main/docs/demo.mp4

## Deployment

```bash
npx vercel --prod
```

## License

Private
