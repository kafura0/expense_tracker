---
stepsCompleted:
  - step-01-validate-prerequisites
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-expense-tracker-2026-08-03/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-expense-tracker-2026-08-03/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-expense-tracker-2026-08-03/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-expense-tracker-2026-08-03/EXPERIENCE.md
---

# expense tracker - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for expense tracker (Ledgerly Org Administration scope), decomposing the requirements from the PRD, UX Design contract, and Architecture spine into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR-1: Switch active org via server-validated action — `switchOrg` server action validates `org_members` membership and sets the httpOnly cookie; page reloads on success.
- FR-2: Resolve active org with first-membership fallback — absent/invalid cookie resolves to earliest-`created_at` membership via `ensureActiveOrg` server action writing the cookie; no-membership resolves to null (RLS returns no rows).
- FR-3: Clear active org on logout — `logout` deletes the `ledgerly_active_org` cookie.
- FR-4: Show org switcher on every org surface — sidebar switcher visible on all protected org pages when >1 membership; hidden at ≤1; never rendered for `super_admin`.
- FR-5: Assign org_admin role — `org_members.role` accepts `super_admin | org_admin | member`; Org Admin promotes/demotes members subject to FR-6; data-write permissions stay uniform.
- FR-6: Preserve last Org Admin — system refuses to demote or remove the last remaining Org Admin.
- FR-7: View roster — Org Admin views name, email (service-role lookup), role, membership since, status; non-admins do not see the surface.
- FR-8: Remove a member — revokes membership (delete `org_members` row), blocks org data access; data stays in org; middleware no-access redirect for members with no remaining membership; audit-logged.
- FR-9: Re-role a member — promote `member`→`org_admin` and demote `org_admin`→`member`, subject to FR-6; audit-logged with actor id.
- FR-10: Member status visibility — roster reflects `profiles.is_suspended` with a status badge; suspension is platform-only in v1.
- FR-11: Send invite (org admin only) — create pending Invite with unique ≥32-byte token, 7-day expiry; duplicate-pending rejected; member role cannot create.
- FR-12: Email the join link — transactional provider (Resend) with dev logged no-op; one email per create/resend; link `/invite?token=<token>`.
- FR-13: Accept invite — binds token to JWT email (case-insensitive), inserts membership, migrates `org_id IS NULL` rows, marks `accepted`, sets active-org cookie; runs against corrected `accept_invite` RPC (FR-30); succeeds exactly once.
- FR-14: Solo-data migration is explicit — join confirmation states "your existing expenses will move into this organization"; solo visibility ends after acceptance.
- FR-15: Revoke & resend invites — revoke sets `revoked`; resend resets expiry +7 days and re-emails; member role can do neither.
- FR-16: Expired invites — expired tokens read as `expired`, cannot be accepted; "link expired — ask for a new invite" state.
- FR-17: Edit org profile — Org Admin edits organization name/slug; slug validated for uniqueness and format.
- FR-18: Set org-wide defaults — base currency (supported list) + VAT (0-100); members without a personal override inherit; VAT applies to NEW entries only (no retro-rewrite).
- FR-19: Personal overrides are per-field — currency or VAT override independently.
- FR-20: Org settings access control — only Org Admins mutate org-wide settings; members read them.
- FR-21: Review request queue — Platform Admin sees all `client_requests` newest-first with status filter; non-super-admins denied.
- FR-22: Approve with plan assignment — approval creates user (if new), org, membership, active subscription, marks request approved; optional "assign as Org Admin" (first-admin bootstrap, FR-34); supersedes `approve_client_request` RPC.
- FR-23: Reject a request — records reviewer + timestamp; no user/org created; re-approval impossible; re-submission after rejection creates a new pending row.
- FR-24: View plans — Platform Admin sees all Plans with price + member/expense limits.
- FR-25: Edit plan pricing — update monthly/yearly price in cents; negative/non-numeric rejected; audit-logged.
- FR-26: Per-org subscription view — Clients shows each org's plan + status; Platform Admin can change an org's plan (new action); audit-logged.
- FR-27: Record sensitive actions — audit entry for membership add/remove, role change, org settings change, invite send/revoke/accept, org status change, plan change, request review; insert-only via FR-33 path.
- FR-28: Browse & filter audit log — Platform Admin filters by actor, action type, org, date range; newest-first; paginated.
- FR-29: Org-admin visibility (scoped) — Org Admin reads only own-org audit rows; plain members cannot read; Platform Admin sees all orgs.
- FR-30: Correct `accept_invite` — migration 013 fixes the `UPDATE` targeting the nonexistent `expense_settings` to `settings`; membership insert, row migration, status flip commit atomically.
- FR-31: Close roster & invite RLS escalation — replace `FOR ALL USING (can_write_in_org())` policies on `org_members`/`invites` with `can_admin_org()`-gated policies + `super_admin` carve-out; no self-insert to `super_admin`.
- FR-32: `can_admin_org` boundary and `/admin` guard — SECURITY DEFINER helper true for `org_admin` + `super_admin` memberships of active org; does NOT grant `/admin`; `super_admin` rows out of org-admin scope.
- FR-33: Audit write authorization and tamper evidence — single SECURITY DEFINER logging RPC; client/anon inserts revoked; UPDATE/DELETE revoked; org-member SELECT narrowed to `can_admin_org`; exactly one audit implementation.
- FR-34: Approval creates users + first-admin bootstrap and backfill — approval creates user (service-role), org, membership, active subscription; approver checkbox sets `org_admin` else `member`; migration 013 backfills earliest-`created_at` member to `org_admin` for existing orgs.

