---
title: ExpenseOS
status: draft
created: 2026-07-17
updated: 2026-07-17
---

# PRD: ExpenseOS

## 0. Document Purpose

This PRD defines ExpenseOS, a premium personal finance and expense management platform. It serves as the single source of truth for the product team, stakeholders, and downstream workflow owners (architecture, UX, implementation). The document is structured with glossary-anchored vocabulary, features grouped with globally-numbered functional requirements, and assumptions tagged inline.

## 1. Vision

ExpenseOS is a premium personal finance and expense management platform that helps individuals understand where their money goes through intuitive dashboards, analytics, VAT calculations, and multi-currency support.

Although the initial scope targets a technical assessment, the architecture must be designed so the application can evolve into a commercial SaaS product. The codebase should feel like Version 1 of a startup product rather than a coding challenge.

The finished application should be suitable for portfolio presentation, technical interviews, recruiter demonstrations, production deployment, and future commercial expansion.

## 2. Target User

### 2.1 Jobs To Be Done

- **Track expenses effortlessly** — Log and categorize expenses without friction
- **Understand spending patterns** — Visualize where money goes through dashboards and analytics
- **Manage multi-currency transactions** — Handle expenses in different currencies with accurate conversions
- **Calculate VAT/tax** — Apply configurable tax rates to expenses for compliance
- **Export financial data** — Generate CSV and PDF reports for accounting or personal review
- **Access anywhere** — Use the app on desktop, tablet, and mobile devices

### 2.2 Non-Users (v1)

- Organizations and teams (architectured for future support)
- Accountants and administrators (future roles)
- Users requiring double-entry bookkeeping (v1 is expense tracking, not full accounting)

### 2.3 Key User Journeys

**UJ-1. Kafuraha tracks a business lunch expense**
- **Persona + context:** Kafuraha, a professional who frequently dines with clients
- **Entry state:** Authenticated via email, on mobile device
- **Path:** Opens app → taps "Add Expense" → enters amount ($45.00) → selects "Meals & Entertainment" category → adds note "Client lunch with Acme Corp" → selects USD → saves
- **Climax:** Expense appears in recent activity, KPIs update to show monthly spend
- **Resolution:** Returns to dashboard, sees updated spending summary

**UJ-2. Kafuraha reviews monthly spending**
- **Persona + context:** Kafuraha wants to understand spending patterns
- **Entry state:** Authenticated, on desktop
- **Path:** Opens dashboard → views monthly trend chart → clicks category breakdown → drills into "Transport" → sorts by largest expense → exports to PDF
- **Climax:** PDF generated with professional financial statement formatting
- **Resolution:** Downloads PDF for records

**UJ-3. Kafuraha converts currency for international expense**
- **Persona + context:** Kafuraha traveled to London and has GBP receipts
- **Entry state:** Authenticated, base currency set to KES
- **Path:** Adds expense in GBP → system fetches live exchange rate → displays KES equivalent → saves with both currencies
- **Climax:** Expense stored with original GBP and converted KES amounts
- **Resolution:** Dashboard reflects both currencies in summary

## 3. Glossary

- **Expense** — A recorded financial transaction representing money spent. Has amount, currency, category, date, and optional notes.
- **Category** — A classification label for expenses (e.g., "Meals & Entertainment", "Transport"). Users can create custom categories.
- **VAT** — Value Added Tax. A configurable tax rate applied to expenses. Default is Kenya VAT at 16%.
- **Base Currency** — The user's primary currency for reporting and conversions. Configurable in settings.
- **KPI** — Key Performance Indicator. Dashboard metrics showing total spend, averages, trends.
- **RLS** — Row-Level Security. PostgreSQL policy ensuring users can only access their own data.
- **Feature-Sliced Design (FSD)** — Architectural methodology organizing code by features, entities, and shared layers.

## 4. Features

### 4.1 Authentication & User Management

**Description:** Secure user registration, login, and session management using Supabase Auth. Supports email-based authentication with verification, password recovery, and protected routes.

**Functional Requirements:**

#### FR-1: Email Registration
Users can create an account using email and password. System sends verification email upon registration.

**Consequences (testable):**
- Registration creates user record in Supabase Auth
- Unverified accounts cannot access protected features
- Duplicate email addresses are rejected with clear error message

#### FR-2: Email Login
Users can log in using registered email and password. Session persists across browser sessions.

