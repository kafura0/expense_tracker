# Ledgerly — Sprint Plan

**Date:** 2026-07-26
**Source:** PREMIUM_AUDIT.md (6.2/10 → 8.9/10 target)
**Duration:** 4 sprints, 19 working days
**Velocity:** ~5 story points/day (95 total story points)

---

## Velocity & Estimation

| Sprint | Days | Story Points | Avg/Day |
|--------|------|-------------|---------|
| Sprint 1 | 4 | 22 | 5.5 |
| Sprint 2 | 7 | 35 | 5.0 |
| Sprint 3 | 4 | 20 | 5.0 |
| Sprint 4 | 4 | 18 | 4.5 |
| **Total** | **19** | **95** | **5.0** |

Story Point Scale: 1 = trivial (< 30 min), 2 = small (< 2 hrs), 3 = medium (< 4 hrs), 5 = large (< 1 day), 8 = epic (1-2 days)

---

## Definition of Done (All Sprints)

- [ ] All new code has TypeScript strict typing (no `any`)
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm test` — all existing + new tests pass
- [ ] No regressions in existing functionality (manual smoke test)
- [ ] Changes reviewed against PREMIUM_AUDIT.md findings
- [ ] Git commit with descriptive message referencing audit issue numbers

---

## Testing Requirements

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit | Vitest | 80%+ for new business logic |
| Integration | Vitest | RPC/transaction flows |
| E2E | Manual | Critical path smoke test per sprint |
| Build | `npm run build` | Zero errors, zero warnings |
| Lint | `npm run lint` | Zero errors |
| Accessibility | Manual audit (Sprint 4) | WCAG 2.1 AA |

---

## Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| R1 | Upstash Redis integration breaks existing rate limit tests | High | Medium | Run tests after each Upstash change; keep fallback path for local dev |
| R2 | RPC transaction for invites has Supabase edge cases | High | Low | Test with seed data; add retry logic; log failures |
| R3 | Real Supabase queries expose missing indexes/RLS issues | High | Medium | Add indexes before wiring; test with role-based seed data |
| R4 | jsPDF/Papa Parse bundle size bloat | Medium | Medium | Dynamic import; lazy load on export button click |
| R5 | Dashboard SSR conversion breaks client-side hooks | High | Medium | Extract gradually; keep `use client` on sidebar; test all routes |
| R6 | Radix Select/Checkbox custom components regress form behavior | Medium | Low | Write tests; compare with native behavior; keep native fallback |
| R7 | Animations cause layout shift or performance issues | Low | Medium | Use `transform` + `opacity` only; test on low-end devices |
| R8 | Sprint scope creep from audit's 40 items | High | High | Strict adherence to sprint plan; defer out-of-scope items |
| R9 | Vercel deploy fails due to new dependencies | Medium | Low | Test build locally before each deploy |
| R10 | Seed data mismatches with new DB schema | Medium | Medium | Update seed script in same PR as schema changes |

---

## Review Checkpoints

| Checkpoint | When | Focus | Criteria to Pass |
|------------|------|-------|-----------------|
| CP-1 | End of Sprint 1 | Security fixes verified, no auth regressions | All security audit items P1 closed; manual login/logout/org-switch test passes |
| CP-2 | End of Sprint 2 | Core features functional, real data flows | Reports show real data, categories CRUD works, exports generate valid files |
| CP-3 | End of Sprint 3 | Architecture clean, no `any` types, build clean | FSD structure followed, all routes SSR-ready, zero lint errors |
| CP-4 | End of Sprint 4 | Polish complete, accessibility passes | WCAG 2.1 AA manual audit, Lighthouse > 90, zero console errors |

---

---

# SPRINT 1: Security & Trust Fix

**Days 1–4 | 22 Story Points**
**Goal:** Close all Critical security gaps and remove trust-damaging fake content.

---

## Day 1 — Security Foundations

**Story Points: 6 | Focus: Infrastructure security fixes**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Replace in-memory rate limiting with Upstash Redis | 3 | #2 | `src/shared/lib/rate-limit.ts`, `package.json` | Rate limit state persists across requests; works on Vercel; local dev falls back to in-memory |
| Replace in-memory cache with Upstash Redis | 2 | #3 | `src/shared/lib/cache.ts` | Cache survives request lifecycle; TTL works; no stale data |
| Remove dead CSRF fallback chain, require CSRF_SECRET env var | 1 | #1 | `src/shared/lib/csrf.ts`, `.env.example` | CSRF token generation works; env var missing = crash with clear error; no fallback to 'dev-secret' |

**End-of-Day Verification:**
- `npm run build` passes
- `npm test` — existing tests still pass
- Manual: hitting rate-limited endpoint returns 429 after threshold

---

## Day 2 — Security Model

**Story Points: 7 | Focus: Auth/security hardening**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Remove `document.cookie` writes in org-provider | 2 | #6 | `src/features/org-switcher/org-provider.tsx` | No `document.cookie` anywhere in codebase; org set via server action only |
| Fix invite acceptance: wrap in Supabase RPC transaction | 2 | #4 | `src/entities/invite/repository.ts` | Invite acceptance is atomic — role creation + org membership happen in one DB call |
| Add auth/role checks to listInvites and revokeInvite | 2 | #5 | `src/entities/invite/repository.ts` | Unauthenticated users get 401; non-admins get 403 |
| Consolidate CSP to single source (`security-headers.ts`) | 1 | #18 | `src/shared/lib/security-headers.ts`, `next.config.ts` | CSP defined in one place only; no conflicting headers |

**End-of-Day Verification:**
- `npm run build` passes
- `npm test` — all tests pass
- Manual: invite flow works end-to-end; org switch doesn't set cookies directly

---

## Day 3 — Trust & Landing

**Story Points: 5 | Focus: Remove fake content, fix credibility issues**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Remove fake "Trusted By" logos section | 2 | #9 | `src/app/(public)/page.tsx` | No fake company logos on landing page |
| Remove/reword unimplemented feature claims | 2 | #10 | `src/app/(public)/page.tsx` | Every claimed feature exists in the codebase; vague claims removed |
| Fix pricing inconsistency (landing vs onboarding) | 1 | #38 | `src/app/(public)/page.tsx`, onboarding pages | Price points match across all pages |

**End-of-Day Verification:**
- `npm run build` passes
- Manual review: landing page makes only truthful claims
- No broken links or references to removed sections

---

## Day 4 — Accessibility & Polish

**Story Points: 4 | Focus: a11y, error handling, full validation**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Add aria-labels to all password toggle buttons | 1 | #21 | `login/page.tsx`, `login-form.tsx`, `signup-form.tsx` | Screen reader announces "Show password" / "Hide password" |
| Add skip-to-content link in dashboard layout | 1 | #22 | `src/app/(dashboard)/layout.tsx` | Tab from top reveals skip link; activates correctly |
| Remove `maximumScale: 1` from viewport meta | 0.5 | #26 | `src/app/layout.tsx` | Pinch-to-zoom works on mobile |
| Add `error.tsx` to all dashboard routes | 1.5 | #25 | `src/app/(dashboard)/*/error.tsx` (5 files) | Each route has an error boundary; errors show friendly UI, not white screen |

**End-of-Day Verification — Sprint 1 Checkpoint (CP-1):**
- [ ] `npm run build` — zero errors
- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — all tests pass
- [ ] Manual smoke test: login → org switch → invite flow → logout
- [ ] All P1 audit items closed (#1-#6, #9, #10, #18, #21, #22, #25, #26, #38)
- [ ] No `document.cookie` in codebase (`grep -r "document.cookie" src/`)
- [ ] Upstash rate limiter active in production-like env

---

---

# SPRINT 2: Core Features

**Days 5–11 | 35 Story Points**
**Goal:** Replace all mock data with real Supabase queries; ship export and budgets.

---

## Day 5 — Reports: Schema & Queries

**Story Points: 5 | Focus: Data layer for reports**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Create Supabase migration for reports-related views/materialized views | 2 | #7 | `supabase/migrations/` | DB views aggregate expenses by category, date range, and trend |
| Create `src/entities/report/repository.ts` | 2 | #7 | `src/entities/report/repository.ts` | Functions: getSummary, getByCategory, getTrend, getByDateRange |
| Add repository tests | 1 | #7 | `src/entities/report/__tests__/repository.test.ts` | Unit tests for each query function |

**End-of-Day Verification:**
- Migration applies cleanly to Supabase
- Tests pass against local Supabase or mocks

---

## Day 6 — Reports: Page Rebuild

**Story Points: 5 | Focus: Real data on reports page**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Rebuild reports page with real Supabase data | 2 | #7 | `src/app/(dashboard)/reports/page.tsx` | Reports page shows real expense totals by category and trend |
| Add Recharts charts wired to real data | 1.5 | #7 | `src/app/(dashboard)/reports/page.tsx`, Recharts components | Bar chart (by category), line chart (trend over time) render correctly |
| Add date range filtering | 1 | #7 | Reports page | User can select date range; charts update |
| Add loading skeletons + error states | 0.5 | #7 | Reports page | Skeleton shown during load; error message on failure |

**End-of-Day Verification:**
- `npm run build` passes
- Reports page loads with real data from seed users
- Date range filter works
- No hardcoded mock data remains in `reports/page.tsx`

---

## Day 7 — Categories: Schema & CRUD

**Story Points: 5 | Focus: Database-backed categories**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Create Supabase migration for categories table (if not exists) | 1 | #8 | `supabase/migrations/` | Categories table with id, name, color, org_id, user_id, is_system |
| Create `src/entities/category/repository.ts` | 2 | #8 | `src/entities/category/repository.ts` | Functions: list, create, update, delete with RLS |
| Create `src/entities/category/api.ts` (server actions) | 1 | #8 | `src/entities/category/api.ts` | createCategory, updateCategory, deleteCategory server actions |
| Add repository + API tests | 1 | #8 | `src/entities/category/__tests__/` | CRUD operations tested with mock Supabase |

**End-of-Day Verification:**
- Migration applies cleanly
- CRUD operations work via server actions
- RLS policies enforce org isolation

---

## Day 8 — Categories: Page & Budgets

**Story Points: 5 | Focus: Real categories page + budget limits**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Rebuild categories page with real data | 1.5 | #8 | `src/app/(dashboard)/categories/page.tsx` | Shows real categories; create/edit/delete works |
| Add budget limits per category (schema + UI) | 2 | #12 | Migration, categories page | User can set monthly budget per category; stored in DB |
| Add budget progress indicators (Recharts/visual) | 1.5 | #12 | Categories page | Progress bar shows spent vs budget; color-coded (green/yellow/red) |

**End-of-Day Verification:**
- Categories CRUD works end-to-end
- Budget limits persist across page reloads
- Progress indicators accurately reflect expense totals

---

## Day 9 — Export: CSV

**Story Points: 4 | Focus: CSV export**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Install and configure Papa Parse | 0.5 | #11 | `package.json` | Papa Parse installed; dynamic import configured |
| Create `src/shared/lib/export-csv.ts` | 1.5 | #11 | `src/shared/lib/export-csv.ts` | Function takes expense array + filename; streams CSV; triggers download |
| Add export button to expenses page | 1 | #11 | `src/app/(dashboard)/expenses/page.tsx` | "Export CSV" button; downloads all filtered expenses |
| Add export button to reports page | 1 | #11 | Reports page | "Export CSV" button; downloads summary data |

**End-of-Day Verification:**
- Click "Export CSV" → downloads valid `.csv` file
- CSV opens correctly in Excel/Google Sheets
- Large datasets (1000+ rows) export without freezing UI

---

## Day 10 — Export: PDF

**Story Points: 4 | Focus: PDF export**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Install and configure jsPDF | 0.5 | #11 | `package.json` | jsPDF installed; dynamic import configured |
| Create `src/shared/lib/export-pdf.ts` | 1.5 | #11 | `src/shared/lib/export-pdf.ts` | Function generates PDF with header, table, totals; triggers download |
| Add export button to expenses page | 1 | #11 | Expenses page | "Export PDF" button; downloads formatted expense report |
| Add export button to reports page | 1 | #11 | Reports page | "Export PDF" button; downloads summary with charts |

**End-of-Day Verification:**
- Click "Export PDF" → downloads valid `.pdf` file
- PDF opens correctly in browser and Adobe Reader
- PDF includes formatted table with totals

---

## Day 11 — Expenses Polish

**Story Points: 5 | Focus: Recurring expenses, attachments, stats fix**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Add recurring expenses model (schema + UI) | 2 | #13 | Migration, expenses page | User can mark expense as recurring (weekly/monthly/yearly); visual indicator |
| Add expense receipt attachment upload | 1.5 | #14 | Expenses page, Supabase Storage | User can upload image/PDF receipt per expense; stored in Supabase Storage |
| Fix expense stats to show full totals (not page-only) | 1 | #19 | Expenses page | Stats show total across all expenses, not just current page; label clarified |
| Fix settings page fake email display | 0.5 | #20 | Settings page | Shows real user email from Supabase auth, not generated from display name |

**End-of-Day Verification — Sprint 2 Checkpoint (CP-2):**
- [ ] `npm run build` — zero errors
- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — all tests pass
- [ ] Reports page: real data, charts, date filtering, export
- [ ] Categories page: real CRUD, budget limits, progress indicators
- [ ] Export: CSV and PDF both generate valid files
- [ ] Expenses: recurring flag, receipt upload, correct totals
- [ ] Settings: real email displayed
- [ ] All P2 audit items closed (#7, #8, #11-#14, #19, #20)
- [ ] No mock data remains in any page (`grep -r "hardcoded\|mock\|dummy" src/app/`)

---

---

# SPRINT 3: Architecture & Polish

**Days 12–15 | 20 Story Points**
**Goal:** Clean up architecture debt, SSR the dashboard, replace native form controls.

---

## Day 12 — Architecture Cleanup

**Story Points: 5 | Focus: DRY violations, FSD compliance**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Extract `<SidebarContent>` component from layout | 2 | #29 | `src/widgets/layout/sidebar-content.tsx`, `src/app/(dashboard)/layout.tsx` | Layout reduces from ~286 lines to ~120; sidebar renders identically |
| Extract shared `org-resolver.ts` | 1.5 | #17 | `src/shared/lib/org-resolver.ts` | Single `getOrgId()` function used across all features; no duplicates |
| Create `src/entities/settings/repository.ts` | 1.5 | #16 | `src/entities/settings/repository.ts` | Settings CRUD via entity layer; no direct Supabase calls in pages |

**End-of-Day Verification:**
- Layout renders identically to before extraction
- `getOrgId` imported from single source everywhere
- Settings actions go through entity repository

---

## Day 13 — Dashboard SSR

**Story Points: 5 | Focus: Server Component layout**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Convert dashboard layout to Server Component | 3 | #15 | `src/app/(dashboard)/layout.tsx` | Layout itself is a Server Component; no `'use client'` at top level |
| Extract sidebar to dedicated client component | 1 | #15 | `src/widgets/layout/sidebar.tsx` | Sidebar has `'use client'` for interactivity; receives server props |
| Pass user/org data as server props | 1 | #15 | Layout + pages | User session fetched server-side; passed as props to client components |

**End-of-Day Verification:**
- Dashboard loads with server-rendered shell (view source shows HTML)
- Sidebar interactivity (collapse, links) still works
- No hydration errors in console
- Performance: initial paint faster (measurable in DevTools)

---

## Day 14 — Custom Components

**Story Points: 5 | Focus: Replace native form controls**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Build custom Radix Select component | 2 | #23 | `src/shared/ui/select.tsx` | Styled dropdown matching dark theme; keyboard accessible; replaces all native `<select>` |
| Build custom Radix Checkbox component | 1.5 | #30 | `src/shared/ui/checkbox.tsx` | Styled checkbox with glass-card theme; used on login "Remember me" |
| Replace `window.location.reload()` on org switch | 1.5 | #27 | `src/features/org-switcher/org-provider.tsx` | Org switch uses `queryClient.clear()` + `router.refresh()`; no full page reload |

**End-of-Day Verification:**
- Custom Select renders on settings page and admin page
- Checkbox renders on login page with correct styling
- Org switch transitions smoothly without page flash
- Keyboard navigation works for Select and Checkbox

---

## Day 15 — Cleanup & Validation

**Story Points: 5 | Focus: Code quality, build validation**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Make expense `duplicateExpense` import static | 0.5 | #34 | Expense page/features | No dynamic import for duplicateExpense |
| Fix all TypeScript `any` types | 2 | General | Multiple files | `grep -r ": any\|as any" src/` returns zero results |
| Fix duplicate `'use client'` in org-provider | 0.5 | #33 | `src/features/org-switcher/org-provider.tsx` | Single `'use client'` at top of file |
| Run full build + lint + test | 1 | General | — | All three pass with zero errors |
| Fix any regressions | 1 | General | — | All pages render correctly; no visual regressions |

**End-of-Day Verification — Sprint 3 Checkpoint (CP-3):**
- [ ] `npm run build` — zero errors
- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — all tests pass
- [ ] `grep -r ": any\|as any" src/` — zero results
- [ ] Dashboard SSR verified (view source shows server-rendered HTML)
- [ ] Sidebar extracted to `<SidebarContent>` component
- [ ] `getOrgId` imported from `shared/lib/org-resolver.ts` only
- [ ] Custom Select/Checkbox replacing native elements
- [ ] Org switch doesn't trigger `window.location.reload()`
- [ ] All P3 architecture items closed (#15-#18, #23, #27, #29, #30, #33, #34)

---

---

# SPRINT 4: Premium UX

**Days 16–19 | 18 Story Points**
**Goal:** Elevate design polish to premium SaaS standard; accessibility audit; final deploy.

---

## Day 16 — Animations

**Story Points: 5 | Focus: Motion and loading states**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Add page transition animations | 2 | #40 | `src/app/layout.tsx`, `tailwind.config.ts` | Pages fade in on navigation; CSS-only (`animate-fade-in`), no JS animation library |
| Add coordinated skeleton loading states | 2 | General | Dashboard, expenses, reports pages | Skeleton matches final layout shape; consistent across all pages |
| Add card hover lift micro-interactions | 1 | General | `src/shared/ui/card.tsx`, dashboard cards | Subtle lift + shadow on hover; respects `prefers-reduced-motion` |

**End-of-Day Verification:**
- Page transitions smooth; no layout shift
- Skeletons appear during loading; match content shape
- Card hover feels premium; no jank on low-end devices

---

## Day 17 — Components & Modals

**Story Points: 5 | Focus: Tooltip, confirmation modals, focus styles**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Build Radix Tooltip component | 1.5 | #28 | `src/shared/ui/tooltip.tsx` | Tooltip appears on hover/focus for icon-only buttons; styled with glass-card theme |
| Add confirmation modal for destructive actions | 2 | General | `src/shared/ui/confirm-dialog.tsx` | Delete expense, delete category, revoke invite all show confirmation modal |
| Add custom focus ring for glass-card surfaces | 1.5 | General | `src/app/globals.css`, card components | Focus ring uses emerald primary color; visible on dark backgrounds; meets WCAG contrast |

**End-of-Day Verification:**
- Tooltips appear on all icon-only buttons
- Destructive actions require confirmation
- Focus ring visible on all interactive elements

---

## Day 18 — States & Cleanup

**Story Points: 4 | Focus: Empty states, onboarding, landing cleanup**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Add empty state illustrations/messages | 1.5 | General | Expenses, categories, reports pages | Friendly illustration + CTA when no data exists |
| Add onboarding coaching tooltips | 1.5 | General | Dashboard, expenses pages | First-time users see guided tooltips (dismissable, stored in localStorage) |
| Remove Settings link from landing mobile bottom nav | 0.5 | #39 | `src/app/(public)/page.tsx` | Landing mobile nav has no Settings link (it linked to /login) |
| Wire admin announcements to Supabase | 0.5 | #24 | Admin page | Announcements insert into Supabase; persisted across sessions |

**End-of-Day Verification:**
- Empty states show on fresh account
- Onboarding tooltips appear for new users; don't repeat after dismissal
- Landing mobile nav is clean
- Admin announcements persist in database

---

## Day 19 — Final Validation & Deploy

**Story Points: 4 | Focus: Testing, audits, deploy**

| Task | SP | Audit # | Files | Acceptance Criteria |
|------|----|---------|-------|-------------------|
| Full regression testing | 1 | General | All routes | Every page loads; every action works; no console errors |
| Accessibility audit (WCAG 2.1 AA) | 1 | General | All routes | Manual audit: keyboard nav, screen reader, color contrast, focus management |
| Performance audit (Lighthouse) | 1 | General | Key pages | Lighthouse scores: Performance > 90, Accessibility > 90, Best Practices > 95 |
| Final Vercel deploy + release notes | 1 | General | Vercel, GitHub | Production deploy succeeds; release notes document all changes |

**End-of-Day Verification — Sprint 4 Checkpoint (CP-4):**
- [ ] `npm run build` — zero errors
- [ ] `npm run lint` — zero warnings
- [ ] `npm test` — all tests pass
- [ ] Manual regression: login → dashboard → expenses → reports → categories → settings → admin
- [ ] Lighthouse: Performance > 90, Accessibility > 90
- [ ] WCAG 2.1 AA manual audit passed
- [ ] No console errors in any route
- [ ] Vercel production deploy successful
- [ ] All P4 audit items closed (#24, #28, #29, #39, #40)
- [ ] Release notes published on GitHub

---

---

# Appendix: Audit Issue → Sprint Mapping

| Audit # | Issue | Sprint | Day | Status |
|---------|-------|--------|-----|--------|
| 1 | CSRF dead code | Sprint 1 | 1 | ⬜ |
| 2 | Rate limiting in-memory | Sprint 1 | 1 | ⬜ |
| 3 | Cache in-memory | Sprint 1 | 1 | ⬜ |
| 4 | Invite not transactional | Sprint 1 | 2 | ⬜ |
| 5 | Invite missing auth checks | Sprint 1 | 2 | ⬜ |
| 6 | Dual-cookie bypass | Sprint 1 | 2 | ⬜ |
| 7 | Reports mock data | Sprint 2 | 5-6 | ⬜ |
| 8 | Categories mock data | Sprint 2 | 7-8 | ⬜ |
| 9 | Fake "Trusted By" logos | Sprint 1 | 3 | ⬜ |
| 10 | Fake feature claims | Sprint 1 | 3 | ⬜ |
| 11 | No CSV/PDF export | Sprint 2 | 9-10 | ⬜ |
| 12 | No budget limits | Sprint 2 | 8 | ⬜ |
| 13 | No recurring expenses | Sprint 2 | 11 | ⬜ |
| 14 | No receipt attachments | Sprint 2 | 11 | ⬜ |
| 15 | Dashboard client-only layout | Sprint 3 | 13 | ⬜ |
| 16 | Settings FSD violation | Sprint 3 | 12 | ⬜ |
| 17 | Duplicate getOrgId | Sprint 3 | 12 | ⬜ |
| 18 | CSP dual definitions | Sprint 1 | 2 | ⬜ |
| 19 | Expense stats wrong total | Sprint 2 | 11 | ⬜ |
| 20 | Settings fake email | Sprint 2 | 11 | ⬜ |
| 21 | Password toggle aria-label | Sprint 1 | 4 | ⬜ |
| 22 | No skip-to-content | Sprint 1 | 4 | ⬜ |
| 23 | Native `<select>` ugly | Sprint 3 | 14 | ⬜ |
| 24 | Admin announcements fake | Sprint 4 | 18 | ⬜ |
| 25 | No error boundaries | Sprint 1 | 4 | ⬜ |
| 26 | maximumScale: 1 | Sprint 1 | 4 | ⬜ |
| 27 | window.location.reload | Sprint 3 | 14 | ⬜ |
| 28 | No Tooltip component | Sprint 4 | 17 | ⬜ |
| 29 | Duplicate sidebar JSX | Sprint 3 | 12 | ⬜ |
| 30 | Unstyled checkbox | Sprint 3 | 14 | ⬜ |
| 31 | No barrel exports | Deferred | — | 🟡 |
| 32 | Empty FSD layers | Deferred | — | 🟡 |
| 33 | Duplicate 'use client' | Sprint 3 | 15 | ⬜ |
| 34 | Dynamic import in duplicate | Sprint 3 | 15 | ⬜ |
| 35 | No API docs | Deferred | — | 🟡 |
| 36 | No ADRs | Deferred | — | 🟡 |
| 37 | No dev onboarding guide | Deferred | — | 🟡 |
| 38 | Pricing inconsistency | Sprint 1 | 3 | ⬜ |
| 39 | Landing mobile nav Settings | Sprint 4 | 18 | ⬜ |
| 40 | No page transitions | Sprint 4 | 16 | ⬜ |

**Deferred items (31, 32, 35, 36, 37):** Documentation and empty FSD layer cleanup can be addressed in a follow-up sprint or as community contributions.

---

---

# Appendix: Story Points by Day

| Day | Sprint | Focus | SP |
|-----|--------|-------|----|
| 1 | 1 | Security Foundations | 6 |
| 2 | 1 | Security Model | 7 |
| 3 | 1 | Trust & Landing | 5 |
| 4 | 1 | Accessibility & Polish | 4 |
| **Sprint 1** | | | **22** |
| 5 | 2 | Reports: Schema & Queries | 5 |
| 6 | 2 | Reports: Page Rebuild | 5 |
| 7 | 2 | Categories: Schema & CRUD | 5 |
| 8 | 2 | Categories: Page & Budgets | 5 |
| 9 | 2 | Export: CSV | 4 |
| 10 | 2 | Export: PDF | 4 |
| 11 | 2 | Expenses Polish | 5 |
| **Sprint 2** | | | **33** |
| 12 | 3 | Architecture Cleanup | 5 |
| 13 | 3 | Dashboard SSR | 5 |
| 14 | 3 | Custom Components | 5 |
| 15 | 3 | Cleanup & Validation | 5 |
| **Sprint 3** | | | **20** |
| 16 | 4 | Animations | 5 |
| 17 | 4 | Components & Modals | 5 |
| 18 | 4 | States & Cleanup | 4 |
| 19 | 4 | Final Validation & Deploy | 4 |
| **Sprint 4** | | | **18** |
| | | **GRAND TOTAL** | **93** |
