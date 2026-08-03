# Web-Research / Reality-Check Review — ARCHITECTURE-SPINE.md

- **Reviewer role:** Web-research / reality-check
- **Reviewed:** `ARCHITECTURE-SPINE.md` (Ledgerly Org Administration, 2026-08-03)
- **Date:** 2026-08-03
- **Ground truth used:** `package.json`, `AGENTS.md`, live repo (migrations 001–012, `src/`), plus live web checks of Next.js, Resend, Supabase Management API, Vercel Git behavior.

## Verdict

**PASS with 5 findings (1 HIGH, 1 MEDIUM, 3 LOW).** This is a brownfield ratification and the spine's Stack table matches `package.json` 1:1; every migration line-reference it leans on (`010:12`, `012:120-124`, `012:256`, migration-002 audit shape) verifies exactly against the repo, and every outside-world assertion (Next.js 16 line, Resend, Supabase Management API, Vercel auto-deploy) was confirmed live. The only substantive inaccuracy is AD-3 naming a non-existent API route as an existing read surface.

---

## 1. Stack table vs `package.json` / `AGENTS.md` — audited row by row

| Spine Stack row | package.json | AGENTS.md | Verdict |
| --- | --- | --- | --- |
| Next.js (Turbopack) 16.2.10 | `next: 16.2.10` | 16.2.10 (Turbopack) | ✅ exact |
| React / React DOM 19.2.4 | `react/react-dom: 19.2.4` | — | ✅ exact |
| TypeScript ^5 | `typescript: ^5` | — | ✅ exact |
| Tailwind CSS v4 (`@tailwindcss/postcss`) | `tailwindcss: ^4`, `@tailwindcss/postcss: ^4` | Tailwind CSS v4 | ✅ exact |
| @supabase/supabase-js ^2.49.1 | `^2.49.1` | — | ✅ exact |
| @supabase/ssr ^0.6.1 | `^0.6.1` | — | ✅ exact |
| zod ^3.24.1 | `^3.24.1` | — | ✅ exact |
| react-hook-form ^7.54.2 / @hookform/resolvers ^3.9.1 | `^7.54.2` / `^3.9.1` | — | ✅ exact |
| @tanstack/react-query ^5.64.1 | `^5.64.1` | — | ✅ exact |
| recharts ^2.15.0 | `^2.15.0` | Recharts | ✅ exact |
| lucide-react ^0.469.0 | `^0.469.0` | Lucide | ✅ exact |
| Radix avatar/dialog/dropdown-menu/slot 1.2.2/1.1.19/2.1.20/1.3.0 | `^1.2.2`/`^1.1.19`/`^2.1.20`/`^1.3.0` | Slot 1.3.0 noted | ✅ exact |
| class-variance-authority ^0.7.1 | `^0.7.1` | — | ✅ exact |
| date-fns ^4.1.0 | `^4.1.0` | — | ✅ exact |
| jspdf ^2.5.2 / jspdf-autotable ^3.8.4 | `^2.5.2` / `^3.8.4` | — | ✅ exact |
| sonner ^2.0.0 (present; unused — custom toast) | `^2.0.0` | custom toast noted | ✅ exact; **verified unused**: zero `sonner` imports in `src/` |
| Vitest ^4.1.10 | `^4.1.10` | Vitest (68 tests) | ✅ exact |
| ESLint ^9 / eslint-config-next 16.2.10 | `^9` / `16.2.10` | ESLint zero errors | ✅ exact |
| Platform: Vercel (auto-deploy on push to main) | — | confirmed | ✅ **web-verified** below |
| Platform: Supabase (ref `weitlewvoufvgfpkryvg`) | — | confirmed | ✅ exact |

**Result:** no Stack row contradicts `package.json`/`AGENTS.md`. See Findings F-2 for omissions (installed deps missing, planned `resend` dep unlisted).

---

## 2. Migration / repo claims — audited against live files

Every spine claim that cites repo reality was spot-checked and verified:

| Spine claim | Verified against | Result |
| --- | --- | --- |
| AD-4: uniform-write relaxation at `010:12` | `010_unify_org_member_write.sql:12` = `CREATE OR REPLACE FUNCTION public.can_write_in_org(...)` | ✅ exact line |
| AD-5: `approve_client_request` returns NULL for new users at `012:120-124` | `012_security_hardening.sql:119-124` — "User doesn't exist yet… RETURN NULL" | ✅ exact range |
| AD-5: `accept_invite` writes to nonexistent `expense_settings` at `012:256` | `012:256` `UPDATE public.expense_settings …`; `expense_settings` is never `CREATE TABLE`d in any migration (only reference is 012:256); the correct table used elsewhere is `settings` (`012:81`) | ✅ claim supported — the table genuinely doesn't exist |
| AD-6: migration-002 canonical audit shape `org_id, user_id, action, entity_type, entity_id, old_value, new_value` | `002_tenancy_and_security.sql:84-96` `CREATE TABLE audit_logs` has exactly that shape (+ `ip_address, user_agent, created_at`) | ✅ exact |
| AD-6: `shared/lib/audit-logger.ts` is dead/divergent | File uses `resource_type/resource_id/metadata` schema (divergent); its exports are never imported anywhere in `src/` (dead) | ✅ supported (see F-5 nuance) |
| AD-9: existing service-role `auth.admin.listUsers` matching pattern | `src/features/admin/actions.ts:40-56` (paged `emailLookup`), `src/features/auth/actions.ts:196` | ✅ exists |
| AD-3: `ledgerly_active_org` httpOnly cookie, server-only writes, client-shadow risk | `src/shared/lib/org-context.ts`, `supabase/middleware.ts:52`; shadow-cookie drift documented in `docs/code-review.md:45-57` and `docs/deferred-work.md` D-02 | ✅ grounded in repo + docs |
| Structural seed: `012_security_hardening.sql` "existing" | File exists in `supabase/migrations/` | ✅ (see F-4 re: AGENTS.md being stale, and the two `002_*` files) |

---

## 3. Outside-world assertions — web-verified (2026-08-03)

### 3.1 Next.js 16.2.10 is a real, current release line — ✅
Next.js 16 (released 22 Oct 2025) is the current **LTS** line per endoflife.date. Latest patch is **16.2.12** (25 Jul 2026); 16.3 in canary/preview. The pinned 16.2.10 is real and supported, but is **two patches behind** — 16.2.11 (21 Jul 2026) and 16.2.12 (25 Jul 2026) backport bug fixes incl. a TypeScript 7 support fix. Not a spine error (it mirrors `package.json`), but worth a bump before build since 16.2.12 is a pure backport/security-of-maintenance release.

### 3.2 Resend — exists, current, fits — ✅
Resend is alive and actively maintained as of mid-2026 (verified against resend.com, resend-node repo, third-party reviews dated Apr–Jul 2026). Free tier: **3,000 emails/mo + 100/day cap** — matches the in-repo `docs/technical-research.md` ("3,000/month forever"), so AD-7's provider choice is both web-current and already researched in the project. The `resend` npm SDK is the current official Node path. **Caveat:** `resend` is NOT yet in `package.json` (no mailer module exists); AD-7 introduces it — see F-2.

### 3.3 Supabase Management API migration path — ✅ with a live-defaults nuance
`POST /v1/projects/{ref}/database/query` is current and documented (still Beta) — AGENTS.md's stated convention works. However, Supabase now also documents **`POST /v1/projects/{ref}/database/migrations`**, which applies SQL AND records it in the `supabase_migrations` history table with rollback — but is **gated to select customers** (partnership form). The spine/AGENTS.md convention of "author in `supabase/migrations/` then apply via `/database/query`" runs SQL **without recording migration history**, so versioned-history intent is lost unless the new endpoint is available. Recommend: try `/database/migrations` first; if denied, apply via `/database/query` and keep the authored file as the only version record. (See F-3.)

### 3.4 Vercel auto-deploy on push to main — ✅
Confirmed against Vercel docs (2026): Git-connected projects deploy every push; merges/pushes to the production branch (default `main`) produce production deployments; other branches get previews. Matches the Stack row and AGENTS.md.

---

## Findings

### F-1 — HIGH — AD-3 asserts an existing endpoint that does not exist
- **Location:** `ARCHITECTURE-SPINE.md` AD-3 Rule (line 79): "`GET /api/org-context` stays the read surface."
- **Reality:** The repo's only API route is `src/app/api/rates/route.ts` (glob of `src/app/api/**/*`). No `/api/org-context` route exists anywhere. The actual read surface for the active org is the server helper `src/shared/lib/org-context.ts` (`getActiveOrgId` / `validateOrgAccess`), consumed directly by server actions/repositories — not an HTTP endpoint.
- **Fix:** Reword AD-3 to "the active-org read surface stays `src/shared/lib/org-context.ts` (server-only helper)". If a real `GET /api/org-context` endpoint is genuinely intended for the new scope, mark it as a **new** route in the Structural Seed, not an existing one.