**Consequences (testable):**
- Invalid credentials show generic error message (no user enumeration)
- Session token stored securely in httpOnly cookie
- Successful login redirects to dashboard

#### FR-3: Password Recovery
Users can request password reset via email. Reset link expires after 24 hours.

**Consequences (testable):**
- Reset email sent within 30 seconds
- Invalid/expired tokens show appropriate error
- Password update invalidates all existing sessions

#### FR-4: Protected Routes
Unauthenticated users cannot access dashboard, expenses, or settings pages. Middleware redirects to login.

**Consequences (testable):**
- Direct URL access to protected routes redirects to /login
- Authenticated users bypass login page
- Session expiry triggers redirect to login

#### FR-5: Logout
Users can log out, clearing session data. Redirect to login page.

**Consequences (testable):**
- Session token invalidated server-side
- Client-side storage cleared
- Back button cannot access protected content

**Feature-specific NFRs:**
- Authentication flow must complete within 2 seconds
- Password requirements: minimum 8 characters, at least one number and one letter

### 4.2 Dashboard

**Description:** Premium analytics dashboard providing real-time insights into spending patterns, KPIs, charts, and activity summaries. Designed to feel like Stripe Dashboard or Linear, not a generic CRUD interface.

**Functional Requirements:**

#### FR-6: KPI Display
Dashboard displays key metrics: total monthly spend, number of transactions, average transaction size, budget remaining (if set).

**Consequences (testable):**
- KPIs update in real-time when expenses are added/edited/deleted
- Loading state shown while fetching data
- Numbers formatted with user's currency symbol

#### FR-7: Monthly Trend Chart
Interactive line chart showing spending over time. Supports month-over-month comparison.

**Consequences (testable):**
- Chart renders within 1 second
- Hovering shows exact amounts
- Responsive design works on mobile

#### FR-8: Category Insights
Pie/donut chart showing expense distribution by category. Clickable to filter expenses.

**Consequences (testable):**
- Categories sorted by amount (largest first)
- Clicking category filters expense list
- Empty state shown when no data

#### FR-9: Recent Activity
List of last 10-20 expenses with quick actions (edit, delete).

**Consequences (testable):**
- Sorted by date (newest first)
- Shows amount, category, date
- Quick actions accessible via keyboard

#### FR-10: Tax Summary
Summary of VAT/tax collected based on configured rate.

**Consequences (testable):**
- Calculates based on expenses marked as taxable
- Shows total tax amount
- Uses configured VAT rate (default 16%)

#### FR-11: Currency Summary
Breakdown of expenses by currency with converted totals.

**Consequences (testable):**
- Shows original amounts and base currency equivalent
- Exchange rates displayed
- Handles multiple currencies in single view

#### FR-12: Dynamic Insights
AI-generated or rule-based insights about spending patterns (e.g., "You spent 20% more on dining this month").

**Consequences (testable):**
- Insights update daily
- Minimum 3 data points required
- Non-intrusive display

**Feature-specific NFRs:**
- Dashboard must load within 2 seconds on 3G connection
- Charts must be accessible (keyboard navigation, screen reader labels)

### 4.3 Expense Management

**Description:** Full CRUD operations for expenses with search, sort, filter, pagination, and export capabilities. Includes undo delete and duplicate functionality.

**Functional Requirements:**

#### FR-13: Create Expense
Users can create expenses with amount, currency, category, date, notes, and tax applicability.

**Consequences (testable):**
- Required fields: amount, currency, category, date
- Optional fields: notes, tax flag
- Validation prevents negative amounts (unless supported)
- Success shows toast notification

#### FR-14: Edit Expense
Users can modify any field of an existing expense.

**Consequences (testable):**
- All fields editable except ID and creation timestamp
- Changes logged for audit trail
- Validation applied on edit

#### FR-15: Delete Expense
Users can delete expenses with confirmation dialog.

**Consequences (testable):**
- Confirmation required before deletion
- Soft delete (recoverable for 30 days) [ASSUMPTION]
- Toast notification with undo option

#### FR-16: Undo Delete
Users can restore recently deleted expenses within a time window.

**Consequences (testable):**
- Undo available for 30 seconds after deletion
- Restored expense appears in original position
- Toast notification confirms restoration

#### FR-17: Duplicate Expense
Users can duplicate an expense as a template for new entries.

**Consequences (testable):**
- Creates new expense with same fields
- New ID assigned
- Date defaults to today
- User can modify before saving

#### FR-18: Search Expenses
Users can search expenses by notes, category, or amount.

