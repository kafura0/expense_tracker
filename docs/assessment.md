# Assessment — Ledgerly Core (reconstructed)

Reconstructed from `docs/PREMIUM_AUDIT.md` (40 findings, P1–P4), `docs/code-review.md` (29 findings), `docs/implementation-readiness-report.md` (5 blockers), and `docs/deferred-work.md` (D-01…D-07), cross-checked against the current codebase.

## Rubric — 7.2/10, 9 actions

| # | Action | Source findings | Status | Score |
|---|--------|-----------------|--------|-------|
| 1 | Security hardening — CSRF, rate limiting, sensitive cache headers | P1 #1–3, IR B1/B4 | Done. `rate-limit.ts` w/ UpstashRedisRateLimitStore + tests; `security-headers.ts`, `csrf.ts` unit-tested | 8.5 |
| 2 | Invite flow — transactional, auth-checked, email delivery | P1 #4–5, BH-04/05/06, EC-02/03, D-01, D-06 | Done. `accept_invite` RPC (migration 014), Resend mailer, invite repo/actions | 8.5 |
| 3 | Cookie trust model — single httpOnly server-set org cookie | P2 #6, AA-01/02, BH-02, D-02/D-03 | Done. Dual-cookie shadowing removed | 8.0 |
| 4 | Reports on real data | P1 #7 | Done. React-query over expenses, CSV/PDF export wired | 8.5 |
| 5 | Categories DB-backed + budgets | P1 #8, P2 #12 | Done. `category_id` persisted + budget entity (org/personal); expense form now reads scoped DB categories (code-defined `catalog.ts` removed) | 9.0 |
| 6 | Trust & truthfulness — landing claims, fake logos, pricing | P1 #9–10, P3 #38–39 | Partial. Addressable/logo/hero reworked; pricing trust blocks partially verified | 7.0 |
| 7 | CSV/PDF export | P2 #11 | Done. `csv-export.ts`, `pdf-export.ts` (jspdf+autotable), unit tests | 8.5 |
| 8 | Architecture & resilience — entities, org-resolver, error boundaries, announcements | P2 #15–18, #24, #25 | Done. Entity layer + announcements done; global `error.tsx` + `(dashboard)/error.tsx` added | 8.5 |
| 9 | Test coverage + middleware/auth tests + green CI/CD | Amelia, IR NFR, D-05 | Mostly done. 68→204 tests, CI green (lint/test/e2e/build), D-05 fail-open middleware + mode header; boundary tests absent | 7.5 |

## Weighted overall

P1×3, P2×2, P3×1, P4×0.5 → **≈ 8.2/10**

## Remaining gaps

- None of the original 9 actions remain open. Watch items: no `kind` (income/expense) column on categories. Recurring expenses (#13) and receipt uploads (#14) shipped in the 2026-08-06 feature pass (migrations 015/016); page transitions (#40) shipped 2026-08-07 (pathname-keyed `PageTransition`, `prefers-reduced-motion` respected).

## Status log

| Date | Change | Score |
|------|--------|-------|
| 2026-08-05 | Rubric reconstructed from audit docs | 7.8–8.0 |
| 2026-08-05 | Error boundaries added (`src/app/error.tsx`, `(dashboard)/error.tsx`) | 8.2 |
| 2026-08-05 | Expense form now DB-backed (catalog.ts removed) | 8.2 |
| 2026-08-05 | Brand logo from `docs/template/demo_files/logo.png` used sitewide + favicon (`src/app/icon.png`, PWA icons) | 8.2 |
| 2026-08-06 | Landing truthfulness pass (hero, features, pricing, Teams, footer, onboarding, OG image) | 8.4 |
| 2026-08-06 | Recurring expenses (migration 015) + receipt uploads (migration 016) shipped; invite expiry 72h | 8.7 |
| 2026-08-07 | 10/10 quality pass: distributed rate limiting, budget enforcement, org_id fix, E2E feature spec stable (3× green), page transitions (#40) shipped | 8.8 |