### F-2 — MEDIUM — Stack table omits installed deps and the new `resend` dependency is unlisted
- **Location:** Stack table (lines 127–150).
- **Reality (a) omissions:** `clsx ^2.1.1`, `tailwind-merge ^3.6.0`, and `framer-motion ^11.18.0` are production dependencies in `package.json` but absent from the Stack table (the `cn()` util in `shared/lib/utils.ts` depends on clsx+tailwind-merge, so the design-system convention relies on them). Dev deps `tsx` (the `seed` script runner), `dotenv`, `@testing-library/*`, `jsdom`, `@vitejs/plugin-react` are also unlisted.
- **Reality (b) unlisted addition:** AD-7 commits the mailer to Resend, but `resend` is not in `package.json` (no `shared/lib/mailer` exists). A ratification spine should pin the new dependency rather than leave it implied.
- **Fix:** Add the three missing production deps to the Stack table; add a row for `resend` (pin a current version) flagged as "new in this scope", and note `tsx`/test tooling under a dev-tooling row.

### F-3 — LOW — Management API migration convention loses versioned history; a better endpoint now exists
- **Location:** Consistency Conventions → Config & auth (line 124); Structural Seed.
- **Reality:** Web-verified that Supabase now offers `POST /v1/projects/{ref}/database/migrations` (records in `supabase_migrations`, rollback on failure) alongside `POST /v1/projects/{ref}/database/query` (Beta, no history). The endpoint choice matters because `/database/query` silently skips the migration-history bookkeeping the authored `supabase/migrations/` files imply.
- **Fix:** In the convention, state: apply via `/database/migrations` (records history); fall back to `/database/query` if the project lacks access, and treat the authored `.sql` file as the source of truth for versioning.

### F-4 — LOW — AGENTS.md migration inventory is stale (repo is ahead of it)
- **Location:** `AGENTS.md` line 28 says "11 files, 001-011"; repo actually has **13 files** including `012_security_hardening.sql` and **two `002_*` files** (`002_tenancy_and_security.sql`, `002_performance_optimization.sql`).
- **Impact:** The spine is *correct* here (it treats 012 as existing, and all its 012 line refs verify) — it is AGENTS.md that is stale. Worth fixing so future agents don't conclude migration 012 doesn't exist, and be aware the `002` filename collision affects ordering-by-name semantics.
- **Fix:** Update AGENTS.md's migration inventory and flag the duplicate `002` prefix.

### F-5 — LOW — AD-6 "two divergent audit schemas" overstates the divergence
- **Location:** AD-6 (line 97).
- **Reality:** There is a second audit writer already in the codebase — `src/entities/org/repository.ts:148` `logAuditEvent` — and it writes the **correct** migration-002 canonical shape (`org_id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent`). Only `shared/lib/audit-logger.ts` is divergent (`resource_type/resource_id/metadata`) and it is genuinely dead (never imported). So it's "one dead/divergent module plus one already-canonical writer", not two divergent schemas.
- **Impact:** None on the chosen direction (rewriting both onto a single insert-only logging RPC is still the right call); purely a precision issue that the migration-013 backfill should reconcile both writers.
- **Fix:** Adjust AD-6 wording to acknowledge `entities/org/repository.ts` already writes the canonical shape and must be redirected to the logging RPC too.

---

## 4. Confirmed-correct (no action)

- Stack table rows 1:1 with `package.json` (see table in §1).
- `sonner` "present; unused" — verified (zero imports in `src/`).
- All migration line refs (`010:12`, `012:120-124`, `012:256`) verify exactly; `expense_settings` truly never created.
- AD-7 provider (Resend) web-current and pre-researched in `docs/technical-research.md`.
- AD-9 service-role `auth.admin.listUsers` pattern exists.
- AD-3's httpOnly cookie discipline is grounded in repo code + `docs/code-review.md`/`docs/deferred-work.md`; the `ensureActiveOrg` earliest-`created_at` fallback is correctly framed as new behavior for this scope, not existing.
- Vercel auto-deploy and Supabase project ref match AGENTS.md and current vendor docs.
