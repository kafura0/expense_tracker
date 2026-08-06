# Ledgerly — Epics & User Stories

**Source:** PREMIUM_AUDIT.md (2026-07-26)
**Overall Score:** 6.2/10 → Target 8.9/10
**Sprint Cadence:** 4 sprints × 3–7 days

---

## EPIC 1: Security & Trust Fix (Sprint 1)

**Goal:** Close all critical security gaps, remove deceptive marketing claims, and establish baseline trust.

---

### 1.1 Fix CSRF Protection

**Description:** Remove the dead-code fallback chain in `csrf.ts` and require the `CSRF_SECRET` environment variable. Wire the middleware into the request pipeline so every non-GET request is validated.

**Acceptance Criteria:**
- `csrf.ts` fallback chain is deleted; missing `CSRF_SECRET` throws at build time
- Middleware validates the CSRF token on every POST/PUT/PATCH/DELETE request
- Requests without a valid token return `403 Forbidden`
- Existing 59 tests pass; new unit tests cover valid token, missing token, and invalid token paths

**Priority:** P0
**Effort:** M
**Dependencies:** None

---

### 1.2 Replace In-Memory Rate Limiting with Upstash Redis

**Description:** The current `rate-limit.ts` uses an in-memory `Map` that resets on every serverless cold start, making rate limiting non-functional in production. Replace it with Upstash Redis for distributed, persistent rate limiting.

**Acceptance Criteria:**
- `rate-limit.ts` imports and initializes `@upstash/ratelimit` with Upstash Redis
- Window and max-requests are configurable via environment variables
- Rate limit headers (`X-RateLimit-Remaining`, `Retry-After`) are returned on 429 responses
- Unit tests verify rate limit enforcement across simulated cold starts

**Priority:** P0
**Effort:** M
**Dependencies:** None

---

### 1.3 Replace In-Memory Cache with Upstash Redis

**Description:** The current `cache.ts` uses an in-memory `Map` that loses all data on cold starts. Replace it with Upstash Redis (or Vercel KV) for a distributed cache that persists across serverless invocations.

**Acceptance Criteria:**
- `cache.ts` is rewritten to use Upstash Redis as the backing store
- `get`, `set`, `delete`, and `invalidatePattern` operations are implemented
- TTL is configurable per call and defaults to a sensible value (e.g., 60 seconds)
- Existing callers of the cache module continue to work without changes
- Unit tests verify cache hit, miss, expiration, and pattern invalidation

**Priority:** P0
**Effort:** M
**Dependencies:** None

---

### 1.4 Remove Fake "Trusted By" Logos from Landing Page

**Description:** The landing page displays fabricated company logos in a "Trusted By" section (`page.tsx:295-303`). These are not real customers and undermine credibility. Remove the section entirely or replace with verifiable social proof.

**Acceptance Criteria:**
- The "Trusted By" logos section is removed from the landing page
- No placeholder or fake company logos remain in the component tree
- If replaced, only real customer logos, testimonials, or usage metrics are shown
- Visual regression confirms no unintended layout shifts below the hero

**Priority:** P0
**Effort:** S
**Dependencies:** None

---

### 1.5 Remove Unimplemented Feature Claims from Landing Page

**Description:** The landing page promotes approximately 8 features that do not exist in the codebase (e.g., exports, budgets, recurring expenses). These unimplemented claims are a credibility time bomb. Remove or clearly mark every feature that is not yet functional.

**Acceptance Criteria:**
- Every feature claimed on the landing page is audited against the actual codebase
- Features that do not exist are either removed from the copy or marked as "Coming Soon"
- No feature is presented as available if it has no working implementation
- A checklist in the PR description maps each landing page claim to its status

**Priority:** P0
**Effort:** M
**Dependencies:** None

---

### 1.6 Fix Dual-Cookie Security Model

**Description:** `org-provider.tsx` writes to `document.cookie` (lines 186, 239) to set the active org ID, bypassing httpOnly protections. This is a security anti-pattern that exposes session state to XSS. Remove all `document.cookie` writes and use a server action or secure cookie via middleware instead.

