# Ledgerly — Premium Audit Report

**Date:** 2026-07-26  
**Agents:** Winston (Architect) · John (PM) · Mary (Analyst) · Sally (UX Designer) · Amelia (Dev) · Paige (Tech Writer)

---

## Executive Summary

| Agent | Score | Verdict |
|-------|-------|---------|
| 🏛️ Winston | **6.5/10** | Security gaps (CSRF dead code, in-memory rate limit/cache), dashboard layout client-only, duplicate code |
| 📋 John | **4.5/10** | Reports page 100% hardcoded, categories page 100% mock, no export, no subscriptions |
| 📊 Mary | **4.5/10** | Landing page promises ~8 features that don't exist. Credibility time bomb |
| 🎨 Sally | **7.5/10** | Strong design system, native selects look cheap, accessibility gaps, fake "Trusted By" logos |
| 👩‍💻 Amelia | **7/10** | Solid security architecture, dual-cookie anti-pattern, DRY violations, 59 tests but no middleware/auth tests |
| 📝 Paige | **7/10** | README exists but no API docs, no architecture docs, no onboarding guide for devs |

**Overall: 6.2/10** — Beautiful shell, needs functional depth.

---

## Priority 1: CRITICAL (Security + Trust)

| # | Issue | Source | File:Line | Fix |
|---|-------|--------|-----------|-----|
| 1 | CSRF protection is dead code | Winston | `csrf.ts:4` | Delete fallback chain, require env var, wire into middleware |
| 2 | Rate limiting non-functional (in-memory Map) | Winston | `rate-limit.ts:5` | Replace with Upstash Redis / Vercel KV |
| 3 | Cache non-functional (in-memory Map) | Winston | `cache.ts:12` | Replace with distributed cache |
| 4 | Invite acceptance not transactional (5 sequential calls) | Winston | `invite/repository.ts:92-141` | Wrap in Supabase RPC transaction |
| 5 | Invite operations missing auth/role checks | Winston | `invite/repository.ts:44,57` | Add getUser() + role validation |
| 6 | Dual-cookie bypasses httpOnly security | Winston + Amelia | `org-provider.tsx:186,239` | Remove document.cookie, use server action only |
| 7 | Reports page is 100% hardcoded mock data | John | `reports/page.tsx:20-41` | Wire to real Supabase queries |
| 8 | Categories page is 100% hardcoded mock data | John | `categories/page.tsx:32-44` | Create DB-backed CRUD + budget limits |
| 9 | Fake "Trusted By" logos | John + Sally | `page.tsx:295-303` | Remove or replace with real social proof |
| 10 | Landing page promises features that don't exist | Mary | `page.tsx` multiple | Remove/reword unimplemented claims |

---

## Priority 2: HIGH (Core Features)

| # | Issue | Source | Fix |
|---|-------|--------|-----|
| 11 | No CSV/PDF export | John | Implement export with real data |
| 12 | No budgeting/budget limits per category | John + Mary | Add real budgets on categories page |
| 13 | No recurring expenses | John + Mary | Add recurring expense tracking — ✅ DONE (migration 015, `src/features/recurring/`; auto-materializes due instances on the expenses page) |
| 14 | No expense attachments/receipt upload | John | Add file upload for expenses — ✅ DONE (migration 016 + `receipts` storage bucket, `src/features/attachments/`; image-only ≤5MB, per-row paperclip) |
| 15 | Dashboard layout is entirely client-rendered | Winston | Extract sidebar to client component, make layout Server Component |
| 16 | Settings actions bypass entity layer (FSD violation) | Winston + Amelia | Create `entities/settings/repository.ts` |
| 17 | Duplicate getOrgId() helper | Winston + Amelia | Extract to `shared/lib/org-resolver.ts` |
| 18 | CSP defined in two conflicting locations | Winston | Keep only `security-headers.ts` |
| 19 | Expense page stats show page-only total, not full total | Sally | Label "This Page Total" or fetch summary |
| 20 | Settings page generates fake email from display name | Sally | Show real user email from Supabase auth |

---

## Priority 3: MEDIUM (Polish + Accessibility)

