---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
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

FR-1: Epic 2 — Switch active org via server-validated action
FR-2: Epic 2 — Resolve active org with first-membership fallback
FR-3: Epic 2 — Clear active org on logout
FR-4: Epic 2 — Show org switcher on every org surface
FR-5: Epic 3 — Assign org_admin role
FR-6: Epic 3 — Preserve last Org Admin
FR-7: Epic 3 — View roster
FR-8: Epic 3 — Remove a member
FR-9: Epic 3 — Re-role a member
FR-10: Epic 3 — Member status visibility
FR-11: Epic 4 — Send invite (org admin only)
FR-12: Epic 4 — Email the join link
FR-13: Epic 4 — Accept invite
FR-14: Epic 4 — Solo-data migration is explicit
FR-15: Epic 4 — Revoke & resend invites
FR-16: Epic 4 — Expired invites
FR-17: Epic 5 — Edit org profile
FR-18: Epic 5 — Set org-wide defaults
FR-19: Epic 5 — Personal overrides are per-field
FR-20: Epic 5 — Org settings access control
FR-21: Epic 6 — Review request queue
FR-22: Epic 6 — Approve with plan assignment
FR-23: Epic 6 — Reject a request
FR-24: Epic 6 — View plans
FR-25: Epic 6 — Edit plan pricing
FR-26: Epic 6 — Per-org subscription view
FR-27: Epic 6 — Record sensitive actions
FR-28: Epic 6 — Browse & filter audit log
FR-29: Epic 6 — Org-admin visibility (scoped)
FR-30: Epic 1 — Correct `accept_invite` (join flow executable)
FR-31: Epic 1 — Close roster & invite RLS escalation
FR-32: Epic 1 — `can_admin_org` boundary and `/admin` guard
FR-33: Epic 1 — Audit write authorization and tamper evidence
FR-34: Epic 1 — Approval creates users + first-admin bootstrap and backfill

## Epic List

### Epic 1: Org Administration Foundation (Correctness & Security)
Migration 013 lands: the join flow, roster/invite RLS, org-admin boundary, audit write path, and approval bootstrap all work as specced — before any feature is built on them.
**FRs covered:** FR-30, FR-31, FR-32, FR-33, FR-34

### Epic 2: Org Switching & Tenancy
Multi-org users can safely switch between organizations; the active org always resolves correctly and never leaks across sessions.
**FRs covered:** FR-1, FR-2, FR-3, FR-4

### Epic 3: Org Admin Role & Roster Management
Org Admins can view the member roster, remove members, and promote/demote roles — with the last-admin guard and full audit trail.
**FRs covered:** FR-5, FR-6, FR-7, FR-8, FR-9, FR-10

### Epic 4: Invites & Joining
Org Admins invite members by email (7-day, single-use tokens with real delivery); invitees join without losing existing data.
**FRs covered:** FR-11, FR-12, FR-13, FR-14, FR-15, FR-16

### Epic 5: Org Settings & Shared Defaults
Org Admins set org-wide name/slug, currency, and VAT defaults; members inherit them with per-field personal overrides.
**FRs covered:** FR-17, FR-18, FR-19, FR-20

### Epic 6: Admin Console — Requests, Plans & Audit
Platform Admins review and approve client requests with plan assignment, manage plan pricing and per-org subscriptions, and investigate via a tamper-evident audit trail.
**FRs covered:** FR-21, FR-22, FR-23, FR-24, FR-25, FR-26, FR-27, FR-28, FR-29

## Epic 1: Org Administration Foundation (Correctness & Security)

**Goal:** Migration 013 lands so the join flow, roster/invite RLS, org-admin boundary, audit write path, and approval bootstrap all work as specced before any feature is built on them. Ships the primitives later epics build on.

### Story 1.1: Add `can_admin_org` helper and close roster/invite RLS escalation

As a security-conscious developer,
I want migration 013 to add the `can_admin_org(org_id)` SECURITY DEFINER helper and replace the uniform-write policies on `org_members` and `invites` with `can_admin_org`-gated policies plus a `super_admin` carve-out,
So that only org admins (and platform staff) can mutate membership and invite rows, and no member can self-escalate.

**Acceptance Criteria:**

**Given** migration 013 has been applied (via the Management API, never `db push`)
**When** a `member`-role user attempts to INSERT, UPDATE, or DELETE a row in `org_members` or `invites` for their org
**Then** RLS rejects the write (zero rows affected)