**Consequences (testable):**
- Search is case-insensitive
- Results update as user types (debounced)
- Empty state shown when no matches

#### FR-19: Sort Expenses
Users can sort expenses by date, amount, or category.

**Consequences (testable):**
- Default sort: date descending
- Toggle ascending/descending
- Sort indicator visible

#### FR-20: Filter Expenses
Users can filter by category, date range, currency, or tax status.

**Consequences (testable):**
- Multiple filters can be combined
- Active filters shown as chips
- Clear all filters button available

#### FR-21: Paginate Expenses
Expenses displayed in paginated list with configurable page size.

**Consequences (testable):**
- Default page size: 20
- Pagination controls accessible
- Page state preserved during session

#### FR-22: Export Expenses
Users can export filtered expenses to CSV or PDF.

**Consequences (testable):**
- CSV: standard format compatible with Excel
- PDF: professional financial statement formatting
- Export respects current filters
- Large exports (>1000 rows) processed asynchronously

### 4.4 Multi-Currency Support

**Description:** Integration with Frankfurter API for live exchange rates. Supports KES, USD, EUR, GBP, CAD, AUD, JPY with caching and failure handling.

**Functional Requirements:**

#### FR-23: Currency Selection
Users can select currency when creating expenses. Base currency configurable in settings.

**Consequences (testable):**
- Currency list includes all supported currencies
- Default currency from user settings
- Recent currencies shown first

#### FR-24: Exchange Rate Fetching
System fetches live exchange rates from Frankfurter API.

**Consequences (testable):**
- Rates cached for 1 hour
- Fallback to cached rates if API fails
- Manual refresh available

#### FR-25: Currency Conversion
System converts expenses to base currency for reporting.

**Consequences (testable):**
- Conversion uses rate at time of expense (or current if historical unavailable)
- Both original and converted amounts stored
- Precision maintained (2 decimal places)

**Feature-specific NFRs:**
- API timeout: 5 seconds
- Cache hit rate target: >80%
- Graceful degradation when API unavailable

### 4.5 VAT/Tax Engine

**Description:** Configurable tax rate system with default Kenya VAT at 16%. Tax logic encapsulated in reusable services for future expansion.

**Functional Requirements:**

#### FR-26: VAT Rate Configuration
Users can configure VAT rate in settings. Default: 16% (Kenya).

**Consequences (testable):**
- Rate stored as decimal (0.16)
- Changes apply to new expenses only
- Historical expenses retain original rate

#### FR-27: Tax Calculation
System calculates tax amount based on expense amount and configured rate.

**Consequences (testable):**
- Tax = Amount × Rate
- Rounded to 2 decimal places
- Displayed alongside expense amount

#### FR-28: Tax Summary Reporting
Dashboard shows total tax collected based on taxable expenses.

**Consequences (testable):**
- Only expenses flagged as taxable included
- Time-period filterable
- Exportable in reports

### 4.6 Settings & Preferences

**Description:** User-configurable settings for theme, currency, VAT, profile, and PWA preferences.

**Functional Requirements:**

#### FR-29: Theme Selection
Users can switch between Light, Dark, and System themes.

**Consequences (testable):**
- Theme applies immediately
- Preference persists across sessions
- System theme respects OS preference

#### FR-30: Currency Settings
Users can set base currency for reporting.

**Consequences (testable):**
- Default: KES [ASSUMPTION]
- Changes affect dashboard calculations
- Does not change historical data

#### FR-31: Profile Management
Users can update display name and email preferences.

**Consequences (testable):**
- Email change requires verification
- Display name updates immediately
- Avatar upload supported (Supabase Storage)

#### FR-32: PWA Preferences
Users can configure offline behavior and notification settings.

**Consequences (testable):**
- Toggle offline mode
- Notification preferences (future)
- Install prompt settings

### 4.7 Data Export

**Description:** Professional export capabilities for CSV and PDF formats with financial statement formatting.

**Functional Requirements:**

#### FR-33: CSV Export
Export expenses to CSV format compatible with spreadsheet applications.

**Consequences (testable):**
- Headers: Date, Amount, Currency, Category, Notes, Tax
- UTF-8 encoding
- Download triggered immediately

#### FR-34: PDF Export
Export expenses to professionally formatted PDF.

**Consequences (testable):**
- Includes header with user name and date range
- Formatted as financial statement
- Page numbers on multi-page documents
- Download triggered after generation