**Acceptance Criteria:**
- All `document.cookie` writes in `org-provider.tsx` are removed
- Org ID is set exclusively through a server action or `Set-Cookie` header via middleware
- The cookie is `httpOnly`, `secure`, `sameSite=strict`, and has an appropriate `path`
- Org switching works end-to-end without client-side cookie manipulation
- Existing auth and org-selection tests pass

**Priority:** P0
**Effort:** M
**Dependencies:** None

---

### 1.7 Wrap Invite Acceptance in Supabase RPC Transaction

**Description:** The invite acceptance flow (`invite/repository.ts:92-141`) performs 5 sequential database calls without a transaction. If any call fails midway, the system is left in an inconsistent state (e.g., user created but not added to org). Wrap the entire flow in a Supabase RPC transaction.

**Acceptance Criteria:**
- All 5 invite-acceptance database calls are wrapped in a single Supabase RPC transaction
- If any step fails, all preceding steps are rolled back
- A new Supabase function (e.g., `accept_invite`) is created in a migration file
- Integration tests verify both the happy path and failure/rollback path
- No partial state is observable after a failed invite acceptance

**Priority:** P0
**Effort:** L
**Dependencies:** None

---

### 1.8 Add Auth/Role Checks to Invite Operations

**Description:** Invite operations (`invite/repository.ts:44,57`) do not call `getUser()` or validate the caller's role before mutating data. Any authenticated user could potentially invite others to an org they don't belong to. Add proper authorization checks.

**Acceptance Criteria:**
- Every invite creation and acceptance call verifies the authenticated user via `getUser()`
- Only org admins or managers can create invites (enforced server-side)
- Invites are scoped to a specific org; cross-org invite attempts are rejected with 403
- Unit tests cover: unauthenticated caller, non-admin caller, cross-org attempt, and valid caller
- Audit log entry is created for every invite action

**Priority:** P0
**Effort:** M
**Dependencies:** 1.7

---

### 1.9 Add Error Boundaries to All Dashboard Routes

**Description:** None of the dashboard routes have `error.tsx` files. If a component throws during rendering, the user sees a blank white screen with no recovery path. Add error boundaries to every route segment.

**Acceptance Criteria:**
- Every route under `(dashboard)/` has an `error.tsx` file
- Each error boundary displays a user-friendly message and a "Try Again" button
- The error boundary logs the error details (component stack, error message) for debugging
- A "Return to Dashboard" link is present in the error UI
- Manual testing confirms that a thrown error in any dashboard page is caught and displayed

**Priority:** P1
**Effort:** S
**Dependencies:** None

---

### 1.10 Fix Accessibility: Password Toggle aria-labels

**Description:** The password visibility toggle buttons on login, login form, and signup form pages are missing `aria-label` attributes. Screen readers announce them as "button" with no context. Add descriptive labels.

**Acceptance Criteria:**
- `login/page.tsx:93`, `login-form.tsx:74`, and `signup-form.tsx:123` each have `aria-label` on the toggle button
- The label alternates between "Show password" and "Hide password" based on visibility state
- `aria-pressed` is set to reflect the current toggle state
- Automated accessibility audit (axe-core) reports no violations on these elements

**Priority:** P1
**Effort:** S
**Dependencies:** None

---

### 1.11 Fix Accessibility: Add Skip-to-Content Link

**Description:** Keyboard-only users must tab through the entire sidebar navigation on every page load before reaching the main content. Add a visually hidden "Skip to content" link that becomes visible on focus.

**Acceptance Criteria:**
- A "Skip to main content" link is the first focusable element in `dashboard/layout.tsx`
- The link is visually hidden until focused (using `sr-only` + `focus:not-sr-only` classes)
- Activating the link moves focus to the `<main>` element via `id="main-content"`
- Tab order after activation starts inside the main content, not the sidebar
- Screen reader testing confirms the link is announced correctly

**Priority:** P1
**Effort:** S
**Dependencies:** None