**And** a `member`-role user attempting to insert a row with `role = 'super_admin'` fails — `is_super_admin()` cannot be reached by self-insertion (FR-31, FR-32)

**And** an `org_admin` of an active org can mutate roster and invite rows in their org (FR-31)

**And** a platform `super_admin` can mutate roster and invite rows in any org (FR-31 carve-out)

**And** `can_admin_org` is a SECURITY DEFINER STABLE helper; app-level checks remain defense-in-depth only (AR-2)

**And** Vitest/integration tests cover member-vs-admin RLS boundaries and the self-escalation attempt (FR-31, R1)

### Story 1.2: Correct the `accept_invite` RPC for an atomic join

As a developer,
I want migration 013 to fix the `accept_invite` RPC — correcting the `UPDATE` on the nonexistent `expense_settings` table to `settings`, and making membership insert, row migration (profiles, categories, expenses, settings), and status flip commit in one transaction with an `ON CONFLICT (user_id, org_id)` per-field merge for settings,
So that joining an organization succeeds exactly once without partial state or constraint violations.

**Acceptance Criteria:**

**Given** a valid pending invite
**When** the invitee's join is processed through the corrected RPC
**Then** all steps commit atomically — no statement references a nonexistent relation (`settings`, never `expense_settings`) (FR-30)

**And** re-joining a member who previously left does not violate the `settings` uniqueness constraint (per-field `ON CONFLICT` merge, AD-5)

**And** a regression test over migration 013 proves single-transaction commit (FR-30)

### Story 1.3: Authorize audit writes with a single tamper-evident logging RPC

As a developer,
I want migration 013 to provide a single SECURITY DEFINER audit logging RPC (insert-only, re-deriving the actor server-side) plus the app's `shared/lib/audit-logger.ts` rewritten onto it, with client/anon inserts and all UPDATE/DELETE revoked and the org-member SELECT policy narrowed to `can_admin_org`,
So that audit rows are append-only, attributable, and readable by exactly the right roles.

**Acceptance Criteria:**

**Given** an org-admin action (e.g. role change) triggers the audit logger
**When** the logger calls the SECURITY DEFINER logging RPC
**Then** a retrievable entry is written with actor, action, target, timestamp, and outcome (FR-27, FR-33)

**And** a direct client insert or a DELETE on `audit_logs` fails (revoked); the service-role key has no write path to the table (FR-33, AD-6)

**And** a plain `member` can neither read nor write audit rows; an `org_admin` reads only own-org rows; `super_admin` reads all (FR-29, FR-33)

**And** exactly one audit implementation exists in the codebase (the previous direct repository insert is migrated off) (FR-33)

**And** the audit row schema matches the migration-002 canonical shape (`org_id, user_id, action, entity_type, entity_id, old_value, new_value`) with a pinned action vocabulary (AD-6)

### Story 1.4: Backfill first Org Admin for existing organizations

As a developer,
I want migration 013 to promote the earliest-`created_at` member to `org_admin` in every existing organization (and ensure new orgs get one at approval),
So that every org has exactly one designated Org Admin at launch.

**Acceptance Criteria:**

**Given** migration 013 runs against existing seeded and pre-existing orgs
**When** the backfill completes
**Then** every existing org has at least one `org_admin` — the earliest-`created_at` member, deterministically chosen (FR-34)

**And** orgs with zero members are unaffected; new orgs receive their admin via the approval path (FR-34)

**And** the backfill is idempotent (re-running does not duplicate promotions) and audit-logged where applicable (FR-34)

### Story 1.5: Provision users, orgs, and subscriptions via a service-role action

As a developer,
I want a server-side service-role provisioning primitive that creates a user if none exists, then the org, the membership (with configurable first-admin role), and an `active` subscription in one flow, with email sent only after both commit,
So that the approval path can create working organizations for new clients and the primitive supersedes the shipped `approve_client_request` RPC for new users.

**Acceptance Criteria:**

**Given** an approved client request with no existing account
**When** the provisioning primitive runs
**Then** it creates the user, the org, the membership, and the `active` subscription; the sequence is `createUser (GoTrue) → DB commit → email only after both succeed` (FR-34, AD-5, AD-7)

**And** the new owner's role is `org_admin` when the approver checked "assign as Org Admin", otherwise `member` (FR-34)

**And** the role assignment is deterministic and audit-logged (FR-34)

**And** the shipped `approve_client_request` RPC is superseded for the new-user path and no longer the source of truth (FR-22, FR-34)

