# Ledgerly — Product Requirements Document

**Version:** 1.0.0
**Date:** 2026-07-26
**Author:** John (Product Manager)
**Status:** Active
**Last Audit Score:** 4.5/10 feature completeness

---

## Table of Contents

1. [Product Overview & Vision](#1-product-overview--vision)
2. [User Personas](#2-user-personas)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Feature Specifications by Page](#5-feature-specifications-by-page)
6. [Data Model](#6-data-model)
7. [Integration Requirements](#7-integration-requirements)
8. [Success Metrics](#8-success-metrics)
9. [Release Plan](#9-release-plan)

---

## 1. Product Overview & Vision

### 1.1 Vision Statement

Ledgerly is a premium SaaS expense management platform that transforms chaotic financial data into precise, actionable intelligence. It serves solo professionals, finance teams, and organizations with bank-grade security and real-time analytics.

### 1.2 Current State

| Dimension | Score | Notes |
|-----------|-------|-------|
| Architecture | 6.5/10 | FSD structure, Supabase backend, solid foundation |
| Product Completeness | 4.5/10 | Reports + Categories hardcoded, no export, no billing |
| Competitive Position | 4.5/10 | Landing page promises ~8 features that don't exist |
| Design Polish | 7.5/10 | Strong design system, accessibility gaps |
| Code Quality | 7.0/10 | 59 tests, solid security, some DRY violations |
| Documentation | 7.0/10 | README exists, no API/architecture docs |

### 1.3 Target Audiences

1. **Solo professionals** tracking personal/business expenses (free tier)
2. **Small finance teams** (2-10 people) managing shared expenses (Pro tier)
3. **Organizations** (10-100+) needing role-based access and audit trails (Enterprise tier)

### 1.4 Key Differentiators

- Dark-first, premium design (not a generic white-label tool)
- Multi-tenant org model with role-based access (Super Admin / Manager / Client)
- Multi-currency with real-time exchange rates
- VAT/tax calculations built-in
- PWA-enabled for mobile expense capture

---

## 2. User Personas

### 2.1 Super Admin (Platform Operator)

| Attribute | Detail |
|-----------|--------|
| **Role** | System administrator, Ledgerly internal team |
| **Goals** | Manage all organizations, users, billing; monitor platform health |
| **Frustrations** | No visibility into per-org usage, manual user provisioning |
| **Key Pages** | `/admin` (Users, Clients, Invites, Announcements, Messages tabs) |
| **Permissions** | Full CRUD on all tables, org suspension, user management |

**Acceptance Criteria:**
- Can view all users across all organizations with search/filter
- Can suspend/activate organizations instantly
- Can send platform-wide announcements
- Can reply to and close support tickets
- Can invite new users with role assignment (manager/client)

### 2.2 Solo Client (Individual User)

| Attribute | Detail |
|-----------|--------|
| **Role** | Freelancer, consultant, or personal finance tracker |
| **Goals** | Track expenses, categorize spending, export for taxes |
| **Frustrations** | Complexity of team-oriented tools, lack of mobile capture |
| **Key Pages** | `/dashboard`, `/expenses`, `/reports`, `/categories`, `/settings` |
| **Permissions** | CRUD on own expenses, categories, settings (org_id IS NULL) |

**Acceptance Criteria:**
- Sign up without requiring an organization
- Create, edit, delete, duplicate expenses
- Filter/sort expenses by date, amount, category, currency, tax status
- See dashboard KPIs for current month vs. last month
- Export expenses to CSV for tax filing
- Manage personal categories with budgets

### 2.3 Org Admin (Organization Owner/Manager)

| Attribute | Detail |
|-----------|--------|
| **Role** | Business owner, finance director, org creator |
| **Goals** | Oversee team spending, manage members, control budgets |
| **Frustrations** | Can't see per-member spending breakdowns, no approval workflows |
| **Key Pages** | `/dashboard`, `/expenses`, `/reports`, `/categories`, `/settings` + member management |
| **Permissions** | Full CRUD on org data, member management, category management |

**Acceptance Criteria:**
- Create and configure organization during onboarding
- Invite managers and clients via email
- View team-wide dashboard aggregating all member expenses
- Manage shared categories with budget limits
- Export org-wide reports (CSV/PDF)
- View audit log of all org actions

### 2.4 Manager (Org Team Member with Write Access)

| Attribute | Detail |
|-----------|--------|
| **Role** | Accountant, bookkeeper, finance team member |
| **Goals** | Enter expenses on behalf of team, categorize, reconcile |
| **Frustrations** | Can't enter expenses for clients, limited report access |
| **Key Pages** | `/dashboard`, `/expenses`, `/reports`, `/categories` |
| **Permissions** | Full CRUD on org expenses, categories; read-only on settings |

**Acceptance Criteria:**
- Create/edit/delete expenses within the organization
- Manage organization categories and budgets
- View org-wide reports and analytics
- Cannot manage org members or billing (admin-only)
- Can submit support messages to platform admin

### 2.5 Client (Org Member with Read Access)

| Attribute | Detail |
|-----------|--------|
| **Role** | End-user, team member who submits expenses |
| **Goals** | Submit personal expenses, view own spending patterns |
| **Frustrations** | Can't edit others' expenses, limited visibility into team totals |
| **Key Pages** | `/dashboard` (own data only), `/expenses` (own), `/reports` (own) |
| **Permissions** | Read-only on org data; full CRUD on own expenses |

**Acceptance Criteria:**
- View own expenses only (filtered by user_id)
- Submit new expenses for approval
- View personal dashboard and reports
- Cannot see other members' expenses
- Cannot modify categories or org settings

---

## 3. Functional Requirements

### 3.1 Priority Framework

| Priority | Definition | Timeline |
|----------|-----------|----------|
| **P0** | Critical — must ship before any user-facing launch | Sprint 1-2 |
| **P1** | High — core value prop, needed for v1.0 | Sprint 2-3 |
| **P2** | Medium — premium polish, differentiation | Sprint 3-4 |
| **P3** | Low — nice-to-have, post-v1.0 | v2.0+ |

### 3.2 Feature Registry

#### P0 — CRITICAL (Trust + Core Functionality)

| ID | Feature | Status | Description |
|----|---------|--------|-------------|
| F-001 | Landing page truthfulness | NOT DONE | Remove all unimplemented feature claims and fake "Trusted By" logos |
| F-002 | CSRF protection | BROKEN | Dead code — wire into middleware or remove fallback chain |
| F-003 | Rate limiting | BROKEN | In-memory Map — replace with Upstash Redis |
| F-004 | Cache layer | BROKEN | In-memory Map — replace with distributed cache |
| F-005 | Reports page — real data | NOT DONE | Currently 100% hardcoded mock data |
| F-006 | Categories page — real data | NOT DONE | Currently 100% hardcoded mock data |
| F-007 | CSV export | NOT DONE | Export filtered expenses to CSV |
| F-008 | Error boundaries | NOT DONE | Add error.tsx to all dashboard routes |
| F-009 | Invite transaction safety | BROKEN | 5 sequential calls — wrap in Supabase RPC |

#### P1 — HIGH (Core v1.0 Features)

| ID | Feature | Status | Description |
|----|---------|--------|-------------|
| F-010 | Recurring expenses | NOT DONE | Schedule repeating expenses (monthly, weekly, etc.) |
| F-011 | Receipt upload | NOT DONE | Attach image/PDF receipts to expenses |
| F-012 | PDF export | NOT DONE | Export reports and expense lists as PDF |
| F-013 | Budget management | NOT DONE | Set and track budget limits per category |
| F-014 | Admin announcements — functional | NOT DONE | Currently form does nothing — wire to DB insert |
| F-015 | Settings — real email display | NOT DONE | Show actual Supabase auth email, not generated |
| F-016 | Expense stats — full totals | BUG | Stats show page-only total, not full filtered total |
| F-017 | Dual-cookie security fix | SECURITY | Remove document.cookie, use server action only |
| F-018 | Org switch without page reload | BUG | Replace window.location.reload() with queryClient.clear() + router.refresh() |

#### P2 — MEDIUM (Polish + Premium UX)

| ID | Feature | Status | Description |
|----|---------|--------|-------------|
| F-019 | Custom Select component | NOT DONE | Replace native `<select>` with Radix Select |
| F-020 | Custom Checkbox component | NOT DONE | Style "Remember me" and other checkboxes |
| F-021 | Tooltip system | NOT DONE | Add Radix Tooltip for icon-only elements |
| F-022 | Skip-to-content link | NOT DONE | Accessibility — skip navigation link |
| F-023 | Password toggle aria-label | NOT DONE | Accessibility — label password visibility toggles |
| F-024 | Page transitions | NOT DONE | Animate page entry/exit |
| F-025 | Sidebar component extraction | NOT DONE | DRY — extract 70-line duplicate sidebar |
| F-026 | FSD entity repository layers | NOT DONE | Settings actions bypass entity layer |
| F-027 | Mobile bottom nav — remove Settings link | BUG | Landing mobile nav links Settings → /login |

#### P3 — LOW (Post-v1.0)

| ID | Feature | Status | Description |
|----|---------|--------|-------------|
| F-028 | Bank sync (Plaid/Salt Edge) | NOT DONE | Auto-import transactions from bank accounts |
| F-029 | AI-powered insights | NOT DONE | Detect spending anomalies and trends |
| F-030 | Stripe billing integration | NOT DONE | Subscription management, payment processing |
| F-031 | VAT auto-calculation (120+ jurisdictions) | NOT DONE | Automatic tax extraction per jurisdiction |
| F-032 | Multi-currency with historical rates | PARTIAL | Frankfurter API + hardcoded fallback — needs real-time |
| F-033 | API access (Enterprise) | NOT DONE | RESTful API for third-party integrations |
| F-034 | White-label / custom branding | NOT DONE | Custom logos, colors for Enterprise |
| F-035 | Audit log viewer (admin UI) | NOT DONE | DB table exists, no UI to view it |
| F-036 | PWA push notifications | NOT DONE | Expense reminders, budget alerts |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse CI on Vercel |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse CI on Vercel |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse CI on Vercel |
| Time to Interactive (TTI) | < 3.0s | Lighthouse CI on Vercel |
| API response time (p95) | < 200ms | Vercel Analytics |
| Dashboard load (full data) | < 2s | User-perceived |
| Expense list (1000+ records) | < 1s | Paginated query |

### 4.2 Security

| Requirement | Implementation |
|-------------|---------------|
| Authentication | Supabase Auth (email/password + OTP) |
| Authorization | Row-Level Security (RLS) on all Supabase tables |
| CSRF Protection | CSRF token validation on all state-changing requests |
| Rate Limiting | Upstash Redis — 100 req/min per user, 10 req/min for auth endpoints |
| Data Encryption | TLS in transit, Supabase-managed at rest |
| Session Management | Supabase Auth with httpOnly cookies (no dual-cookie bypass) |
| Input Validation | Server-side validation on all server actions |
| Audit Trail | All sensitive actions logged to audit_logs table |

### 4.3 Accessibility

| Requirement | Standard |
|-------------|---------|
| WCAG 2.1 AA compliance | All interactive elements keyboard-navigable |
| Skip-to-content link | Present on all authenticated pages |
| ARIA labels | All icon-only buttons, form inputs, and modals |
| Color contrast | 4.5:1 minimum for normal text, 3:1 for large text |
| Screen reader support | All dynamic content announced via aria-live |
| Focus management | Focus trapped in modals, visible focus indicators |

### 4.4 Reliability

| Requirement | Target |
|-------------|--------|
| Uptime | 99.9% (Vercel + Supabase SLA) |
| Data backup | Supabase automatic daily backups |
| Error recovery | React Error Boundaries on all routes |
| Offline support | PWA with service worker (v2.0) |

### 4.5 Scalability

| Requirement | Target |
|-------------|--------|
| Concurrent users | 1,000+ simultaneous |
| Expense records per org | 100,000+ |
| File storage | Supabase Storage (10MB per receipt, 100MB per org) |

---

## 5. Feature Specifications by Page

### 5.1 Landing Page (`/`)

**Current State:** Displays 6 unimplemented feature claims, fake "Trusted By" logos, pricing that doesn't match DB plans.

**Required Changes:**

| Change | Priority | Acceptance Criteria |
|--------|----------|---------------------|
| Remove "Global Bank Sync" feature card | P0 | No mention of bank sync until F-028 ships |
| Remove "Smart Insights" / "AI-driven" claims | P0 | No mention of AI until F-029 ships |
| Remove "VAT Calculations" (120+ jurisdictions) | P0 | Replace with "Tax tracking" (what actually works) |
| Remove "Bank-Grade Security" (SOC 2 claim) | P0 | Replace with "Encrypted & Secure" (truthful) |
| Remove fake "Trusted By" logos | P0 | Remove section or use placeholder |
| Fix "How It Works" — remove "Connect Your Accounts" | P0 | Step 1 should be "Create Your Account" |
| Fix "How It Works" — remove "Automate Everything" | P0 | Step 2 should be "Track Your Expenses" |
| Fix "How It Works" — rewrite Step 3 | P0 | Step 3: "Gain Insights" (real analytics, not AI) |
| Align pricing with DB plans | P1 | Starter=Free ($0, 50 expenses), Pro=$9.99/mo, Enterprise=Custom |
| Add real dashboard preview screenshot | P1 | Replace placeholder with actual app screenshot |
| Fix "40+ currencies" claim | P1 | Currently supports 7 currencies in settings — update or expand |

**Pricing Alignment (DB vs Landing):**

| Plan | Landing Says | DB Has | Action |
|------|-------------|--------|--------|
| Starter/Free | $0, 100 txns/mo | $0, 50 expenses/mo | Align to DB |
| Pro | $12/mo | $9.99/mo | Align to DB |
| Enterprise | Custom | $29.99/mo | Keep "Custom" on landing, keep DB price |

### 5.2 Dashboard (`/dashboard`)

**Current State:** Working KPI cards, spending trend chart, category chart, recent activity, insights, tax summary, currency summary — all pulling real data from Supabase.

**Required Changes:**

| Change | Priority | Acceptance Criteria |
|--------|----------|---------------------|
| Dashboard layout SSR | P2 | Sidebar extracted, layout becomes Server Component |
| Fix "Budget Used" KPI | P1 | Show actual budget % if budgets exist, else hide card |
| Add budget progress widget | P1 | Show top 3 categories closest to budget limit |
| Add income tracking (future) | P3 | Add income_items table, show net balance |
| Error boundaries | P0 | Add `error.tsx` for `/dashboard` route |

### 5.3 Expenses (`/expenses`)

**Current State:** Fully functional — CRUD, filtering, sorting, pagination, soft delete with undo, duplicate. Stats show page-only totals.

**Required Changes:**

| Change | Priority | Acceptance Criteria |
|--------|----------|---------------------|
| Fix stats to show full filtered totals | P1 | Use Supabase count query, not client-side page array sum |
| Add CSV export button | P0 | Export currently filtered expenses to CSV file |
| Add receipt attachment | P1 | Upload field on expense dialog, store in Supabase Storage |
| Add recurring expense toggle | P1 | Checkbox in expense dialog, with frequency selector |
| Add bulk actions | P2 | Select multiple expenses for bulk delete/categorize |
| Add keyboard shortcuts | P2 | `N` for new expense, `Esc` to close dialog |

### 5.4 Reports (`/reports`)

**Current State:** 100% hardcoded mock data. Summary cards, monthly overview, top categories — all static.

**Required Changes:**

| Change | Priority | Acceptance Criteria |
|--------|----------|---------------------|
| Wire to real Supabase queries | P0 | All data comes from expenses table |
| Date range selector functional | P0 | Week/month/quarter/year filters query real data |
| Summary cards — real calculations | P0 | Total expenses, avg daily, transaction count from DB |
| Monthly overview — real chart | P0 | Bar chart from actual expense data grouped by month |
| Top categories — real data | P0 | Pie/bar chart from expense aggregation by category_id |
| PDF export | P1 | Download report as PDF with charts |
| Custom date range picker | P2 | Allow arbitrary start/end date selection |
| Trend comparison | P2 | Compare current period vs previous period |

**Report Types (P1):**

| Report | Description | Export |
|--------|-------------|--------|
| Spending by Category | Bar/pie chart of expenses grouped by category | CSV, PDF |
| Monthly Trend | Line/bar chart of monthly expense totals | CSV, PDF |
| Tax Summary | Expenses with `tax_applicable=true`, VAT amounts | CSV, PDF |
| Currency Breakdown | Expenses grouped by currency with conversion | CSV |
| Budget vs Actual | Per-category budget utilization | CSV, PDF |

### 5.5 Categories (`/categories`)

**Current State:** 100% hardcoded mock data. 11 fake categories with hardcoded budget/spent values.

**Required Changes:**

| Change | Priority | Acceptance Criteria |
|--------|----------|---------------------|
| Wire to Supabase categories table | P0 | Fetch real categories from DB |
| Add CRUD operations | P0 | Create, edit, delete categories (name, icon, color) |
| Add budget limits per category | P1 | Optional `budget_cents` column on categories |
| Budget progress bars | P1 | Calculate spent from expenses table, show % used |
| Over-budget warnings | P1 | Visual indicator when spent > budget |
| Category icons from Lucide | P0 | Icon picker with Lucide icon set |
| Category colors | P0 | Color picker with preset palette |
| Reorder categories | P2 | Drag-to-reorder with `sort_order` column |

### 5.6 Settings (`/settings`)

**Current State:** Working — profile update, avatar upload, theme, base currency, VAT rate, danger zone.

**Required Changes:**

| Change | Priority | Acceptance Criteria |
|--------|----------|---------------------|
| Show real user email | P1 | Fetch from `supabase.auth.getUser()`, not generated |
| Custom Select component | P2 | Replace native `<select>` with Radix Select |
| Notification preferences | P2 | Toggle email/push notifications |
| Export all data | P2 | Download all user data as ZIP (GDPR) |
| Change password | P1 | Separate section for password change |
| Two-factor auth | P3 | TOTP-based 2FA via Supabase |

### 5.7 Admin Dashboard (`/admin`)

**Current State:** Working — Users tab, Clients tab, Invites tab, Announcements tab (non-functional), Messages tab.

**Required Changes:**

| Change | Priority | Acceptance Criteria |
|--------|----------|---------------------|
| Wire announcements to DB | P1 | Actually insert into messages table |
| Audit log viewer | P2 | New tab showing audit_logs table entries |
| Platform statistics | P2 | Total orgs, total expenses, MRR, churn |
| User impersonation | P3 | Admin can log in as any user for support |
| Bulk user import | P3 | CSV upload to create multiple users |

---

## 6. Data Model

### 6.1 Existing Tables (Implemented)

```
profiles          — user display info, linked to auth.users
categories        — expense categories (org-scoped or solo)
expenses          — expense records (core entity)
settings          — user preferences (theme, currency, VAT)
exchange_rates    — cached currency conversion rates
organizations     — tenant organizations
org_members       — user-org role mapping
plans             — subscription tier definitions
subscriptions     — per-org billing records
audit_logs        — sensitive action audit trail
client_requests   — onboarding request queue
messages          — support tickets + announcements
invites           — email-based org invitations
```

### 6.2 Required New Tables

#### `recurring_expenses` (P1)

```sql
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_occurrence DATE NOT NULL,
  last_occurrence DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  tax_applicable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**RLS:** Follows existing expense patterns (solo user, org manager, org client read-only).

#### `expense_attachments` (P1)

```sql
CREATE TABLE expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**RLS:** Same as expenses — org members can view, owner can manage.

#### `budgets` (P1)

```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  starts_on DATE NOT NULL,
  ends_on DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(category_id, period, org_id)
);
```

#### `notification_preferences` (P2)

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_budget_alerts BOOLEAN DEFAULT true,
  email_weekly_summary BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### 6.3 Required Column Additions

| Table | Column | Type | Priority |
|-------|--------|------|----------|
| `categories` | `budget_cents` | INTEGER | P1 |
| `categories` | `sort_order` | INTEGER | P2 |
| `categories` | `is_default` | BOOLEAN | P1 |
| `expenses` | `receipt_url` | TEXT | P1 |
| `expenses` | `recurring_id` | UUID (FK) | P1 |
| `profiles` | `email` | TEXT | P1 |

### 6.4 Entity Relationships

```
auth.users ──1:1── profiles
auth.users ──1:N── expenses (user_id)
auth.users ──1:N── categories (user_id)
auth.users ──1:1── settings (user_id)
auth.users ──N:M── organizations (via org_members)
organizations ──1:N── expenses (org_id)
organizations ──1:N── categories (org_id)
organizations ──1:N── subscriptions
organizations ──1:N── messages
organizations ──1:N── invites
organizations ──N:1── plans (via subscriptions)
expenses ──N:1── categories (category_id)
expenses ──1:N── expense_attachments
expenses ──N:1── recurring_expenses (recurring_id)
categories ──1:1── budgets (category_id + period)
```

---

## 7. Integration Requirements

### 7.1 Current Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase Auth | Authentication (email/password + OTP) | Working |
| Supabase Database | PostgreSQL + RLS | Working |
| Supabase Storage | Avatar upload | Working |
| Frankfurter API | Exchange rates (EUR-based) | Working (with hardcoded fallback) |
| Vercel | Hosting + CI/CD | Working |

### 7.2 Required Integrations (P0-P1)

| Service | Purpose | Priority | Effort |
|---------|---------|----------|--------|
| Upstash Redis | Rate limiting + caching | P0 | 1 day |
| Resend/SendGrid | Transactional emails (invites, password reset) | P1 | 1 day |

### 7.3 Required Integrations (P2-P3)

| Service | Purpose | Priority | Effort |
|---------|---------|----------|--------|
| Stripe | Subscription billing + payments | P3 | 1-2 weeks |
| Plaid | Bank account linking | P3 | 1-2 weeks |
| OpenAI/Anthropic | AI spending insights | P3 | 1 week |
| Vercel KV | Distributed caching (alternative to Upstash) | P2 | 0.5 day |
| Sentry | Error tracking + performance monitoring | P2 | 0.5 day |
| PostHog/Mixpanel | Product analytics | P2 | 0.5 day |

### 7.4 API Design (P3 — Enterprise)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/expenses` | GET/POST | List/create expenses |
| `/api/v1/expenses/:id` | GET/PUT/DELETE | CRUD single expense |
| `/api/v1/categories` | GET/POST | List/create categories |
| `/api/v1/reports/summary` | GET | Get spending summary |
| `/api/v1/reports/by-category` | GET | Get expenses by category |

**Auth:** API key-based authentication, rate-limited per key.

---

## 8. Success Metrics

### 8.1 North Star Metric

**Monthly Active Expense Tracksers (MAET):** Users who create or edit at least 3 expenses per month.

### 8.2 Key Metrics by Phase

#### MVP Launch (Sprint 1-2)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Landing page truthfulness | 0 false claims | Audit checklist |
| Security score | 0 P0 vulnerabilities | Security audit |
| Reports page | 100% real data | Code review |
| Categories page | 100% real data | Code review |
| CSV export | Functional | E2E test |

#### v1.0 Release (Sprint 3-4)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature completeness score | 7.5/10 | Premium audit re-score |
| Lighthouse performance | > 90 | Lighthouse CI |
| Lighthouse accessibility | > 85 | Lighthouse CI |
| Test coverage | > 70% | Vitest coverage |
| Zero P0 bugs | 0 | Bug tracker |

#### v2.0 Release (Month 3-6)

| Metric | Target | Measurement |
|--------|--------|-------------|
| MAET | 500+ | Analytics |
| DAU/MAU ratio | > 30% | Analytics |
| NPS score | > 40 | User survey |
| Feature completeness | 8.5/10 | Premium audit |
| Stripe integration | Functional | E2E test |
| Bank sync (Plaid) | Functional | E2E test |

### 8.3 Anti-Metrics (Guardrails)

| Metric | Threshold | Action |
|--------|-----------|--------|
| P0 security bugs | > 0 | Immediate hotfix, halt feature work |
| False feature claims on landing | > 0 | Remove claim within 24h |
| Page load time | > 3s | Performance investigation |
| Data loss incidents | > 0 | Incident review, add safeguards |

---

## 9. Release Plan

### 9.1 Sprint 1 — Trust & Security (3-4 days)

**Goal:** Fix all trust-killing issues. Make the product honest and secure.

| Story | Priority | Effort |
|-------|----------|--------|
| Remove all unimplemented feature claims from landing page | P0 | 2h |
| Remove fake "Trusted By" logos | P0 | 30min |
| Fix "How It Works" section to match reality | P0 | 1h |
| Align pricing with DB plans | P0 | 1h |
| Fix CSRF protection (remove dead code, wire middleware) | P0 | 3h |
| Replace in-memory rate limiter with Upstash Redis | P0 | 4h |
| Replace in-memory cache with Upstash Redis | P0 | 3h |
| Fix invite acceptance to use RPC transaction | P0 | 4h |
| Remove dual-cookie security bypass | P0 | 2h |
| Add error boundaries to all dashboard routes | P0 | 2h |
| Add skip-to-content link | P0 | 1h |
| Add aria-labels to password toggles | P0 | 1h |
| Remove maximumScale restriction | P0 | 30min |

**Definition of Done:**
- [ ] Landing page makes zero false claims
- [ ] All security audit P0 items resolved
- [ ] Error boundaries on every dashboard route
- [ ] Basic accessibility gaps fixed

### 9.2 Sprint 2 — Core Features (5-7 days)

**Goal:** Make Reports and Categories real. Add CSV export.

| Story | Priority | Effort |
|-------|----------|--------|
| Reports page — wire to real Supabase queries | P0 | 1d |
| Reports — date range selector functional | P0 | 4h |
| Reports — summary cards with real data | P0 | 3h |
| Reports — monthly overview chart (real data) | P0 | 4h |
| Reports — top categories (real data) | P0 | 3h |
| Categories page — wire to DB, remove hardcoded data | P0 | 4h |
| Categories — CRUD operations (create, edit, delete) | P0 | 1d |
| Categories — icon picker (Lucide icons) | P0 | 3h |
| Categories — color picker | P0 | 2h |
| CSV export — expenses page | P0 | 1d |
| CSV export — reports page | P0 | 4h |
| Fix expense stats to show full totals | P1 | 3h |
| Add budget_cents column to categories | P1 | 2h |
| Budget progress bars on categories page | P1 | 4h |
| Over-budget visual warnings | P1 | 2h |

**Definition of Done:**
- [ ] Reports page shows real data from Supabase
- [ ] Categories page is fully CRUD-functional
- [ ] CSV export works for expenses and reports
- [ ] Budget tracking per category is functional

### 9.3 Sprint 3 — Architecture & Polish (3-4 days)

**Goal:** Clean up DRY violations, fix bugs, improve UX.

| Story | Priority | Effort |
|-------|----------|--------|
| Extract SidebarContent component | P2 | 2h |
| Settings — show real email from Supabase auth | P1 | 1h |
| Custom Select component (Radix) | P2 | 1d |
| Custom Checkbox component | P2 | 3h |
| Tooltip system (Radix Tooltip) | P2 | 3h |
| Org switch without page reload | P1 | 3h |
| Admin announcements — wire to DB insert | P1 | 2h |
| Settings entity repository (FSD fix) | P2 | 3h |
| Extract shared org resolver | P2 | 2h |
| Remove landing mobile Settings nav link | P0 | 15min |
| Fix landing "Remember me" checkbox styling | P2 | 1h |
| Dashboard layout SSR optimization | P2 | 1d |

**Definition of Done:**
- [ ] No duplicate component code
- [ ] All native selects replaced with Radix Select
- [ ] Tooltips on all icon-only buttons
- [ ] Admin announcements functional
- [ ] Org switching is seamless (no page reload)

### 9.4 Sprint 4 — Premium UX (3-4 days)

**Goal:** Make it feel premium. Add delightful interactions.

| Story | Priority | Effort |
|-------|----------|--------|
| Page transitions (animate-fade-in) | P2 | 2h |
| Coordinated skeleton loading states | P2 | 4h |
| Recurring expenses — DB table + UI | P1 | 1d |
| Receipt upload — Supabase Storage + UI | P1 | 1d |
| PDF export — reports page | P1 | 1d |
| Empty state illustrations | P2 | 3h |
| Real dashboard preview on landing | P1 | 2h |
| Keyboard shortcuts (N=new, Esc=close) | P2 | 2h |
| Bulk expense actions | P2 | 4h |

**Definition of Done:**
- [ ] Recurring expenses can be created and auto-generated
- [ ] Receipts can be attached to expenses
- [ ] PDF export works
- [ ] All pages have loading skeletons
- [ ] Page transitions are smooth

### 9.5 v1.0 Release Gate

Before marking as v1.0, all of the following must be true:

- [ ] Zero false claims on landing page
- [ ] Security audit passes (no P0/P1 vulnerabilities)
- [ ] Reports page is 100% real data
- [ ] Categories page is 100% real data with CRUD
- [ ] CSV + PDF export functional
- [ ] Recurring expenses functional
- [ ] Receipt upload functional
- [ ] Budget tracking functional
- [ ] All dashboard routes have error boundaries
- [ ] Lighthouse score > 90 (performance)
- [ ] Lighthouse score > 85 (accessibility)
- [ ] All 59 existing tests pass
- [ ] No ESLint errors
- [ ] Premium audit re-score >= 7.5/10

### 9.6 v2.0 Roadmap (Month 3-6)

| Feature | Priority | Effort |
|---------|----------|--------|
| Stripe billing integration | P3 | 2 weeks |
| Bank sync (Plaid) | P3 | 2 weeks |
| AI spending insights | P3 | 1 week |
| VAT auto-calculation (120+ jurisdictions) | P3 | 1 week |
| API access (Enterprise) | P3 | 1 week |
| PWA push notifications | P3 | 3 days |
| Audit log viewer UI | P3 | 2 days |
| White-label / custom branding | P3 | 1 week |
| Two-factor authentication | P3 | 2 days |
| Data export (GDPR) | P3 | 1 day |

---

## Appendix A: Pricing Alignment

| Tier | Landing Page | Database | Reconciled |
|------|-------------|----------|------------|
| Free | $0, 100 txns/mo, Manual CSV, Basic analytics, Single currency | Free, 50 expenses/mo, CSV export, no PDF, no multi-currency, no insights, no API | **$0, 50 expenses/mo, CSV export** |
| Pro | $12/mo, Unlimited txns, Auto bank sync, AI insights, Multi-currency, Receipt OCR, Priority support | Pro $9.99/mo ($99.90/yr), 10 members, unlimited expenses, CSV+PDF, multi-currency, insights, no API | **$9.99/mo, 10 members, unlimited expenses, CSV+PDF, multi-currency, insights** |
| Enterprise | Custom, Custom API, RBAC, Account manager, Custom integrations, SLA | Enterprise $29.99/mo, unlimited members/expenses, API access | **Custom pricing, unlimited everything, API access** |

## Appendix B: Route Structure

```
/                           Landing page (public)
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

## Appendix C: Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#34d399` (emerald) | CTAs, accents, active states |
| Secondary | `#818cf8` (indigo) | Secondary accents, charts |
| Background | `#0a0f1e` | Page background |
| Card | `#111827` | Card backgrounds |
| Border | `#1e293b` | Card borders, dividers |
| Text | `text-foreground` | Primary text |
| Muted | `text-muted-foreground` | Secondary text |

---

*Document maintained by John (Product Manager). Update this PRD when features are added, removed, or reprioritized. Re-audit against this document monthly.*