---

### 1.12 Remove maximumScale: 1 from Viewport Config

**Description:** The root `layout.tsx:29` sets `maximumScale: 1` in the viewport metadata, which prevents users from pinch-to-zoom on mobile devices. This is an accessibility violation (WCAG 1.4.4) and should be removed.

**Acceptance Criteria:**
- `maximumScale` is removed from the viewport configuration in `layout.tsx`
- Users can pinch-to-zoom on mobile devices
- The layout does not break or reflow unexpectedly when zoomed to 200%
- Automated accessibility audit no longer flags viewport zoom restriction

**Priority:** P1
**Effort:** S
**Dependencies:** None

---

## EPIC 2: Core Features (Sprint 2)

**Goal:** Replace all hardcoded/mock data with real Supabase queries and deliver the features promised on the landing page.

---

### 2.1 Rebuild Reports Page with Real Supabase Data + Recharts

**Description:** The reports page (`reports/page.tsx:20-41`) is 100% hardcoded mock data. Rebuild it to fetch real expense data from Supabase and render interactive charts using Recharts.

**Acceptance Criteria:**
- Reports page queries expenses from Supabase filtered by the active org and date range
- Monthly spending bar chart, category breakdown pie chart, and trend line are rendered with real data
- Date range filter (week/month/quarter/year) updates charts reactively
- Charts are responsive and display correctly on mobile and desktop
- Loading skeleton is shown while data is being fetched

**Priority:** P0
**Effort:** L
**Dependencies:** None

---

### 2.2 Rebuild Categories Page with Real DB-Backed CRUD

**Description:** The categories page (`categories/page.tsx:32-44`) is 100% hardcoded mock data with no database backing. Rebuild it with full CRUD operations against Supabase.

**Acceptance Criteria:**
- Categories are fetched from the `categories` table for the active org
- Users can create, edit, and delete categories (with confirmation)
- Category names are unique within an org (enforced at DB and UI level)
- Each category displays an icon, name, and expense count
- Deleting a category that has expenses prompts the user to reassign or archive

**Priority:** P0
**Effort:** L
**Dependencies:** None

---

### 2.3 Add Budget Limits per Category

**Description:** Users need to set monthly spending limits per category and track their spending against those limits. Add a budget model and UI for creating and monitoring budgets.

**Acceptance Criteria:**
- A `budgets` table is created with `category_id`, `amount`, and `month`/`year` columns
- Users can set a monthly budget amount on each category card
- The categories page shows a progress bar (spent vs. budget) with color coding (green → yellow → red)
- A notification banner appears when a category exceeds 80% of its budget
- Budget data persists across page refreshes and is org-scoped

**Priority:** P1
**Effort:** L
**Dependencies:** 2.2

---

### 2.4 Implement CSV Export with Streaming for Large Datasets

**Description:** There is no way to export expense data. Implement CSV export that streams data to handle large datasets without exhausting serverless function memory limits.

**Acceptance Criteria:**
- An "Export CSV" button is available on the expenses page and reports page
- Export respects the current date range and category filters
- Large datasets (10k+ rows) are streamed using `TransformStream` or equivalent
- The CSV includes all expense fields: date, description, amount, currency, category, vendor
- A loading indicator is shown during export; the file downloads on completion

**Priority:** P1
**Effort:** M
**Dependencies:** 2.1

---

### 2.5 Implement PDF Export with jsPDF Branding

**Description:** Complement CSV export with a branded PDF export for professional use cases (e.g., submitting expense reports to finance teams).

**Acceptance Criteria:**
- An "Export PDF" button is available alongside the CSV export button
- The PDF includes the Ledgerly logo, report title, date range, and a summary table
- Expense line items are paginated with proper page breaks
- Totals and subtotals are calculated and displayed at the bottom
- The PDF is generated client-side using `jspdf` and `jspdf-autotable`

**Priority:** P2
**Effort:** M
**Dependencies:** 2.1

---

### 2.6 Add Recurring Expenses Model + UI