## Epic 2: Org Switching & Tenancy

**Goal:** Multi-org users can safely switch between organizations; the active org always resolves correctly and never leaks across sessions. Tenancy corrections on top of the existing org-context machinery.

### Story 2.1: Resolve active org server-side with first-membership fallback

As a multi-org user,
I want my active org to resolve automatically to my earliest-`created_at` membership when my cookie is absent or invalid,
So that I can always reach the dashboard without losing my place or hitting errors.

**Acceptance Criteria:**

**Given** I have memberships but no (or an invalid/stale) `ledgerly_active_org` cookie
**When** I load the dashboard
**Then** `ensureActiveOrg` (server action, read surface `getActiveOrgIdAction`) resolves me to my earliest-`created_at` org and writes the cookie server-side (FR-2, AD-3)

**And** a user with no memberships resolves to null and org-scoped queries return no rows (RLS), never an error (FR-2)

**And** the cookie is only ever written by server code; client code contains no `document.cookie` write for it (FR-1, AD-3 regression guard)

**And** repinning runs before the `/no-access` branch can fire for a user who still has memberships (AD-3, AD-4)

### Story 2.2: Harden `switchOrg` with server-validated membership

As a multi-org user,
I want switching orgs to validate my membership server-side, set the httpOnly cookie, and reload,
So that I can move between my organizations safely without stale data.

**Acceptance Criteria:**

**Given** I select a target org in the switcher
**When** `switchOrg` runs
**Then** it authenticates me, validates membership against `org_members`, and on success sets the httpOnly cookie and triggers a full page reload (FR-1, AD-3)

**And** switching to an org I do not belong to returns an error and does not change the cookie (FR-1)

**And** after a successful switch the cookie equals the target org id and the next request renders that org's data (FR-1)

### Story 2.3: Gate the OrgSwitcher by membership count and role

As an org member,
I want the switcher visible on every org surface only when I have more than one membership, and never shown to platform admins,
So that the UI reflects my actual switching needs and keeps super admins pinned to the console.

**Acceptance Criteria:**

**Given** I have ≥2 memberships
**When** I visit `/dashboard`, `/expenses`, `/reports`, `/categories`, or `/settings`
**Then** the switcher renders in the sidebar (FR-4, UX-DR9)

**And** with ≤1 membership it is hidden (FR-4)

**And** a `super_admin` never sees the switcher on any surface — they remain pinned to `/admin` (FR-4, AR-10)

**And** the switch interaction is a full-page reload with no optimistic UI (UX-DR9, EXPERIENCE.md Interaction Primitives)

### Story 2.4: Clear the active-org cookie on logout

As a user,
I want logout to delete the `ledgerly_active_org` cookie before signing out,
So that no stale org context leaks into the next session.

**Acceptance Criteria:**

**Given** I am signed in with an active org cookie
**When** I log out
**Then** the cookie is absent afterwards, and a subsequent login by a different user resolves to their memberships only (FR-3, AD-3)

## Epic 3: Org Admin Role & Roster Management

**Goal:** Org Admins can view the member roster, remove members, and promote/demote roles — with the last-admin guard and full audit trail.

### Story 3.1: Build the Members surface with the roster table

As an Org Admin,
I want a Members surface under Settings that lists every member with name, email, role, member-since, and status,
So that I can see exactly who is in my organization.

**Acceptance Criteria:**

**Given** I am an `org_admin` of an active org
**When** I open `/settings → Members`
**Then** I see the full roster — active and suspended members, with no orphaned or soft-deleted entries (FR-7)

**And** member email is resolved via a service-role `auth.admin.listUsers` lookup (the existing `emailLookup` pattern) — no `profiles.email` column, no direct SQL against `auth.users` (FR-7, AR-9, AD-9)

**And** a `member`-role user does not see the surface (hidden, never disabled-only) (FR-7, UX-DR11)

**And** the table is responsive: desktop table, mobile card-list fallback per the Admin Users pattern (UX-DR1, UX-DR13)

**And** role and status render as chips/badges per the token set — Org Admin emerald chip, Super Admin purple chip, Active/Suspended badges (UX-DR8)

**And** rows load with Skeleton, empty state uses EmptyState, failures use ErrorState with retry (UX-DR11)

### Story 3.2: Promote and demote members with the last-admin guard

As an Org Admin,
I want to promote members to Org Admin and demote them back, subject to a last-admin guard,
So that I can manage administration without locking my organization out.