### 4.8 Progressive Web App

**Description:** Installable PWA with offline support, manifest, and responsive icons.

**Functional Requirements:**

#### FR-35: PWA Manifest
Application includes web manifest for installability.

**Consequences (testable):**
- App name, icons, theme colors configured
- Start URL points to dashboard
- Display mode: standalone

#### FR-36: Offline Support
Core functionality available offline with sync when online.

**Consequences (testable):**
- Expenses viewable offline
- Create/edit queued for sync
- Conflict resolution for simultaneous edits

#### FR-37: Install Prompt
Users prompted to install app on supported devices.

**Consequences (testable):**
- Prompt appears after 3 sessions
- Can be dismissed permanently
- Respects "already installed" state

## 5. Non-Goals (Explicit)

- **Double-entry bookkeeping** — v1 tracks expenses, not full accounting
- **Multi-user/organization support** — architected for future, not implemented
- **Bank account linking** — no Plaid or similar integration
- **Receipt OCR** — manual entry only in v1
- **Investment tracking** — out of scope
- **Budget enforcement** — soft budgets shown, not enforced
- **Recurring expenses** — manual entry in v1
- **Mobile native apps** — PWA only
- **Internationalization (i18n)** — English only in v1

## 6. MVP Scope

### 6.1 In Scope

- Email authentication (signup, login, password reset)
- Dashboard with KPIs and charts
- Full expense CRUD with search, sort, filter, pagination
- Multi-currency support (7 currencies)
- Configurable VAT/tax engine
- CSV and PDF export
- Settings (theme, currency, profile)
- PWA with offline support
- Responsive design (desktop, tablet, mobile)
- Light/Dark/System theme
- WCAG accessibility compliance

### 6.2 Out of Scope for MVP

- Multi-user/teams (v2) — requires RLS policy expansion
- Bank integration (v2) — requires third-party API contracts
- Receipt scanning (v2) — requires OCR service
- Mobile native apps (v3) — PWA covers initial needs
- Advanced analytics/ML insights (v3) — basic insights only in v1
- Internationalization (v2) — English only

## 7. Success Metrics

**Primary**
- **SM-1**: User can create and view expenses within 5 seconds — validates core usability
- **SM-2**: Dashboard loads within 2 seconds on 3G — validates performance
- **SM-3**: Zero critical accessibility violations — validates WCAG compliance

**Secondary**
- **SM-4**: Export generates within 5 seconds for <1000 rows — validates export feature
- **SM-5**: Exchange rate cache hit >80% — validates caching strategy

**Counter-metrics (do not optimize)**
- **SM-C1**: Feature count — adding features without polish degrades UX

## 8. Open Questions

1. Should undo delete be soft delete (30 days) or time-limited toast (30 seconds)?
2. Should expenses support negative amounts (refunds)?
3. What is the default base currency — KES or USD?
4. Should PWA offline mode queue all mutations or just creates?
5. How should currency conflicts be handled when rates are unavailable?

## 9. Assumptions Index

- Soft delete with 30-day recovery window (FR-15)
- Default base currency is KES (FR-30)
- Exchange rates cached for 1 hour (FR-24)
- VAT default is 16% Kenya rate (FR-26)
- Email-only authentication (no social login)
- Supabase handles all auth/session management

---

## Appendix A: Technology Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Recharts

### Backend
- Next.js Server Actions
- Route Handlers

### Database
- PostgreSQL (Supabase)

### Authentication
- Supabase Auth

### Storage
- Supabase Storage

### Validation
- React Hook Form
- Zod

### Tables
- TanStack Table

### State
- TanStack Query
- React Context

### Utilities
- date-fns
- react-hot-toast
- Lucide React

### Deployment
- Vercel

## Appendix B: Architecture

Feature-Sliced Design (FSD) with layers:
- `app/` — Next.js App Router pages
- `widgets/` — Composed UI blocks
- `features/` — User interactions
- `entities/` — Business objects
- `shared/` — Reusable utilities
- `processes/` — Cross-cutting workflows
- `styles/` — Global styles and tokens

## Appendix C: Design System

Premium design language inspired by Stripe Dashboard, Linear, Vercel, Ramp, and Notion.

Components: Typography, Spacing, Color tokens, Buttons, Inputs, Cards, Dialogs, Tables, Charts, Badges, Avatars, Dropdowns, Forms, Icons, Loading/Empty/Error states, Toast notifications.

Theme support: Light, Dark, System.