**Description:** Users who pay for SaaS subscriptions, rent, or other recurring costs have no way to track them. Add a recurring expense model that automatically generates expense entries on a schedule.

**Acceptance Criteria:**
- A `recurring_expenses` table stores `amount`, `description`, `category_id`, `frequency` (weekly/monthly/yearly), and `next_due_date`
- A server-side cron job (or Supabase Edge Function) creates expense entries from recurring templates
- Users can create, edit, pause, and delete recurring expenses from the expenses page
- Each recurring expense shows its next due date and status (active/paused)
- Generated expenses are linked back to their recurring template

**Priority:** P1
**Effort:** XL
**Dependencies:** None

---

### 2.7 Add Expense Receipt Attachment Upload

**Description:** Users need to attach receipt images or PDFs to expense entries for record-keeping and audit purposes. Implement file upload using Supabase Storage.

**Acceptance Criteria:**
- An "Attach Receipt" button is present on each expense row and the expense form
- Supported file types: JPG, PNG, PDF (max 10MB per file)
- Files are uploaded to Supabase Storage in an org-scoped bucket with RLS
- Uploaded receipts are displayed as a thumbnail or file icon on the expense row
- Users can view, download, and delete attached receipts

**Priority:** P1
**Effort:** L
**Dependencies:** None

---

### 2.8 Fix Expense Stats to Show Full Totals

**Description:** The expense page statistics cards currently show totals only for the currently displayed page of results, which is misleading. Fix them to show the true total across all matching expenses.

**Acceptance Criteria:**
- Stats cards (total expenses, average, highest) reflect all expenses matching the current filters, not just the visible page
- A secondary label (e.g., "This Page Total") is shown for page-level stats if desired
- Stats update reactively when filters change
- A database-level aggregation query is used (not client-side sum of visible rows)
- Manual verification: filter to a category with 50+ expenses; stats should match a direct SQL query

**Priority:** P1
**Effort:** M
**Dependencies:** None

---

### 2.9 Fix Settings Page to Show Real User Email

**Description:** The settings page generates a fake email from the display name (`settings/page.tsx`), which is misleading. It should display the real user email from Supabase Auth.

**Acceptance Criteria:**
- The settings page fetches and displays the user's actual email from `supabase.auth.getUser()`
- The email field is read-only (email changes require Supabase email verification flow)
- The display name field is editable and saves to the `profiles` table
- No placeholder or generated email addresses are shown
- An "Update Email" link or CTA is present if email change is supported

**Priority:** P1
**Effort:** S
**Dependencies:** None

---

### 2.10 Fix Pricing Inconsistency Between Landing and Onboarding

**Description:** The landing page and the onboarding flow show different pricing for the same plans. This inconsistency confuses users and erodes trust. Align pricing across all pages.

**Acceptance Criteria:**
- Pricing data is defined in a single source of truth (e.g., a `pricing.ts` constants file)
- The landing page pricing section and the onboarding plan selector both reference this source
- Plan names, prices, and feature lists are identical across both pages
- A visual audit confirms no discrepancies between the two pages
- Changing the price in `pricing.ts` updates both pages simultaneously

**Priority:** P1
**Effort:** S
**Dependencies:** None

---

## EPIC 3: Architecture & Polish (Sprint 3)

**Goal:** Fix FSD violations, eliminate DRY violations, replace poor UI components, and improve the rendering architecture.

---

### 3.1 Convert Dashboard Layout to Server Component + Client Sidebar

**Description:** The dashboard layout is entirely client-rendered (`'use client'`), which prevents SSR, hurts performance, and means every layout render re-executes on the client. Extract the sidebar to a client component and make the layout a Server Component.

**Acceptance Criteria:**
- `dashboard/layout.tsx` no longer has `'use client'` at the top
- The sidebar is extracted to a separate `'use client'` component
- The layout renders as a Server Component, passing auth data down to the sidebar via props or context
- The page content area renders with SSR (view-source shows real HTML)
- No regressions in sidebar interactivity (org switch, nav highlighting, collapse/expand)