**Acceptance Criteria:**

**Given** I am an `org_admin`
**When** I promote a `member` to `org_admin`
**Then** they can access admin surfaces immediately, and the change is audit-logged with my actor id (FR-5, FR-9)

**And** demoting an `org_admin` to `member` makes admin surfaces reject them on their next action (FR-9)

**And** demoting or removing the last remaining Org Admin fails with a clear reason and the roster is unchanged (FR-6)

**And** any action targeting a `super_admin` membership row fails server-side — those rows are out of org-admin scope (FR-32, AD-4)

**And** promote/demote runs through server actions gated by `can_admin_org`, confirmed inline (no dialog for non-destructive), with a toast (UX-DR12, EXPERIENCE.md Component Patterns)

### Story 3.3: Remove a member with immediate access revocation

As an Org Admin,
I want to remove a member so their org access ends immediately while their previously imported data stays in the org,
So that my roster reflects reality without destroying history.

**Acceptance Criteria:**

**Given** I choose to remove a member
**When** the removal is confirmed in a dialog stating "This action cannot be undone"
**Then** their `org_members` row is deleted, their next org-scoped query returns zero rows (RLS), and the org's expense/data rows are untouched (FR-8)

**And** the removal is audit-logged (FR-8, FR-27)

**And** a removed member with no other membership lands on `/no-access` on their next request; a removed member with other memberships is repinned by `ensureActiveOrg` (FR-8, AD-3/AD-4 split)

**And** last-admin removal is refused (FR-6), and the confirm dialog names the consequence ("lose access", not "deleted") (UX-DR12, EXPERIENCE.md Anti-patterns)

### Story 3.4: Surface member suspension status

As an Org Admin,
I want suspended members marked with a status badge in the roster,
So that I can see at a glance who is suspended.

**Acceptance Criteria:**

**Given** a member has `profiles.is_suspended = true`
**When** the roster renders
**Then** that member shows a "Suspended" warning badge while their membership row still exists (FR-10, UX-DR8)

**And** suspension itself remains a platform-admin-only action in v1 — no org-admin suspension control is rendered (FR-10)

### Story 3.5: Add the no-access route and middleware guard

As a user whose active-org membership has vanished,
I want a `/no-access` state instead of silently falling through to a solo dashboard,
So that I understand I no longer have access to that workspace.

**Acceptance Criteria:**

**Given** my active-org membership no longer exists and I hold no other membership
**When** I make an org-scoped request
**Then** middleware redirects me to `/no-access`, an EmptyState-style block with "You don't have access to this workspace" and a "Back to login" action (FR-8, UX-DR7)

**And** a user who still has other memberships is never sent to `/no-access` — they are repinned to a valid org (AD-4)

**And** the route is keyboard-accessible and mobile-rendered per the accessibility floor (UX-DR10, UX-DR13)

## Epic 4: Invites & Joining

**Goal:** Org Admins invite members by email (7-day, single-use tokens with real delivery); invitees join without losing existing data.

### Story 4.1: Create invites (org admin only) with high-entropy tokens

As an Org Admin,
I want to create a pending invite for an email with a unique, unguessable token and a 7-day expiry,
So that I can securely invite someone to join my organization.

**Acceptance Criteria:**

**Given** I am an `org_admin`
**When** I create an invite for an email
**Then** a `pending` Invite is created with a unique token of ≥32 bytes of randomness and `expires_at = now + 7 days` (FR-11)

**And** creating an invite for an email with an existing `pending` invite in the same org fails with a clear error (partial unique index on `(org_id, lower(email)) WHERE status='pending'`) (FR-11)

**And** a `member`-role user cannot create invites (server action rejects with a permission error) (FR-11, AD-4)

**And** the action is gated by `can_admin_org` (FR-31, FR-32)

### Story 4.2: Deliver join-link emails through the mailer module

As a developer,
I want all invite emails delivered through a single mailer module backed by a transactional provider, with a logged no-op in dev,
So that invites actually reach their recipients and delivery is observable.

**Acceptance Criteria:**

**Given** an invite is created or resent
**When** the mailer runs
**Then** exactly one outbound email (dev: one logged send) containing `/invite?token=<token>` is sent through the transactional provider with a configured from-address (FR-12, AD-7)

**And** `RESEND_API_KEY` lives in server env only and never in the repo or client bundle; `DEV_EMAIL_*` vars produce a logged no-op (FR-12, AD-7)