### Non-Functional Requirements

- NFR-1: Auditability — every mutation FR covered by FR-27; audit writes go through the authorized write path (FR-33) within the mutation's server action.
- NFR-2: Security — all admin/server mutations validate `auth.getUser()`, verify membership + role server-side, never trust client-supplied org ids; active org is a single httpOnly cookie, deleted on logout.
- NFR-3: Performance — roster and audit queries paginated; audit log browse under 500ms p95 at 10k+ rows (index on `(user_id, action, org_id, created_at)`).
- NFR-4: Accessibility — Members/Invite/Admin surfaces meet the existing WCAG bar: keyboard navigable, visible focus rings, Radix dialogs/menus, real `<table>` markup, `aria-describedby` error association, WCAG AA contrast.
- NFR-5: Observability — every outbound invite email logged with send id + status for delivery diagnosis.
- NFR-6: RLS is the authoritative data boundary; app-level checks are defense-in-depth only.
- NFR-7: Server actions are the only path to mutate org membership, roles, settings, plans, and audit rows.

### Additional Requirements (from Architecture)

- AR-1: Server actions are the only mutation boundary; repositories (`entities/*/repository.ts`) and `shared/lib` are read-only builders and may write only when invoked from inside a server action (AD-1).
- AR-2: RLS authoritative; new SECURITY DEFINER `can_admin_org(org_id)` helper; `org_admin` is a plain `org_members.role` value, no separate table (AD-2, AD-4).
- AR-3: Active-org tenancy = single httpOnly cookie `ledgerly_active_org`, written only by server code; switching triggers full-page reload; `ensureActiveOrg` (read surface `getActiveOrgIdAction`) repins earliest-`created_at` membership on absent/invalid/stale cookie; logout clears the cookie before `signOut` (AD-3, FR-1/2/3).
- AR-4: Migration 013 authored under `supabase/migrations/` and applied via the Management API (prefer `database/migrations` endpoint, fall back to `database/query`); never `db push` (AD-2 convention).
- AR-5: Single audit logging RPC (SECURITY DEFINER, insert-only, re-derives actor server-side); service-role key revoked from `audit_logs`; canonical migration-002 schema shape; pinned action vocabulary; all existing write sites migrated (AD-6).
- AR-6: Join/approval sequence is `createUser (GoTrue, outside DB txn) → DB commit → email after both succeed`; `accept_invite` settings write uses `ON CONFLICT (user_id, org_id) DO UPDATE` per-field merge (AD-5).
- AR-7: Mailer module (`shared/lib/mailer`) behind transactional provider (Resend); `DEV_EMAIL_*` logged no-op; send-id logged and correlated to request/invite rows (AD-7).
- AR-8: Org-wide defaults on `organizations.default_currency` / `default_vat_rate` columns; single effective-value resolver precedence: org default → personal override → per-entry value (AD-8).
- AR-9: Member emails resolved only via service-role `auth.admin.listUsers` matching; no `profiles.email` column; no direct SQL against `auth.users` (AD-9).
- AR-10: `/admin` guard requires `role = 'super_admin'` only; org_admin cannot reach `/admin`; `/no-access` reserved for users with no membership; members with other memberships return to `/dashboard` for repin (AD-4).
- AR-11: Pinned stack — Next.js 16.2.10 (Turbopack), React 19.2.4, TypeScript ^5, Tailwind v4, @supabase/ssr ^0.6.1 + supabase-js ^2.49.1, zod ^3.24.1, react-hook-form, TanStack Query ^5.64.1, Radix primitives, cva, date-fns, recharts ^2.15.0, lucide-react, Vitest ^4.1.10, ESLint 9; Resend SDK new in scope (AD-11 stack).
- AR-12: UI must reuse the existing token + component system; no new hex colors; deprecated Material tokens forbidden (DESIGN.md).