**Priority:** P1
**Effort:** L
**Dependencies:** None

---

### 3.2 Create entities/settings/repository.ts (FSD Fix)

**Description:** Settings actions bypass the entity layer and directly call Supabase from UI components, violating Feature-Sliced Design. Create a proper repository module in the entities layer.

**Acceptance Criteria:**
- A new file `entities/settings/repository.ts` is created with `getProfile`, `updateProfile`, and `updateEmail` functions
- All settings page Supabase calls go through this repository
- The repository handles error mapping and returns typed results
- The settings page UI no longer imports `createClient` directly
- Existing settings functionality is preserved without regression

**Priority:** P2
**Effort:** M
**Dependencies:** None

---

### 3.3 Extract Shared org-resolver.ts (DRY Fix)

**Description:** The `getOrgId()` helper is duplicated across multiple files. Extract it into a single shared utility to follow the DRY principle.

**Acceptance Criteria:**
- A new file `shared/lib/org-resolver.ts` exports a single `getOrgId()` function
- All existing `getOrgId()` implementations are replaced with imports from the shared module
- The function handles the org ID resolution logic (cookie → session → error) in one place
- No behavioral change; all callers receive the same org ID as before
- A grep confirms zero remaining duplicate implementations

**Priority:** P2
**Effort:** S
**Dependencies:** None

---

### 3.4 Build Custom Radix Select Component

**Description:** Native `<select>` elements look jarring on the dark UI (`settings/page.tsx:289`, `admin/page.tsx`). Build a custom Radix-based Select component that matches the design system.

**Acceptance Criteria:**
- A new `Select` component is built using `@radix-ui/react-select`
- It supports dark-mode styling matching the existing design tokens (emerald accent, glass-card background)
- It renders with a custom chevron icon, smooth open/close animation, and proper focus states
- It replaces all native `<select>` elements in the settings and admin pages
- Keyboard navigation (arrow keys, type-ahead) works correctly
- Screen reader announcements are correct (selected value, listbox role)

**Priority:** P2
**Effort:** M
**Dependencies:** None

---

### 3.5 Build Custom Radix Checkbox Component

**Description:** The login "Remember me" checkbox and other checkbox inputs are unstyled native elements. Build a custom Radix-based Checkbox component that matches the design system.

**Acceptance Criteria:**
- A new `Checkbox` component is built using `@radix-ui/react-checkbox`
- It renders with a custom check icon (Lucide `Check`), proper focus ring, and emerald accent color
- It replaces the native checkbox on the login page "Remember me" input
- `aria-checked` and `aria-label` are properly set
- Keyboard interaction (Space to toggle) works correctly

**Priority:** P2
**Effort:** S
**Dependencies:** None

---

### 3.6 Extract SidebarContent Component (DRY Fix)

**Description:** The sidebar JSX is duplicated (~70 lines) in `layout.tsx:152-286` for desktop and mobile views. Extract the shared content into a `<SidebarContent>` component.

**Acceptance Criteria:**
- A new `SidebarContent` component is extracted with all navigation links, org switcher, and user menu
- The desktop sidebar and mobile bottom nav both render `<SidebarContent>` with appropriate layout wrappers
- The extracted component is approximately 70 lines, matching the duplicated code
- Visual inspection confirms no layout or styling changes on desktop or mobile
- A grep confirms zero remaining duplicate sidebar JSX blocks

**Priority:** P2
**Effort:** S
**Dependencies:** 3.1

---

### 3.7 Replace window.location.reload() on Org Switch

**Description:** `org-provider.tsx:243` calls `window.location.reload()` after switching organizations, which causes a full page reload and poor UX. Replace it with a client-side state refresh.

**Acceptance Criteria:**
- `window.location.reload()` is removed from `org-provider.tsx`
- After org switch, `queryClient.clear()` is called to invalidate all React Query caches
- `router.refresh()` is called to re-fetch server component data
- The UI updates seamlessly without a visible page reload
- The active org indicator in the sidebar updates immediately

