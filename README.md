# ExpenseOS

> Premium personal finance and expense management platform.

ExpenseOS helps individuals understand where their money goes through intuitive dashboards, analytics, VAT calculations, and multi-currency support.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, shadcn/ui
- **Backend:** Next.js Server Actions, Route Handlers
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth
- **Deployment:** Vercel

## Features

- Dashboard with KPIs, charts, and insights
- Full expense CRUD with search, sort, filter, pagination
- Multi-currency support (KES, USD, EUR, GBP, CAD, AUD, JPY)
- Configurable VAT/tax engine (default: Kenya 16%)
- CSV and PDF export
- PWA with offline support
- Light/Dark/System themes

## Getting Started

```bash
npm install
npm run dev
```

## Architecture

Feature-Sliced Design (FSD) — modular, scalable, and maintainable.

```
src/
  app/        # Next.js App Router pages
  widgets/    # Composed UI blocks
  features/   # User interactions
  entities/   # Business objects
  shared/     # Reusable utilities
  processes/  # Cross-cutting workflows
  styles/     # Global styles and tokens
```

## License

MIT