**And** the send is non-blocking to invite creation, and each send logs a send-id + status correlated to the invite row for delivery diagnosis (NFR-5, AD-7, R3)

### Story 4.3: Build the invite management surface (list, revoke, resend, expiry)

As an Org Admin,
I want a pending-invite list with status badges, expiry, and inline Revoke/Resend actions,
So that I can manage outstanding invitations.

**Acceptance Criteria:**

**Given** I open `/settings → Members`
**When** the invite list renders
**Then** each row shows email, status badge (pending/accepted/revoked/expired), expiry, and inline Revoke/Resend outline buttons (FR-15, FR-16, UX-DR2)

**And** Revoke sets `revoked` (revoked invites cannot be accepted); Resend resets `expires_at` to now + 7 days and triggers a new email (FR-15)

**And** expired invites render a warning badge and are labelled as expired in the list (FR-16, UX-DR2)

**And** a duplicate-pending creation shows the inline error "This email already has a pending invite." (UX-DR2)

**And** `member`-role users can do none of this; empty state shows "No pending invites" via EmptyState (FR-15, UX-DR11)

### Story 4.4: Build the invite-accept flow with solo-data migration

As an invited user,
I want to accept an invite by confirming the organization, and have my existing personal rows migrate into it with my active-org cookie set,
So that I join without re-entering my history.

**Acceptance Criteria:**

**Given** I am authenticated and open `/invite?token=<token>` for a valid pending invite to my email
**When** I confirm the join (with the copy "your existing expenses will move into this organization")
**Then** the corrected `accept_invite` RPC binds the token to my JWT email (case-insensitive), inserts my membership, migrates my `org_id IS NULL` rows (profiles, categories, expenses, settings), marks the invite `accepted`, sets the active-org cookie, and redirects to `/dashboard` (FR-13, FR-14, AD-5)

**And** accepting with the wrong email fails and does not consume the token; a second accept attempt fails (token single-use) (FR-13)

**And** my previously personal rows now carry the org id and are visible org-wide; solo-only visibility of those rows ends (FR-13, FR-14)

**And** the surface shows distinct states for valid / expired / revoked / already-accepted, with expired showing "link expired — ask for a new invite" (FR-16, EXPERIENCE.md K2)

## Epic 5: Org Settings & Shared Defaults

**Goal:** Org Admins set org-wide name/slug, currency, and VAT defaults; members inherit them with per-field personal overrides.

### Story 5.1: Build the Organization settings surface and edit org profile

As an Org Admin,
I want an Organization section under Settings where I can edit the org name and slug,
So that my organization's identity is accurate.

**Acceptance Criteria:**

**Given** I am an `org_admin`
**When** I open `/settings → Organization`
**Then** I see a form with org name and slug; saving via the server action updates the org (FR-17, FR-20)

**And** a duplicate or invalid slug is rejected with a message; renaming does not alter member data or the active cookie (FR-17)

**And** a `member` calling the update action receives a permission error and the settings are unchanged (FR-20)

**And** the form uses the existing tokens/kit, shows "Saving…" progress and a success toast (UX-DR6, UX-DR12)

### Story 5.2: Set org-wide currency and VAT defaults with an effective-value resolver

As an Org Admin,
I want to set org-wide base currency and VAT defaults that members inherit unless they have a personal override,
So that the team's shared financial defaults are consistent.

**Acceptance Criteria:**

**Given** I am an `org_admin`
**When** I save org-wide defaults
**Then** `organizations.default_currency` and `default_vat_rate` update; currency outside `SUPPORTED_CURRENCIES` is rejected and non-numeric/out-of-range VAT (0-100) is rejected (FR-18, AR-8)

**And** a member with no personal override sees the org default in dashboards and forms; a member with a Personal Setting keeps their value (FR-18)

**And** the org-wide VAT default applies to new expense entries only — stored `tax_amount_cents` / `tax_rate_used` on existing rows are not retroactively rewritten (FR-18)

**And** dashboard, settings, and expense entry all read the same effective-value resolver with precedence org default → personal override → per-entry value (AR-8, AD-8)

### Story 5.3: Per-field personal overrides with "use org default" affordance

As an org member,
I want to override the org-wide currency or VAT per field, and clear an override to return to the org default,
So that my personal view stays exactly how I want it.

**Acceptance Criteria:**