**Priority:** P2
**Effort:** S
**Dependencies:** 1.6

---

### 3.8 Remove Duplicate 'use client' in Org Provider

**Description:** `org-provider.tsx` has a duplicate `'use client'` directive at line 30 (it already has one at line 1). Remove the duplicate.

**Acceptance Criteria:**
- Line 30 of `org-provider.tsx` no longer contains `'use client'`
- The file still has exactly one `'use client'` directive at the top
- No behavioral change; the component continues to render as a client component

**Priority:** P3
**Effort:** S
**Dependencies:** None

---

### 3.9 Consolidate CSP to Single Source (security-headers.ts)

**Description:** The Content Security Policy is defined in two conflicting locations, which makes it impossible to maintain a consistent security posture. Consolidate to a single source.

**Acceptance Criteria:**
- CSP is defined only in `security-headers.ts`
- The duplicate CSP definition (in middleware or config) is removed
- All CSP directives are reviewed and reconciled between the two sources before removal
- A security header audit (e.g., securityheaders.com) confirms the CSP is applied correctly
- No CSP-related console errors in the browser after the change

**Priority:** P1
**Effort:** S
**Dependencies:** None

---

### 3.10 Make Expense Actions Import Static

**Description:** `duplicateExpense` uses a dynamic `import()` call where a static import would suffice. Dynamic imports add unnecessary complexity and bundle-splitting overhead for a small utility.

**Acceptance Criteria:**
- `duplicateExpense` uses a static `import` statement for its dependency
- The function's behavior is unchanged
- The module is included in the main bundle (no async loading)
- A build analysis confirms the chunk boundary has not shifted unexpectedly

**Priority:** P3
**Effort:** S
**Dependencies:** None

---

## EPIC 4: Premium UX (Sprint 4)

**Goal:** Elevate the app from "functional" to "polished" with animations, tooltips, real admin features, and refined interactions.

---

### 4.1 Add Page Transition Animations

**Status:** ✅ Done (2026-08-07)

**Description:** Navigation between dashboard pages is instant and jarring. Add subtle fade-in animations to page transitions for a premium feel.

**Acceptance Criteria:**
- All dashboard page wrappers include an `animate-fade-in` CSS animation
- The animation duration is 150–200ms with an ease-out curve
- Animations do not delay content rendering (no layout shift)
- Animations respect `prefers-reduced-motion` media query (disabled for users who prefer no motion)
- No performance regression on page navigation (Lighthouse animation metrics)

**Priority:** P2
**Effort:** S
**Dependencies:** None

---

### 4.2 Add Coordinated Skeleton Loading for Dashboard

**Description:** Individual components show their own loading states independently, creating a disjointed loading experience. Add coordinated skeleton screens that match the final layout.

**Acceptance Criteria:**
- The dashboard shows a full-page skeleton that mirrors the final card/chart layout
- Stats cards show skeleton rectangles; chart areas show skeleton chart placeholders
- Skeleton elements use a subtle shimmer animation
- The skeleton is replaced by real content in a coordinated manner (not piecemeal)
- Loading time under 500ms on a fast connection (skeleton is brief)

**Priority:** P2
**Effort:** M
**Dependencies:** 2.1

---

### 4.3 Build Tooltip Component for Icon-Only Elements

**Description:** Many sidebar icons and action buttons have no visible labels. Screen readers and sighted users alike benefit from tooltips on icon-only elements.

**Acceptance Criteria:**
- A new `Tooltip` component is built using `@radix-ui/react-tooltip`
- It supports `delayDuration` (300ms default), `side` (top/right/bottom/left), and custom content
- All icon-only buttons in the sidebar nav receive tooltips (e.g., "Dashboard", "Expenses", "Reports")
- Tooltip styling matches the design system (dark background, subtle border, emerald accent)
- Tooltips are dismissible and do not interfere with keyboard navigation

**Priority:** P2
**Effort:** M
**Dependencies:** None

---

### 4.4 Wire Admin Announcements to Actual Supabase Insert