### UX Design Requirements

- UX-DR1: Roster table (Member / Email / Role chip / Member since / Status / row menu) with mobile card-list fallback per the Admin Users pattern; `super_admin` rows render no row menu.
- UX-DR2: Invite pending list with email, status badge, expiry, inline Revoke/Resend outline buttons; duplicate-pending inline error; expired invites show warning badge.
- UX-DR3: Requests queue (card-per-request) with Approve Dialog (plan `Select` + "Assign as Org Admin" checkbox) and Reject inline confirm; Requests tab badge decrements after decision.
- UX-DR4: Plans editor table with numeric cents price inputs and per-row Save; per-org subscription plan `Select` in the Clients tab accordion.
- UX-DR5: Audit log filter bar (actor, action, org, date range) above a newest-first table with pagination; monospace timestamps; org-admin reads scoped to own org.
- UX-DR6: Org settings form (name/slug + currency `Select` with "members default" helper + VAT input); per-field "use org default" affordance on personal Currency/VAT cards.
- UX-DR7: No-access state route (`/no-access`) — EmptyState-style block with "You don't have access to this workspace" + "Back to login".
- UX-DR8: Role/status badge semantics reusing the existing Badge vocabulary — Org Admin emerald chip, Super Admin purple chip, active/suspended/pending/approved/rejected/expired badges; no new tokens.
- UX-DR9: OrgSwitcher behavioral contract — never for `super_admin`, hidden at ≤1 membership, panel opens upward, switch = full reload (no optimistic UI).
- UX-DR10: Accessibility floor — keyboard-reachable controls, visible focus ring, Radix-managed focus trap/Esc, badges never the sole status indicator, real table semantics, `aria-describedby` error association, WCAG AA contrast.
- UX-DR11: State patterns — PageLoader for page fetches, Skeleton rows for tables, EmptyState for empty surfaces, ErrorState with retry, inline field errors, permission-denied = controls hidden (never disabled-only).
- UX-DR12: Interaction primitives — destructive actions behind confirm dialogs stating "This action cannot be undone"; DropdownMenu for dense rows; controlled forms calling server actions with toast + revalidate.
- UX-DR13: Responsive/mobile — tables collapse to card lists, forms stack full-width, dialogs `max-h-[90vh] overflow-y-auto`, PWA safe-area handling, toast offset `bottom-20 md:bottom-4`.

### FR Coverage Map

(To be completed after epic design)

## Epic List

(To be completed)

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic {{N}}: {{epic_title_N}}

{{epic_goal_N}}

<!-- Repeat for each story (M = 1, 2, 3...) within epic N -->

### Story {{N}}.{{M}}: {{story_title_N_M}}

As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**

<!-- for each AC on this story -->

**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}

<!-- End story repeat -->
