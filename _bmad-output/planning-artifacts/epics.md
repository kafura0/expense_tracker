---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-expenseos-2026-07-17/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-expenseos-2026-07-17/ARCHITECTURE-SPINE.md
---

# ExpenseOS - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ExpenseOS, decomposing the requirements from the PRD, Architecture, and technical decisions into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Email Registration — users can create an account via email and password with verification
FR-2: Email Login — users can log in with registered email and password
FR-3: Password Recovery — users can request password reset via email
FR-4: Protected Routes — unauthenticated users cannot access protected pages
FR-5: Logout — users can log out, clearing session data
FR-6: KPI Display — dashboard shows key metrics (total spend, transaction count, averages)
FR-7: Monthly Trend Chart — interactive line chart showing spending over time
FR-8: Category Insights — donut chart showing expense distribution by category
FR-9: Recent Activity — list of last 10-20 expenses with quick actions
FR-10: Tax Summary — summary of VAT/tax collected
FR-11: Currency Summary — breakdown of expenses by currency with converted totals
FR-12: Dynamic Insights — rule-based insights about spending patterns
FR-13: Create Expense — create expenses with amount, currency, category, date, notes
FR-14: Edit Expense — modify any field of an existing expense
FR-15: Delete Expense — delete expenses with confirmation and soft delete
FR-16: Undo Delete — restore recently deleted expenses within time window
FR-17: Duplicate Expense — duplicate an expense as template for new entries
FR-18: Search Expenses — search expenses by notes, category, or amount
FR-19: Sort Expenses — sort expenses by date, amount, or category
FR-20: Filter Expenses — filter by category, date range, currency, or tax status
FR-21: Paginate Expenses — paginated list with configurable page size
FR-22: Export Expenses — export filtered expenses to CSV or PDF
FR-23: Currency Selection — select currency when creating expenses
FR-24: Exchange Rate Fetching — fetch live rates from Frankfurter API with caching
FR-25: Currency Conversion — convert expenses to base currency for reporting
FR-26: VAT Rate Configuration — configure VAT rate in settings
FR-27: Tax Calculation — calculate tax based on amount and configured rate
FR-28: Tax Summary Reporting — dashboard shows total tax from taxable expenses
FR-29: Theme Selection — switch between Light, Dark, and System themes
FR-30: Currency Settings — set base currency for reporting
FR-31: Profile Management — update display name and email preferences
FR-32: PWA Preferences — configure offline behavior and notification settings
FR-33: CSV Export — export expenses to CSV format
FR-34: PDF Export — export expenses to professionally formatted PDF
FR-35: PWA Manifest — web manifest for installability
FR-36: Offline Support — core functionality available offline with sync
FR-37: Install Prompt — prompt users to install app on supported devices

### Non-Functional Requirements

NFR-1: Authentication flow must complete within 2 seconds
NFR-2: Password requirements: minimum 8 characters, at least one number and one letter
NFR-3: Dashboard must load within 2 seconds on 3G connection
NFR-4: Charts must be accessible (keyboard navigation, screen reader labels)
NFR-5: Exchange rate API timeout: 5 seconds
NFR-6: Exchange rate cache hit rate target: >80%
NFR-7: Graceful degradation when currency API unavailable
NFR-8: WCAG accessibility compliance (zero critical violations)
NFR-9: All data writes through Server Actions — never direct DB from client
NFR-10: RLS policies on all tables — users access only their own data
NFR-11: Amounts stored as integer cents to avoid float precision issues
NFR-12: Dates stored as timestamptz ISO 8601 UTC

### Additional Requirements (from Architecture)

AR-1: Feature-Sliced Design — code organized into app/, widgets/, features/, entities/, shared/, processes/
AR-2: Server Actions as mutation boundary — no direct DB access from client components
AR-3: Route Handlers for external API proxies and file generation only
AR-4: Zod schemas as single validation source — shared between client and server
AR-5: TanStack Query for all server state — React Context only for UI state
AR-6: VAT engine as pure service function in shared/lib/
AR-7: Exchange rate service with cache fallback — DB cache, 1 hour TTL
AR-8: Server Components by default — client components only where interactivity required
AR-9: Business logic in shared/lib/ — vat.ts, currency.ts, date.ts, format.ts, export/
AR-10: Entity repositories in entities/<name>/repository.ts encapsulating DB access
AR-11: RLS policies on all tables — user_id = auth.uid()
AR-12: Supabase SSR for session management
AR-13: Amounts stored as integer cents
AR-14: UUID v4 for all entity IDs

### UX Design Requirements

(None — no UX design contract exists yet)

### FR Coverage Map

(To be completed after epic design)

## Epic List

(To be completed)

## Epic 1: Project Foundation & Auth