**Description:** The admin announcements form (`admin/page.tsx:563-571`) renders but the "Send" button does nothing. Wire it to actually insert an announcement into Supabase and notify users.

**Acceptance Criteria:**
- An `announcements` table is created with `title`, `body`, `created_by`, and `created_at`
- The admin form inserts a new row into `announcements` on submit
- A success toast is shown after successful insertion
- The announcement appears on the admin page's announcement list after creation
- A confirmation dialog is shown before sending (to prevent accidental sends)

**Priority:** P2
**Effort:** M
**Dependencies:** None

---

### 4.5 Add Empty State Illustrations

**Description:** When users have no expenses, categories, or reports, they see a blank page with no guidance. Add friendly empty state illustrations with clear calls to action.

**Acceptance Criteria:**
- Each major list view (expenses, categories, reports) has a unique empty state component
- Each empty state includes a simple illustration (SVG), a heading, and a descriptive message
- A primary CTA button is present (e.g., "Add Your First Expense", "Create a Category")
- The CTA navigates to the appropriate creation flow
- Empty states are responsive and look good on mobile

**Priority:** P2
**Effort:** M
**Dependencies:** 2.2

---

### 4.6 Add Confirmation Modal for Destructive Actions

**Description:** Destructive actions like deleting expenses, categories, or org members have no confirmation step. A single mis-click can cause data loss. Add a confirmation modal.

**Acceptance Criteria:**
- A reusable `ConfirmDialog` component is created with title, body, confirm, and cancel props
- It is triggered before all delete operations (expenses, categories, members, recurring expenses)
- The confirm button uses red/danger styling; the cancel button is neutral
- Focus is trapped within the modal while open
- Pressing Escape or clicking the backdrop closes the modal without action

**Priority:** P2
**Effort:** M
**Dependencies:** None

---

### 4.7 Add Custom Focus Ring for Glass-Card Surfaces

**Description:** The default browser focus ring is nearly invisible against the glass-card (`bg-card`) surfaces. Add a custom focus ring that maintains accessibility while looking intentional.

**Acceptance Criteria:**
- A custom `focus-visible` ring style is defined for elements within `.glass-card` containers
- The ring uses the emerald primary color (`#34d399`) with appropriate opacity and offset
- The ring is visible against both dark card backgrounds and lighter hover states
- All interactive elements within cards (buttons, links, inputs) receive the custom ring
- Automated accessibility audit confirms all focusable elements have visible focus indicators

**Priority:** P2
**Effort:** S
**Dependencies:** None

---

### 4.8 Remove Landing Mobile Bottom Nav (Redundant)

**Description:** The landing page has a mobile bottom navigation bar that links to Settings → /login, which is redundant since the landing page already has login/signup CTAs. Remove it to declutter the mobile experience.

**Acceptance Criteria:**
- The mobile bottom navigation component is not rendered on the landing page
- Login and signup are still accessible via the header CTA on mobile
- The landing page hero and features sections take the full viewport width on mobile
- No layout shift occurs when the bottom nav is removed

**Priority:** P3
**Effort:** S
**Dependencies:** None

---

## Summary

| Epic | Stories | P0 | P1 | P2 | P3 | Total Effort |
|------|---------|-----|-----|-----|-----|-------------|
| 1: Security & Trust Fix | 12 | 8 | 4 | 0 | 0 | ~5.5 Sprints (days) |
| 2: Core Features | 10 | 2 | 8 | 0 | 0 | ~8 Sprints (days) |
| 3: Architecture & Polish | 10 | 0 | 1 | 6 | 3 | ~4 Sprints (days) |
| 4: Premium UX | 8 | 0 | 0 | 7 | 1 | ~4.5 Sprints (days) |
| **Total** | **40** | **10** | **13** | **13** | **4** | **~22 days** |

### Priority Breakdown

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 10 | Must ship — security, trust, or broken functionality |
| **P1** | 13 | Should ship — core features and accessibility |
| **P2** | 13 | Nice to have — polish and UX improvements |
| **P3** | 4 | Tech debt — clean up when convenient |