| # | Issue | Source | File:Line | Fix |
|---|-------|--------|-----------|-----|
| 21 | Password toggle missing aria-label | Sally | `login/page.tsx:93`, `login-form.tsx:74`, `signup-form.tsx:123` | Add aria-label |
| 22 | No skip-to-content link | Sally | `dashboard/layout.tsx` | Add skip link |
| 23 | Native `<select>` elements look jarring on dark UI | Sally | `settings/page.tsx:289`, `admin/page.tsx` | Build custom Radix Select |
| 24 | Admin announcements don't actually send | Sally | `admin/page.tsx:563-571` | Wire to Supabase insert |
| 25 | No error boundaries on dashboard routes | Winston | All `(dashboard)/routes` | Add `error.tsx` files |
| 26 | `maximumScale: 1` prevents pinch-to-zoom | Winston | `layout.tsx:29` | Remove maximumScale |
| 27 | `window.location.reload()` on org switch | Winston | `org-provider.tsx:243` | Use queryClient.clear() + router.refresh() |
| 28 | No Tooltip component | Sally | Global | Add Radix Tooltip for icon-only elements |
| 29 | Duplicate sidebar JSX (~70 lines) | Winston | `layout.tsx:152-286` | Extract `<SidebarContent>` component |
| 30 | Login "Remember me" checkbox unstyled | Sally | `login/page.tsx:104-108` | Custom checkbox component |

---

## Priority 4: LOW (Debt + Docs)

| # | Issue | Source | Fix |
|---|-------|--------|-----|
| 31 | No barrel exports (index.ts) in entity/feature dirs | Winston | Add index.ts files |
| 32 | Empty FSD layers (widgets/layout, processes) | Winston | Populate or remove |
| 33 | Duplicate 'use client' in org-provider | Amelia | Remove line 30 |
| 34 | Dynamic import in duplicateExpense | Amelia | Make static import |
| 35 | No API documentation | Paige | Create OpenAPI/Swagger docs |
| 36 | No architecture decision records | Paige | Create ADRs for key decisions |
| 37 | No developer onboarding guide | Paige | Add CONTRIBUTING.md |
| 38 | Pricing inconsistency (landing vs onboarding) | John | Align prices across pages |
| 39 | Landing mobile bottom nav links to Settings→/login | Sally | Remove Settings from landing nav |
| 40 | No page transitions | Sally | Add animate-fade-in to page wrappers |

---

## Scorecard

| Dimension | Before | Target |
|-----------|--------|--------|
| Architecture | 6.5 | 9.5 |
| Product Completeness | 4.5 | 8.5 |
| Competitive Position | 4.5 | 8.0 |
| Design Polish | 7.5 | 9.5 |
| Code Quality | 7.0 | 9.0 |
| Documentation | 7.0 | 9.0 |
| **OVERALL** | **6.2** | **8.9** |

---

## Recommended Sprint Order

### Sprint 1 (Security + Trust Fix) — 3-4 days
1. Fix CSRF, rate limiting, cache (security gaps #1-3)
2. Remove fake "Trusted By" + unimplemented landing page claims (#9, #10)
3. Fix dual-cookie security model (#6)
4. Fix invite transaction + auth (#4, #5)
5. Add error boundaries (#25)
6. Fix accessibility gaps (#21, #22, #26)

### Sprint 2 (Core Features) — 5-7 days
7. Reports page with real data (#7) — ✅
8. Categories page with real DB-backed CRUD + budgets (#8, #12) — ✅
9. CSV/PDF export (#11) — ✅
10. Recurring expenses (#13) — ✅
11. Expense attachments/receipt upload (#14) — ✅
12. Fix expense stats to show full totals (#19)

### Sprint 3 (Architecture + Polish) — 3-4 days
13. Dashboard layout SSR conversion (#15)
14. Settings entity repository (#16)
15. Extract shared org resolver (#17)
16. Custom Select/Checkbox components (#23, #30)
17. Sidebar component extraction (#29)
18. Org switch without page reload (#27)

### Sprint 4 (Premium UX) — 3-4 days
19. Page transitions + coordinated skeleton loading (#40)
20. Tooltip system (#28)
21. Admin announcements actually work (#24)
22. Fix settings email display (#20)
23. Landing page hero with real dashboard preview
24. Empty state illustrations