**Goal:** Scaffold the ExpenseOS project with FSD architecture, database schema, and full authentication flow.

### Story 1.1: Initialize Next.js Project with FSD Structure

As a developer,
I want to scaffold the Next.js 15 project with Feature-Sliced Design directory structure and all dependencies installed,
So that the codebase has a consistent, scalable architecture from day one.

**Acceptance Criteria:**
- Next.js 15 project created with App Router
- FSD directory structure in place: app/, widgets/, features/, entities/, shared/, processes/
- All dependencies installed: TailwindCSS, shadcn/ui, Supabase JS, TanStack Query, Zod, React Hook Form, Framer Motion, Recharts, date-fns, Lucide React
- TypeScript strict mode enabled
- TailwindCSS configured with design tokens

### Story 1.2: Configure Supabase Database Schema

As a developer,
I want to create the PostgreSQL schema with all tables, indexes, constraints, and RLS policies,
So that the data layer is ready for feature implementation.

**Acceptance Criteria:**
- Tables created: profiles, categories, expenses, settings, exchange_rates
- UUID primary keys on all tables
- user_id foreign key to auth.users on all tables
- RLS policies: user_id = auth.uid() on all tables
- Indexes on: user_id, created_at, category_id, date
- Categories seeded with defaults (Meals & Entertainment, Transport, Housing, Utilities, Shopping, Health, Education, Other)

### Story 1.3: Implement Email Authentication

As a user,
I want to sign up, log in, and reset my password using email,
So that I can access my expenses securely.

**Acceptance Criteria:**
- Registration with email + password creates Supabase Auth user
- Verification email sent on registration
- Unverified users cannot access protected pages
- Login with valid credentials redirects to dashboard
- Invalid credentials show generic error (no user enumeration)
- Password reset via email with expiring link
- Logout clears session and redirects to login
- Protected routes redirect to /login for unauthenticated users
- Session persists across browser sessions via httpOnly cookie

### Story 1.4: Create Shared UI Kit (shadcn/ui)

As a developer,
I want to initialize and customize shadcn/ui components and design tokens,
So that all UI components follow consistent styling.

**Acceptance Criteria:**
- shadcn/ui initialized with custom theme colors
- Base components: Button, Input, Card, Dialog, Table, Badge, Avatar, Dropdown
- Light, Dark, and System theme support via TailwindCSS dark mode
- Consistent spacing scale
- Loading, empty, and error state components created
- Toast notification system configured

## Epic 2: Expense CRUD

**Goal:** Build complete expense management with create, read, update, delete, search, sort, filter, pagination, and undo delete.

### Story 2.1: Create Expense Entity & Repository

As a developer,
I want to create the expense entity with Zod schema, repository, and Server Actions,
So that expense data operations are encapsulated and type-safe.

**Acceptance Criteria:**
- Zod schema for expense validation: amount (cents), currency, category_id, date, notes (optional), tax_applicable (boolean)
- TypeScript types derived from Zod schema
- Entity repository: findAll, findById, create, update, softDelete methods
- Server Actions: createExpense, updateExpense, deleteExpense
- RLS verified on all expense queries

### Story 2.2: Build Expense List Page

As a user,
I want to view all my expenses in a paginated table with search, sort, and filter,
So that I can quickly find and review my spending.

**Acceptance Criteria:**
- TanStack Table displaying expenses with columns: Date, Amount, Currency, Category, Notes
- Search bar filters by notes, category, or amount (case-insensitive, debounced)
- Sortable columns: date, amount, category
- Filters: category dropdown, date range picker, currency selector, tax status toggle
- Active filters shown as removable chips
- Pagination with configurable page size (default 20)
- Page state preserved during session
- Empty state when no expenses exist

### Story 2.3: Build Create & Edit Expense Forms

As a user,
I want to create and edit expenses with a form that validates my input,
So that I can accurately record my financial transactions.

**Acceptance Criteria:**
- Create Expense form: amount, currency, category, date, notes (optional), tax_applicable toggle
- Edit Expense form pre-populated with existing values
- Validation: required fields marked, negative amounts rejected
- Currency selector shows all supported currencies (KES, USD, EUR, GBP, CAD, AUD, JPY)
- Category selector shows user's categories
- Success toast on create/edit
- Form errors displayed inline
- Keyboard navigable

### Story 2.4: Implement Delete, Undo Delete, and Duplicate

As a user,
I want to delete expenses with confirmation, undo deletion, and duplicate expenses,
So that I have full control over my expense data.

**Acceptance Criteria:**
- Delete with confirmation dialog
- Soft delete (is_deleted flag + deleted_at timestamp)
- Toast notification with Undo button for 30 seconds
- Undo restores expense to original position
- Duplicate creates new expense with same fields (date defaults to today)
- User can modify duplicated expense before saving

