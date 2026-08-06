# Ledgerly — Deferred Work

**Source:** Adversarial code review of the deployed core (2026-08-02).
**Status:** All review findings closed as of the org-admin release (migration 013 + 014, proxy migration). D-08/D-09/D-10 (72h invite expiry, recurring expenses, receipt uploads) closed in the feature pass. Two notes remain open and are tracked at the bottom.

---

## Findings

### D-01 — Invite Email Delivery
**Severity:** High · **Resolved**

Invites now go through `src/shared/lib/mailer.ts` (Resend-backed when `RESEND_API_KEY` is set, dev-email-log fallback otherwise). `src/features/invites/actions.ts` calls `sendInviteEmail` on create and resend with the `/invite?token=...` accept link, and records `send_id` / `last_sent_at` on the invite row plus `invite.send` / `invite.resend` audit events.

### D-02 — Client-Side Org Cookie Shadowing
**Severity:** Medium · **Resolved**

The client-side `document.cookie` shadow of the active org was removed. `src/shared/lib/org-provider.tsx` now bootstraps everything from the `getAppContext` server action; the active-org cookie is written only by server code (see the comment in `src/shared/lib/org-actions.ts`). No `document.cookie` writes remain in client code.

### D-03 — Org Cookie Trust Rework
**Severity:** Medium · **Resolved**

The active org now has a single source of truth: a server-set, httpOnly cookie resolved by `getAppContext` / `ensureActiveOrg` (repinned server-side when stale). The client renders from the action return value only.

### D-04 — Category Deduplication
**Severity:** Medium · **Resolved**

A canonical `categories` table per org exists (system categories seeded on org creation, org-scoped RLS via `applyCategoryScope`). Expenses reference categories by id; the UI reads the catalog. See `src/shared/lib/category-icons.ts`, `src/features/dashboard/scope.ts`, and the seed (`scripts/seed-test-users.mjs`).

### D-05 — Middleware Fail-Open
**Severity:** Medium · **Resolved**

The middleware entry point was replaced by `src/proxy.ts` (Next.js 16 Proxy). Session/auth logic lives in `src/shared/lib/supabase/middleware.ts` (`updateSession`). Fail-open is now **configurable**: setting `MIDDLEWARE_FAIL_CLOSED=1` makes authorization-critical lookups deny instead of downgrade — an unverifiable `org_members` lookup on `/admin` redirects to home, and an unverifiable suspension check confines to `/suspended`. Every fail-open downgrade is observable: a `[middleware:fail-open] <context>` console tag plus an `x-middleware-mode: fail-open` response header.

### D-06 — Admin Invites Lack Org Context
**Severity:** Medium · **Resolved**

Invites carry an `expires_at` (single-use token) and full org context. `accept_invite` (migration 014) now persists the `expired` status flip instead of raising, which previously rolled the UPDATE back and left stale `pending` rows. The members UI surfaces expired invites ("Expired — ask to resend") with a resend path.

### D-07 — Mixed-Currency Totals & Date-Boundary Labels
**Severity:** Medium · **Resolved**

Totals are currency-aware: every aggregate selects `currency` and converts through `sumInBaseCurrency` / `fetchBaseRates` (cached `exchange_rates`, only when a rate exists) — see `src/entities/expense/totals.ts` and `src/entities/exchange-rate/base-rates.ts`. The expense list no longer groups by `toISOString()` local-midnight boundaries (date-fns `format` is used in `src/features/expenses/expense-table.tsx`).

---

## Tracking

- [x] D-01 invite email delivery (Resend mailer + audit)
- [x] D-02 client org cookie removal
- [x] D-03 org cookie trust rework (single httpOnly server cookie)
- [x] D-04 category catalog per org
- [x] D-05 proxy migration + configurable fail-closed enforcement
- [x] D-06 invite token expiry + org context + expired persistence
- [x] D-07 currency-aware totals + date-boundary cleanup
- [x] D-08 invite expiry window hardened to 72h (`src/entities/invite/repository.ts`)
- [x] D-09 recurring expenses (migration 015 + `src/features/recurring/`)
- [x] D-10 expense attachments / receipt upload (migration 016 + `receipts` bucket + `src/features/attachments/`)

## Open Items

- **Demo GIF size:** `public/demo/dashboard-demo.gif` is ~8.8MB. Local GIF re-encode is currently infeasible (no gifsicle/ffmpeg GIF build available on this machine); re-generate from a source video or replace with a lighter format (WebM/APNG) when tooling is available.
- **Landing URL canonicalization:** `NEXT_PUBLIC_SITE_URL` in `.env.local`, the `SITE_URL` fallback in `src/shared/lib/seo.ts`, and the Vercel alias in `AGENTS.md` list different URLs; pin a single canonical production URL.
