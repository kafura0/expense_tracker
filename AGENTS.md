# Ledgerly - Project Context

## Overview
Premium SaaS expense tracker built with Next.js 16, Supabase, Tailwind CSS v4. Dark-first design with emerald (#34d399) primary and indigo (#818cf8) secondary. PWA-enabled.

## Architecture
- **Pattern:** Feature-Sliced Design (FSD)
- **Framework:** Next.js 16.2.10 (Turbopack)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (email/password + OTP)
- **UI:** Custom design system, Tailwind CSS v4, Lucide icons, Recharts
- **Testing:** Vitest (246 tests across 29 files) + Playwright E2E (smoke, route protection, public routes, features)
- **Lint:** ESLint (zero errors)
- **Deploy:** Vercel (auto-deploy on push to main)

## User Model
| Role | Description |
|------|-------------|
| **Super Admin** | Full system access, client roster, announcements. Home is `/admin` (middleware redirects them away from `/dashboard`). |
| **Org Member** | Any organization member (manager/client roles no longer differentiated — one org-wide view). |
| **Solo** | Independent user, no org required, personal expense tracking |

> Org personas are `solo | org | platform-admin` in `src/features/dashboard/scope.ts`. DB roles are `super_admin` (platform staff) and `member` (any org member) — the legacy `manager`/`client` roles were removed in migration 011. `can_write_in_org()` grants every org member write access.

## Supabase
- **Project ref:** `weitlewvoufvgfpkryvg`
- **URL:** `https://weitlewvoufvgfpkryvg.supabase.co`
- **Migrations:** `supabase/migrations/` (20 files, uniquely numbered 001–020)
- **Schema changes:** All future Supabase schema changes MUST be applied via the **Management API** (not direct SQL/psql, not the Supabase CLI `db push`). Author the migration file under `supabase/migrations/` for versioning, then apply it through the Management API endpoint (e.g. `POST /v1/projects/{ref}/database/query`).
- **RLS helpers:** `is_super_admin()`, `is_org_member()`, `can_write_in_org()`, `can_admin_org()`, `is_solo_user()`, `is_row_owner()`
- **Roles:** `org_members.role` is `super_admin | org_admin | member`. `super_admin` = platform staff (owns `/admin`); `org_admin` = org-level admin (roster/invites/org-settings); `member` = plain write access.
- **Audit logging:** All app audit writes go through the `log_audit_event` RPC (pinned vocabulary in `src/shared/lib/audit-logger.ts`). Never write `audit_logs` directly from app code; the service-role key has no write path to the table.

## Seed Data
```bash
node --env-file=.env.local scripts/seed-test-users.mjs
```
The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment — never hardcodes credentials.

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
npm run dev          # Dev server (port 3002 via cmd background process)
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
- **Git LFS** is enabled: media patterns (`*.mp4`, `*.webm`, `*.mp3`, `*.gif`, `*.avif`) are LFS-tracked via `.gitattributes` — commit them normally, LFS stores the blobs. Existing media committed before `.gitattributes` are regular blobs (rewriting history to LFS would require a force-push).
- `Button` component uses Radix Slot v1.3.0 on React 19 — `asChild` path is separate
- `useSearchParams` pages must be wrapped in `<Suspense>`
- Dev server port 3002 via cmd background process
- Toast notifications use `bottom-20 md:bottom-4` to avoid mobile bottom nav