## Epic 3: Dashboard & Analytics

**Goal:** Build the premium dashboard with KPIs, charts, insights, and summaries.

### Story 3.1: Build KPI Cards

As a user,
I want to see key spending metrics on my dashboard,
So that I can quickly understand my financial health.

**Acceptance Criteria:**
- KPI cards: Total Monthly Spend, Transaction Count, Average Transaction Size
- KPIs calculated from current month's expenses (in base currency)
- Loading skeleton state while fetching
- Numbers formatted with currency symbol and locale
- Responsive grid layout (4 columns desktop, 2 tablet, 1 mobile)

### Story 3.2: Build Spending Charts

As a user,
I want to see interactive charts of my spending over time and by category,
So that I can visualize my financial patterns.

**Acceptance Criteria:**
- Monthly trend line chart (Recharts) — last 6 months
- Category donut chart — distribution by category for current month
- Hover on chart shows exact amounts
- Clicking category segment filters the recent activity list
- Charts are keyboard navigable and have screen reader labels
- Responsive resize handling
- Empty state when no data

### Story 3.3: Build Recent Activity & Insights

As a user,
I want to see my recent transactions and spending insights on the dashboard,
So that I can take action on my latest expenses.

**Acceptance Criteria:**
- Recent Activity list: last 10 expenses sorted by date descending
- Quick actions: edit, delete from activity list
- Dynamic Insights section: rule-based observations (e.g., "Spent 20% more on dining this month")
- Tax Summary card: total VAT/tax from taxable expenses
- Currency Summary card: breakdown by currency with converted totals

## Epic 4: Multi-Currency & VAT Engine

**Goal:** Implement currency conversion with live rates and configurable VAT/tax engine.

### Story 4.1: Implement Exchange Rate Service

As a developer,
I want to create the currency exchange service with Frankfurter API integration and caching,
So that expenses can be converted between currencies reliably.

**Acceptance Criteria:**
- Exchange rate service fetches from Frankfurter API
- Rates cached in exchange_rates table (1 hour TTL)
- Fallback to stale cache when API fails
- Manual refresh button available
- API timeout: 5 seconds
- Supported currencies: KES, USD, EUR, GBP, CAD, AUD, JPY
- Route Handler: GET /api/rates?base=USD

### Story 4.2: Build Currency Conversion on Expenses

As a user,
I want expenses in foreign currencies to be converted to my base currency,
So that I can see my total spending in a currency I understand.

**Acceptance Criteria:**
- Currency selector on expense create/edit shows all supported currencies
- Stored amount: original currency amount + cents
- Converted amount: base currency equivalent calculated at creation
- Dashboard summaries use base currency
- Display original amount alongside converted amount
- Precision: 2 decimal places for display, integer cents for storage

### Story 4.3: Implement VAT/Tax Engine

As a user,
I want configurable VAT/tax applied to my expenses,
So that I can track tax-eligible spending accurately.

**Acceptance Criteria:**
- VAT engine: pure function calculateVAT(amount, rate) returns { tax, total }
- Tax shown alongside expense amount when tax_applicable = true
- Total tax summary on dashboard
- VAT rate configured in Settings (default 16%)
- Rate changes apply to new expenses only
- Historical expenses retain original rate

## Epic 5: Settings, Export & PWA

**Goal:** Build settings page, data export features, and PWA capabilities.

### Story 5.1: Build Settings Page

As a user,
I want to configure my preferences including theme, currency, VAT, and profile,
So that the app works the way I want.

**Acceptance Criteria:**
- Theme selector: Light, Dark, System (applies immediately, persists across sessions)
- Base currency selector (changes affect dashboard calculations)
- VAT rate configuration
- Profile: display name, avatar upload (Supabase Storage)
- Form validation on all settings
- Changes saved via Server Actions

### Story 5.2: Implement CSV and PDF Export

As a user,
I want to export my expenses as CSV or PDF,
So that I can share or archive my financial records.

**Acceptance Criteria:**
- CSV export: Date, Amount, Currency, Category, Notes, Tax columns
- PDF export: professional financial statement format with header, user name, date range
- Export respects active filters
- Downloads triggered immediately
- Page numbers on multi-page PDF
- UTF-8 encoding

### Story 5.3: Implement PWA Support

As a user,
I want to install ExpenseOS on my device and use it offline,
So that I can track expenses without internet access.

**Acceptance Criteria:**
- Web manifest with app name, icons, theme colors
- Service worker registered for offline support
- Start URL points to dashboard
- Display mode: standalone
- Install prompt appears after 3 sessions (dismissable)
- Core functionality works offline (view expenses)
- Mutations queued for sync when back online
- Responsive icons for all device sizes
