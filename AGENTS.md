# Ledgerly - Project Context

## Overview
Premium SaaS expense tracker built with Next.js 16, Supabase, Tailwind CSS v4. Dark-first design with emerald (#34d399) primary and indigo (#818cf8) secondary. PWA-enabled.

## Architecture
- **Pattern:** Feature-Sliced Design (FSD)
- **Framework:** Next.js 16.2.10 (Turbopack)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (email/password + OTP)
- **UI:** Custom design system, Tailwind CSS v4, Lucide icons, Recharts
- **Testing:** Vitest (59 tests across 6 files)
- **Lint:** ESLint (zero errors)
- **Deploy:** Vercel (auto-deploy on push to main)

## Three-User Model
| Role | Description |
|------|-------------|
| **Super Admin** | Full system access, user management, announcements |
| **Solo Client** | Independent user, no org required, personal expense tracking |
| **Org (Admin/Manager/Client)** | Multi-tenant organization with role-based access |

## Supabase
- **Project ref:** `weitlewvoufvgfpkryvg`
- **URL:** `https://weitlewvoufvgfpkryvg.supabase.co`
- **Migrations:** `supabase/migrations/` (6 files, 001-005)
- **RLS helpers:** `is_super_admin()`, `is_org_member()`, `can_write_in_org()`, `is_solo_user()`, `is_row_owner()`

## Seed Data
```bash
node scripts/seed-test-users.mjs
```

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@ledgerly.app | Admin@123456789! |
| Org Admin | orgadmin@ledgerly.app | OrgAdmin@123! |
| Manager | manager@ledgerly.app | Manager@123! |
| Client | client@ledgerly.app | Client@123! |
| Solo | solo@ledgerly.app | Solo@123! |

## Design Tokens
- **Primary:** `#34d399` (emerald)
- **Secondary:** `#818cf8` (indigo)
- **Background:** `#0a0f1e`
- **Card:** `#111827`
- **Border:** `#1e293b`
- **Text classes:** `text-foreground`, `text-muted-foreground`, `text-primary-foreground`
- **Background classes:** `bg-background`, `bg-card`, `bg-muted`
- **Border classes:** `border-border`
- **DO NOT USE:** `text-on-surface`, `text-on-surface-variant`, `text-on-primary`, `bg-surface-container`, `border-outline-variant` — these were deprecated and replaced

## Route Structure
```
/                           Landing page (public, centered text)
/login                      Login (public)
/signup                     Solo signup (public)
/org-signup                 Org signup (public)
/verify-otp                 OTP verification (public)
/reset-password             Reset password (public)
/update-password            Update password (public)
/request-access             Request access form (public)
/invite                     Invite accept (public)
/onboarding                 Onboarding (auth required)
/dashboard                  Main dashboard (auth + org)
/expenses                   Expense list + CRUD (auth + org)
/reports                    Reports (auth + org)
/categories                 Categories (auth + org)
/settings                   Settings (auth + org)
/admin                      Super Admin panel (auth + super_admin)
```

## Key Commands
```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest
npx vercel --prod    # Deploy to Vercel
```

## Git Remote
```
https://github.com/kafura0/expense_tracker.git
```

## Vercel Project
- **URL:** https://expense-tracker-iq7pempv3-joan-kaburas-projects.vercel.app
- **Alias:** https://expense-tracker-ruddy-five-r8k6s4r6zg.vercel.app

## Important Notes
- Global `p { text-center }` was REMOVED from globals.css — only landing/auth root divs have `text-center`
- Landing page header and mobile bottom nav have `text-left` to prevent centering
- Dashboard pages are left-aligned (no text-center)
- All auth pages have `text-center` on root div
- Exchange rate fallback: Frankfurter API + hardcoded USD/KES = 153.5
- `Button` component uses Radix Slot v1.3.0 on React 19 — `asChild` path is separate
- `useSearchParams` pages must be wrapped in `<Suspense>`
- Dev server port 3002 via cmd background process
- Toast notifications use `bottom-20 md:bottom-4` to avoid mobile bottom nav
