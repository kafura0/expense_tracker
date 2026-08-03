# Rubric-Walker Review — ARCHITECTURE-SPINE.md

**Reviewer:** rubric-walker (architecture spine validation gate)
**Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-expense-tracker-2026-08-03/ARCHITECTURE-SPINE.md`
**Cross-checked against:** PRD `prd-expense-tracker-2026-08-03/prd.md`, UX `DESIGN.md` / `EXPERIENCE.md`, and the live brownfield codebase (migrations 001–012, `src/shared/lib/*`, `src/middleware.ts`, `src/features/admin/actions.ts`, `src/features/auth/actions.ts`, `docs/code-review.md`).

## Verdict

**CONDITIONAL** — the spine is directionally correct, accurately ratifies the brownfield codebase, and binds every required FR, but AD-4's Rule as written does not actually prevent the self-escalation it names (an `org_admin` can still INSERT a `role = 'super_admin'` row under a naive `can_admin_org(org_id)` policy), and AD-3 leaves three real tenancy divergence points unruled. Tighten AD-3/AD-4 (fixes below) before epics are cut.

---

## 1. Checklist evaluation

### 1.1 Fixes the real divergence points for the level below (epics) and misses none

| Divergence point (source) | Addressed by | Status |
|---|---|---|
| Dual-cookie org shadowing, root cause of `/expenses` "no active org" (code-review) | AD-3 | Covered (see §1.2 finding H-3) |
| Stale/invalid cookie with no server-side fallback (PRD FR-2; `org-context.ts` falls through) | AD-3 / `ensureActiveOrg` | Partially — trigger scope narrower than FR-2 (finding M-2) |
| Org cookie not cleared on logout (`signOut()` never calls `clearActiveOrgId()`, code-review:517) | **none** | **MISSED** (finding M-1) |
| `org_members`/`invites` uniform-write escalation — any member can mutate roster/invite rows, incl. self-inserting `super_admin` (`002:281-282`, `005:43-44`) | AD-4 / FR-31 | Partially — INSERT-of-`super_admin` gap (finding H-1) |
| `approve_client_request` returns NULL for new users (`012:120-124`) | AD-5 | Covered |
| `accept_invite` writes to nonexistent `expense_settings` (`012:256`) | AD-5 | Covered |
| Audit divergence: `audit-logger.ts` writes `resource_type/resource_id/metadata`, schema is `entity_type/entity_id/old_value/new_value` + no `org_id` | AD-6 | Covered |
| No email delivery mechanism for invites | AD-7 | Covered |
| No org-wide defaults storage (only per-(user,org) `settings`) | AD-8 | Covered |
| Roster emails have no RLS-reachable source (`profiles` has no email column) | AD-9 | Covered |
| Multi-org `profiles.org_id` single-reference tension (PRD OQ-2) | Deferred | Covered (explicit) |
| Migration 013 never applied via `db push` | Consistency Conventions | Covered (matches AGENTS.md) |

Line references verified in the live repo: `002_tenancy_and_security.sql:281-282` ("Managers can manage members in their org … `can_write_in_org(org_id)`"), `005_invites_and_solo_support.sql:43-44` (same for invites), `012_security_hardening.sql:120-124` (NULL return), `012_security_hardening.sql:256` (`expense_settings`), `002_tenancy_and_security.sql:84-96` (canonical audit schema), `audit-logger.ts:46-55` (divergent write). All migration line claims in the spine are accurate.

The one genuine miss is the **logout cookie** — AD-3 lists "stale per-org caches, cross-tab org leakage" as prevented divergences but no rule binds FR-3 or orders `clearActiveOrgId()` on sign-out. This is a documented bug in the codebase the spine's own scope (org tenancy) owns.

### 1.2 Every AD's Rule is enforceable and actually prevents its stated divergence

- **AD-1** — enforceable (structure rule; greppable "no supabase write outside `features/*/actions.ts`"). ✓
- **AD-2** — enforceable; RLS-authoritative + defense-in-depth is a clear bar. ✓
- **AD-3** — see findings H-3 (no explicit remediation of the existing client cookie writer in `org-provider.tsx:186`), M-1 (logout), M-2 (absent-cookie fallback), M-3 (`/api/org-context` does not exist). The *idea* is right; the Rule is not yet complete/enforceable against the actual divergence.
- **AD-4** — **HIGH:** the Rule does not prevent an `org_admin` inserting a `role='super_admin'` `org_members` row. A policy `FOR ALL USING (can_admin_org(org_id) OR is_super_admin())` passes INSERT of any row (USING doubles as WITH CHECK when none is given), so the exact escalation FR-31 names stays open. The Rule also governs *invites* with no role column (dropped in 011), so the escalation surface is purely `org_members`.
- **AD-5** — enforceable; single-transaction RPC + service-role approval path, deterministic first-admin. ✓
- **AD-6** — enforceable; one logging RPC, insert-only, `can_admin_org`/`is_super_admin` SELECT. Schema claim verified accurate. ✓
- **AD-7** — enforceable; mailer module, server env only, dev no-op. ✓
- **AD-8** — enforceable; `organizations` columns + "new entries only" rule. ✓
- **AD-9** — enforceable; service-role `auth.admin.listUsers` pattern (verified existing in `admin/actions.ts:40-56`), no new column. ✓

### 1.3 Nothing under Deferred could let two units diverge

- **Multi-org profile reference:** "second-org members **may** show fallback identity" is a permissive phrase; two units could pick different fallbacks. Single implementer in practice (`features/admin` roster), so risk is low — recommend pinning "no email shown; display name + role only" to close it.
- **Member suspension scope:** negative rule ("must not be half-implemented") — safe.
- **Ownership transfer:** pinned interim (earliest-`created_at` backfill). Safe.
- **Audit retention:** write path fixed by AD-6; archival deferred. Two units cannot diverge on the write path. Safe.
- **Per-epic mechanics:** defers "exact DDL, **expense/permission tuning**, helper bodies" to story work. The permission boundary is adequately pinned by AD-2/AD-4's surface list, so epics cannot diverge materially; story-level detail is the correct owner. Acceptable.

Net: no divergence risk under Deferred that is not either pinned or single-implementer. One low-severity recommendation on the multi-org fallback.

### 1.4 Named tech is verified-current

Every version in the Stack table was checked against `package.json` and matches exactly: Next.js 16.2.10, React/React-DOM 19.2.4, TypeScript ^5, Tailwind v4 (`@tailwindcss/postcss` ^4), `@supabase/supabase-js` ^2.49.1, `@supabase/ssr` ^0.6.1, zod ^3.24.1, RHF ^7.54.2 / resolvers ^3.9.1, `@tanstack/react-query` ^5.64.1, recharts ^2.15.0, lucide-react ^0.469.0, Radix avatar/dialog/dropdown-menu/slot 1.2.2/1.1.19/2.1.20/1.3.0, CVA ^0.7.1, date-fns ^4.1.0, jspdf ^2.5.2 / jspdf-autotable ^3.8.4, sonner ^2.0.0 (correctly noted "present; unused"), Vitest ^4.1.10, ESLint ^9 / eslint-config-next 16.2.10, Vercel + Supabase platform. No stale or invented versions. ✓

### 1.5 Ratifies rather than contradicts the brownfield codebase

- FSD under `src/` with `app/ features/ entities/ shared/` — ratified, matches repo. ✓
- Cookie-based tenancy (`ACTIVE_ORG_COOKIE`, httpOnly, server-written, `switchOrg` full-reload contract) — ratified by AD-3; `switchOrg` exists (`org-actions.ts:66`). ✓
- RLS helper family (`is_super_admin`, `is_org_member`, `can_write_in_org`, `is_solo_user`, `is_row_owner`) — ratified by AD-2/AD-4. ✓
- Migration 012/010 line references — verified accurate (see §1.1). ✓
- `audit-logger.ts` "dead/divergent" — verified: it writes `resource_type/resource_id/metadata` and never `org_id`; the table is `entity_type/entity_id/old_value/new_value/org_id`. ✓
- **One contradiction:** AD-3 names `GET /api/org-context` as the read surface — no such route exists (only `/api/rates`). The real read surface is the `getActiveOrgIdAction()` server action (`org-actions.ts:47-49`) and `getUserOrgContext()`. (Finding M-3.)

### 1.6 Feature altitude owns every dimension

- **Functional capabilities:** decided via AD-1..AD-9 + Capability→Architecture map. All 19 required FRs (FR-2, FR-4, FR-5, FR-7, FR-8, FR-12, FR-13, FR-18, FR-22, FR-23, FR-25, FR-26, FR-27, FR-29, FR-30..FR-34) are bound to ≥1 AD and appear in the map. ✓ (Note: FR-12 is bound by AD-7 but has no dedicated capability-map row — cosmetic.)
- **Deployment & environments:** covered (Structural Seed mermaid: Vercel Edge + Runtime, Supabase cloud, Resend, `DEV_EMAIL_*` dev no-op; Migration-application-via-Management-API convention). ✓
- **Infra/provider strategy:** Vercel + Supabase + Resend pinned. ✓
- **Operations:** **largely silent** — no rule for the PRD's Observability NFR ("every outbound invite email is logged with send id/status"), no monitoring/error-reporting stance for the new service-role approval path or mailer, no rate-limiting note for new admin surfaces. This is the operational-dimension gap the rubric flags. (Finding M-4.)

### 1.7 Frontmatter consistency & mermaid validity

- **Frontmatter:** `type: architecture-spine`, `purpose: build-substrate`, `altitude: feature`, `paradigm`, `scope` all coherent with the PRD and the feature altitude. `binds` list equals the required FR set exactly. `sources` → PRD; `companions` → both UX spines. ✓
- **Mermaid:** all three blocks (invariants flowchart, deployment flowchart, ER diagram) are syntactically well-formed — valid node/edge/subelement syntax, subgraph labels bracketed correctly, cylinder/entity shapes used properly. No obvious parse errors. ✓

---

## 2. Findings (by severity)

### H-1 — AD-4 Rule does not prevent `super_admin` self-escalation via INSERT
- **Severity:** High
- **Location:** ARCHITECTURE-SPINE.md:85 (AD-4 Rule)
- **Finding:** The Rule pins "roster mutations require `can_admin_org(org_id)` or `is_super_admin()`" but does not constrain the *written* role value. A `FOR ALL USING (can_admin_org(org_id) OR is_super_admin())` policy passes an INSERT of a `role = 'super_admin'` membership (USING doubles as WITH CHECK), so a promoted `org_admin` re-opens the exact FR-31 escalation the AD claims to close. "Super_admin rows are out of org-admin scope" only addresses UPDATE/DELETE of existing rows.
- **Fix:** State the guard explicitly in AD-4 (e.g., "only `is_super_admin()` actors may write `role = 'super_admin'`; the policy WITH CHECK is `can_admin_org(org_id) AND role IN ('member','org_admin')` unless the actor is `is_super_admin()`").

### M-1 — Logout cookie clearing is unruled (divergence point missed)
- **Severity:** Medium
- **Location:** AD-3 binds (line 77) and Rule (line 79)
- **Finding:** AD-3 claims to prevent "stale per-org caches, cross-tab org leakage" but binds FR-2/FR-4/FR-8 only. FR-3 (clear cookie on logout) is unbound and `signOut()` never calling `clearActiveOrgId()` is a documented bug (code-review.md:517). A stale cookie persists across users/sessions.
- **Fix:** Add FR-3 to AD-3 binds and add "logout calls `clearActiveOrgId()`" to the Rule.

### M-2 — `ensureActiveOrg` trigger scope is narrower than FR-2
- **Severity:** Medium
- **Location:** AD-3 Rule (line 79)
- **Finding:** The Rule only fires "when the cookie names an org the user left." FR-2's fallback also covers an *absent or invalid* cookie (the more common failure per prior review; middleware currently falls through, leaving members cookieless server-side). Under the Rule as written, the absent-cookie path is unowned.
- **Fix:** Widen to "when the cookie is absent, invalid, or names an org the user no longer belongs to, `ensureActiveOrg` resolves to the earliest-`created_at` membership and writes the cookie server-side."

### M-3 — `GET /api/org-context` does not exist; read surface named wrongly
- **Severity:** Medium
- **Location:** AD-3 Rule (line 79); consistency convention "State & cross-cutting"
- **Finding:** No `/api/org-context` route exists in the repo (only `/api/rates`). The actual read surface is the `getActiveOrgIdAction()` server action (`org-actions.ts:47-49`). As written, an epic would be told to keep alive an endpoint that never shipped.
- **Fix:** Replace "`GET /api/org-context` stays the read surface" with "server-action read surface (`getActiveOrgIdAction`) stays the read surface."

### M-4 — Operational envelope largely silent
- **Severity:** Medium
- **Location:** Whole spine (Structural Seed + Consistency Conventions + AD-7)
- **Finding:** Deployment, environments, and infra are covered, but operations are not: the PRD's Observability NFR (every outbound invite email logged with send id/status) is not ratified anywhere; no stance on monitoring/error reporting for the new service-role approval path or mailer; no rate-limiting note for new admin surfaces (existing middleware rate-limits).
- **Fix:** Add one Consistency Convention row or extend AD-7 with the send-id logging NFR, and add an operations line (monitoring of mailer/approval failures).

### L-1 — AD-3 Rule has no explicit remediation of the existing client cookie writer
- **Severity:** Low
- **Location:** AD-3 Rule (line 79)
- **Finding:** AD-3's stated root cause is "client cookie shadowing," and `org-provider.tsx:186` still sets a readable cookie with the same name. The Rule is forward-only ("set/read via `cookies()` only"); it never orders removal of the violating writer, so enforcement (grep for `ACTIVE_ORG_COOKIE` in client code) is implied but not stated.
- **Fix:** Add "remove the client-side writer in `org-provider.tsx`; the cookie is never touched by client JS" to the Rule.

### L-2 — AD-7 binds FR-7 (roster view), which is not an outbound-mail FR
- **Severity:** Low
- **Location:** AD-7 binds (line 101)
- **Finding:** FR-7 belongs to AD-9 (email resolution). Binding it to AD-7 implies the roster view depends on the mailer, which would confuse epic breakdown.
- **Fix:** Drop FR-7 from AD-7 binds; keep it on AD-9.

### L-3 — Deferred multi-org fallback phrase is permissive
- **Severity:** Low
- **Location:** Deferred, first bullet (line 233)
- **Finding:** "may show fallback identity" leaves two units free to pick different fallback behavior.
- **Fix:** Pin it ("no email column; fallback shows display name + role only").

---

## 3. Recommended pass criteria for re-validation

1. AD-4 Rule states the role-column guard so a non-super-admin cannot write `role = 'super_admin'` (H-1).
2. AD-3 Rule covers absent/invalid/stale cookies, orders `clearActiveOrgId()` on logout (FR-3), and names the real read surface (M-1, M-2, M-3).
3. An operations/observability convention is added (M-4).
4. Optional low-severity cleanups (L-1..L-3).

Once H-1 and M-1..M-4 are reflected in AD-3/AD-4 (and one operations convention), the spine should pass cleanly for epic generation.