**Given** the org has defaults set
**When** I view my personal Currency/VAT settings cards
**Then** I can override currency or VAT independently — a currency-only override leaves VAT on the org default (FR-19)

**And** each card shows a "use org default" affordance that clears the personal field back to the org default (FR-19, UX-DR6)

**And** the effective-value resolver returns the org default when the personal row is absent/cleared (AR-8)

## Epic 6: Admin Console — Requests, Plans & Audit

**Goal:** Platform Admins review and approve client requests with plan assignment, manage plan pricing and per-org subscriptions, and investigate via a tamper-evident audit trail.

### Story 6.1: Build the Requests queue surface

As a Platform Admin,
I want a Requests tab listing all client requests newest-first with a status filter,
So that I can review who is asking for access.

**Acceptance Criteria:**

**Given** I am a `super_admin`
**When** I open `/admin → Requests`
**Then** I see all `client_requests` newest-first with pending/approved/rejected status filters and timestamps (FR-21, UX-DR3)

**And** the pending count drives a badge on the Requests tab; empty state shows "No client requests" via EmptyState (UX-DR3, UX-DR11)

**And** non-super-admins get a permission error or the surface is hidden; the tab bar renders per the existing admin pattern (FR-21, AR-10)

### Story 6.2: Approve a request with plan assignment and first-admin bootstrap

As a Platform Admin,
I want to approve a pending request by choosing a plan and optionally assigning the new owner as Org Admin,
So that the requester gets a working organization immediately.

**Acceptance Criteria:**

**Given** a pending request
**When** I approve it in the Approve dialog (plan `Select` + "Assign as Org Admin" checkbox)
**Then** the provisioning primitive (Story 1.5) creates the user (if new), org, membership, and `active` subscription; the request is marked `approved`; the pending badge clears (FR-22, FR-34, UX-DR3)

**And** approving an already-approved request fails (status guarded); all mutations run through authenticated server actions (FR-22)

**And** the resulting org appears under Clients with the chosen plan, and the approval is audit-logged (FR-22, FR-27)

**And** the requester receives a sign-in email and can log in; outcome email to the requester remains out of scope (FR-22)

### Story 6.3: Reject a request with re-submission support

As a Platform Admin,
I want to reject a pending request, recording reviewer and timestamp,
So that I can decline access without creating anything.

**Acceptance Criteria:**

**Given** a pending request
**When** I reject it (inline confirm dialog)
**Then** the request records reviewer + `reviewed_at`; no user or org is created; re-approval of that row is impossible (FR-23)

**And** the requester's `requestAccess` re-submission after a rejection creates a new `pending` row — only `approved` and `pending` rows block re-submission (FR-23)

### Story 6.4: Build the Plans editor with pricing validation

As a Platform Admin,
I want to view all plans and edit monthly/yearly prices in cents,
So that pricing stays current.

**Acceptance Criteria:**

**Given** I am a `super_admin`
**When** I open `/admin → Plans`
**Then** I see all plans (seeded free/pro/enterprise and any custom) with price + member/expense limits (FR-24, UX-DR4)

**And** I can edit monthly/yearly price (cents, numeric); negative or non-numeric values are rejected (FR-25)

**And** saving an edit is audit-logged (FR-25, FR-27)

### Story 6.5: Change a per-org subscription plan

As a Platform Admin,
I want to see each organization's plan and subscription status and change the plan,
So that I can manage client tiers.

**Acceptance Criteria:**

**Given** I open the Clients tab
**When** I change an org's plan from the accordion plan `Select`
**Then** `subscriptions.plan_id` updates, the status transition respects the `active | trialing | cancelled | expired | past_due` set, and the change is audit-logged (FR-26, UX-DR4)

### Story 6.6: Build the Audit Log browse and filter surface

As a Platform Admin,
I want to browse and filter the audit trail by actor, action type, org, and date range,
So that I can investigate what happened, when, and by whom.

**Acceptance Criteria:**

**Given** I open `/admin → Audit Logs`
**When** I apply filters (actor, action, org, date range)
**Then** results are newest-first, filters combine, and pagination holds for large volumes (FR-28, UX-DR5, NFR-3)

**And** an `org_admin` viewing the audit surface sees only their own org's rows; a plain `member` cannot read audit rows (FR-29)

**And** timestamps render in monospace; the empty state shows "No audit entries match the filters" (UX-DR5, UX-DR11)

**And** browse stays under 500ms p95 at 10k+ rows using the `(user_id, action, org_id, created_at)` index (NFR-3)
