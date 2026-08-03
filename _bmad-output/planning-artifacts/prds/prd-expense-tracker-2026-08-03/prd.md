---
title: Ledgerly Org Administration
status: final
created: 2026-08-03
updated: 2026-08-03
---

# PRD: Ledgerly Org Administration

*Working title — confirm.*

## 0. Document Purpose

This PRD defines the organization-administration surface of Ledgerly: active-org switching, a new Org Admin role with roster management, the invite-and-join flow, org-wide settings, and completion of the platform Admin Console (client-request approval, plan management, audit logs). It is the single source of truth for downstream workflow owners — `bmad-ux` (experience spec), `bmad-architecture` (solution spine), and `bmad-create-epics-and-stories` (epics/stories). It builds on the existing application as of 2026-08-03 and the findings in `docs/code-review.md`; it does not repeat them. Requirements are grouped by feature with globally-numbered FRs, assumptions tagged inline, and a consolidated assumptions index in §9.

## 1. Vision

Ledgerly is a premium expense tracker serving both solo users and organizations. Today its multi-tenant surface is functionally single-admin: there is no role hierarchy inside an org, no member roster management, invites have no delivery mechanism, org-wide configuration does not exist, and the platform Admin Console hides three completed-but-unwired workflows (client-request review, plan management, audit logs).

This PRD makes organizations first-class: every organization gains a designated Org Admin who can invite members, manage the roster, and set shared defaults, while regular members keep a clean, personal workspace. On the platform side, super admins can review access requests, assign plans, and audit every sensitive action. The result is a coherent org lifecycle — *request → approve → invite → manage → audit* — that lets Ledgerly operate as a real SaaS.

The finished work must preserve the existing security posture: the active org is stored in a single httpOnly cookie, org membership is validated server-side, and RLS remains the authoritative data boundary.

## 2. Target User

### 2.1 Jobs To Be Done

- **Org Admin** — keep the team's workspace tidy: control who is in, set shared defaults, remove leavers. "I run the books for my team; I need the member list to reflect reality."
- **Org Member** — join an invitation without losing existing data, and keep a personal view of the org's expenses. "I was invited; I want in without re-entering my history."
- **Platform Admin (super admin)** — run Ledgerly as a SaaS: vet who gets organizations, assign plans, and investigate incidents via a trustworthy audit trail. "I need to know what happened, when, and by whom."

### 2.2 Non-Users (v1)

- **Unauthenticated visitors** — public marketing pages only; no org or admin surface.
- **Solo users** — no org membership; org-admin features are not shown to them. Their experience is unchanged by this PRD except where accepting an invite migrates their solo data (see FR-14).

### 2.3 Key User Journeys

- **UJ-1. Dena grows her team by invitation.**
  - **Persona + context:** Dena is Org Admin of Carter Enterprises (4 members). The org is `active`.
  - **Entry state:** authenticated, on `/settings`, in the new Members surface.
  - **Path:** opens "Invite member" → enters `malik@vendorbh.co` → system creates a pending Invite and emails a join link → Dena sees the row in a pending list with "Resend" and "Revoke".
  - **Climax:** the Invite flips to `accepted` and Malik appears in the roster the moment he accepts.
  - **Resolution:** Dena promotes Malik to Org Admin (UJ-4 pattern). **Edge case:** an Invite to an already-pending email is rejected with a clear message; Dena can Resend instead.

- **UJ-2. Malik joins Carter Enterprises without losing his history.**
  - **Persona + context:** Malik tracked personal expenses as a Solo User for a year.
  - **Entry state:** authenticated as himself; opens the invite link from his email.
  - **Path:** lands on `/invite?token=...` → confirms the org name → system verifies the token, binds it to his email, inserts his membership, and reassigns his personal rows into the org → sets the active org cookie → redirects to `/dashboard`.
  - **Climax:** his dashboard immediately shows org data alongside his imported history.
  - **Resolution:** Malik is now an Org Member; his solo-only expenses are no longer visible under "personal". **Edge case:** an expired token shows a "link expired — ask for a new invite" state.

- **UJ-3. Dena manages the roster.**
  - **Persona + context:** Dena, Org Admin. A teammate left and a contractor needs limited read-only access ([ASSUMPTION: contractor read-only tier is v2, not v1]).
  - **Entry state:** `/settings → Members`.
  - **Path:** sees every member with role and status → removes the departed member → promotes the contractor to Org Admin by mistake, immediately demotes them back.
  - **Climax:** the roster reflects reality; removed member loses all org access on next request (RLS) and their org data remains intact.
  - **Resolution:** Dena can always see who did what via the audit log. **Edge case:** Dena attempts to remove or demote the last remaining Org Admin — system refuses.

- **UJ-4. Dena sets the team's shared defaults.**
  - **Persona + context:** Carter Enterprises invoices in KES; team members keep personal overrides.
  - **Entry state:** `/settings → Organization`.
  - **Path:** edits org name/slug and sets org-wide base currency = KES, VAT = 16% → saves.
  - **Climax:** a toast confirms; members' dashboards now default to KES unless they overrode it personally.
  - **Resolution:** the org settings page shows a clear "member can override" note.

- **UJ-5. Osman approves a new client.**
  - **Persona + context:** Osman, Platform Admin, on the Admin Console.
  - **Entry state:** `/admin`, Requests tab shows a `pending` client request.
  - **Path:** reviews the request → picks the Pro plan → approves → the approval path creates the user (if new), the org, and the active subscription (FR-22/FR-34) → requests badge clears.
  - **Climax:** an approved org appears under Clients with the chosen plan.
  - **Resolution:** the client can log in and start; Osman can Reject with no email-to-user side effect (email remains a v2 item). **Edge case:** approving an already-approved request is impossible — status is guarded.

- **UJ-6. Osman investigates an incident.**
  - **Persona + context:** Osman; a member reported unauthorized access to a subscription.
  - **Entry state:** `/admin → Audit Logs`.
  - **Path:** filters by actor and action type → reads the audit trail for the org → finds the suspend action, its timestamp, and the admin who performed it.
  - **Climax:** a precise, unalterable record answers the question in seconds.
  - **Resolution:** Osman can take corrective action and export the trail (v2).

## 3. Glossary

- **Organization** — a shared tenant with members, expenses, and settings. A user may belong to many Organizations.
- **Active Org** — the Organization a user is currently operating on; stored in the httpOnly cookie `ledgerly_active_org`.
- **Platform Admin** — DB role `super_admin`; platform staff operating the Admin Console. Not a member-facing role.
- **Org Admin** — new `org_admin` value of `org_members.role`; can manage the Roster, Invites, and Org-Wide Settings, and view the org's Audit Log. [ASSUMPTION: this role is a plain membership role, not a separate table.]
- **Org Member** — `org_members.role = 'member'`; reads/writes the org's expenses and sees Org-Wide Settings as defaults.
- **Solo User** — a user with no Organization memberships; personal expenses only.
- **Roster** — the set of `org_members` rows for one Organization, with role and status.
- **Invite** — a 7-day, single-use, email-bound offer of membership. Statuses: `pending | accepted | revoked | expired`.
- **Org-Wide Setting** — an Organization-level default (base currency, VAT rate) that members inherit unless they hold a Personal Setting.
- **Personal Setting** — the existing per-(user, org) settings row; overrides the Org-Wide Setting for that member.
- **Client Request** — a `pending | approved | rejected` row in `client_requests` created from `/request-access`.
- **Plan** — a pricing tier (`free | pro | enterprise`) with member and expense limits.
- **Subscription** — an Organization's link to a Plan with lifecycle status.
- **Audit Log** — an append-only record of sensitive actions (member added/removed, role change, settings change, org status change).

## 4. Features

### 4.1 Org Context & Switching

**Description:** The active-org mechanism is the single source of truth for tenancy. The PRD pins the corrected tenancy design: one httpOnly cookie, server-validated switching, and full reload to invalidate per-org caches. Multi-org members switch from a sidebar control on every org surface. Realizes UJ-1 (entry) and UJ-2 (entry).

**Functional Requirements:**

#### FR-1: Switch active org via server-validated action

An authenticated user can switch their Active Org through the `switchOrg` server action, which validates membership against `org_members` and sets the httpOnly cookie; on success the page reloads.

**Consequences (testable):**
- Setting `ledgerly_active_org` is only ever written server-side; `document.cookie` in client code never contains it (regression guard: grep + browser console check).
- Switching to an org the user does not belong to returns an error and does not change the cookie.
- After a successful switch, the cookie value equals the target org id and the next request renders that org's data.

#### FR-2: Resolve active org with first-membership fallback

When the cookie is absent or invalid, the system resolves the Active Org to the user's first membership (earliest `created_at`) and still requires a membership for every org-scoped operation. Because the cookie is httpOnly, the fallback is executed by a server action (`ensureActiveOrg`) that writes the cookie on dashboard load — the client cannot set it.

**Consequences (testable):**
- A user with memberships and no cookie resolves to the earliest-`created_at` org and can load the dashboard; the cookie is written server-side.
- A user with no memberships resolves to null; org-scoped queries return no rows (RLS), never an error.

#### FR-3: Clear active org on logout

`logout` deletes the `ledgerly_active_org` cookie so no stale org context leaks across sessions.

**Consequences (testable):**
- After logout, the cookie is absent; a subsequent login by a different user resolves to *their* memberships only.

#### FR-4: Show org switcher on every org surface

The switcher renders in the dashboard sidebar whenever the user has more than one membership, including on `expenses`, `reports`, `categories`, and `settings`.

**Consequences (testable):**
- With ≥2 memberships, the switcher is visible on every protected org page; with ≤1 it is hidden.
- Platform Admins (`role = 'super_admin'`) do not see the switcher — they are pinned to `/admin` for v1 (see Non-Goals).

### 4.2 Org Admin Role & Roster Management

**Description:** Introduces the `org_admin` membership role and the Members surface, where Org Admins view, invite, remove, and re-role members. Removal is a membership revocation, never a data deletion. Realizes UJ-1, UJ-3.

**Functional Requirements:**

#### FR-5: Assign org_admin role

`org_members.role` accepts `super_admin | org_admin | member`. An Org Admin can promote or demote any `member` or `org_admin` in their org, subject to FR-6. [ASSUMPTION: data-write permissions stay uniform — `can_write_in_org()` still returns true for `member` and `org_admin`; the new role gates administrative actions only.]

**Consequences (testable):**
- A `member` cannot access the Members/Invite/Org-Settings surfaces (server actions reject with a permission error).
- An `org_admin` can.
- RLS: `org_admin` can manage roster rows in their org; `member` cannot (enforced by `can_admin_org()` — FR-32).
- Org Admin roster actions cannot create, demote, or remove `super_admin` memberships; those rows are outside org-admin scope (FR-32).

#### FR-6: Preserve last Org Admin

The system refuses to demote or remove the last remaining Org Admin of an Organization.

**Consequences (testable):**
- With one Org Admin, demote/remove attempts return an error and the roster is unchanged.
- The error message states the reason.

#### FR-7: View roster

An Org Admin can view the full Roster: member name, email, role, membership since, and status (including `suspended` members).

**Consequences (testable):**
- Roster lists exactly the org's `org_members` rows (active and suspended), with no orphaned or soft-deleted entries.
- Member email is resolved via a service-role lookup reusing the Admin Console's existing `emailLookup` pattern — `profiles` carries no email column and `auth.users` is not RLS-reachable.
- Non-admin members do not see the roster surface.

#### FR-8: Remove a member

An Org Admin can remove an Org Member, which revokes their membership (delete `org_members` row) and immediately blocks org data access; their previously imported rows remain in the org and are not deleted.

**Consequences (testable):**
- Removed member's next org-scoped query returns zero rows (RLS). The middleware additionally gains a no-access redirect when the user's Active Org membership no longer exists and they hold no other membership (required addition — today such users fall through to the solo dashboard).
- Org expenses/rows are untouched by the removal.
- The removal is recorded in the Audit Log (FR-27).

#### FR-9: Re-role a member

An Org Admin can promote a `member` to `org_admin` and demote an `org_admin` to `member`, subject to FR-6.

**Consequences (testable):**
- After promotion, the promoted member can access admin surfaces immediately.
- After demotion, admin surfaces reject the member on their next action.
- Both changes are audit-logged with the actor's id.

#### FR-10: Member status visibility

The roster reflects `profiles.is_suspended`, and a suspended member is marked in the list. [ASSUMPTION: suspension remains a platform-admin action only, not an org-admin action, for v1.]

**Consequences (testable):**
- A suspended member shows a status badge; their membership row still exists.

**Feature-specific NFRs:**
- Every roster mutation is audited (see §Cross-Cutting NFRs — Auditability).

### 4.3 Invite & Joining

**Description:** The invite lifecycle. Invites are 7-day, single-use, email-bound, and revocable. Joining binds the invite to the invitee's authenticated email and migrates their unbound personal rows into the org (corrected `accept_invite` RPC — see FR-30). Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-11: Send invite (org admin only)

An Org Admin can create an Invite for an email not already pending in the org; the system generates a unique token with a 7-day expiry and status `pending`.

**Consequences (testable):**
- Creating an invite for an email with an existing `pending` invite in the same org fails with a clear error (partial unique index `(org_id, lower(email)) WHERE status='pending'`).
- Invite token is unique and unguessable (≥32 bytes of randomness).
- `member`-role users cannot create invites.

#### FR-12: Email the join link

On invite creation (and on Resend), the system emails the invitee a join link `/invite?token=<token>`. Email is delivered through a transactional provider (e.g., Resend) with a configured from-address; local dev logs a no-op send. [LOCKED 2026-08-03 — resolves former OQ-4.]

**Consequences (testable):**
- Creating an invite triggers exactly one outbound email (dev: one logged send).
- The link contains the token; opening it while logged in reaches the accept surface (FR-13).

#### FR-13: Accept invite

An authenticated user can accept a `pending`, unexpired Invite whose token matches; acceptance binds the token to the invitee's JWT email (case-insensitive), inserts the membership, migrates their `org_id IS NULL` rows (profiles, categories, expenses, settings) into the org, marks the invite `accepted`, and sets the Active Org cookie.

**Consequences (testable):**
- Accepting with the wrong email fails; the token is not consumed.
- Accepting with the right email succeeds exactly once (second attempt fails).
- The join runs against the corrected `accept_invite` RPC (FR-30): membership insert, row migration, and status flip commit atomically; no statement targets a nonexistent table.
- The invitee's previously personal rows now carry the org id and are visible org-wide.
- The Active Org cookie equals the joined org after acceptance.

#### FR-14: Solo-data migration is explicit

The data migration in FR-13 is an explicit, confirmed design decision: a Solo User who joins an org brings their existing personal rows with them. [ASSUMPTION confirmed by PM on 2026-08-03 — keep, do not treat as a bug.]

**Consequences (testable):**
- The join confirmation surface states "your existing expenses will move into this organization."
- After acceptance, solo-only visibility of those rows ends (they are org rows).

#### FR-15: Revoke & resend invites

An Org Admin can Revoke a `pending` Invite (sets `revoked`) and Resend a `pending` Invite (fresh expiry, new email send).

**Consequences (testable):**
- Revoked invites cannot be accepted.
- Resend resets `expires_at` to now + 7 days and sends a new email.
- `member`-role users can do neither.

#### FR-16: Expired invites

An Invite whose `expires_at` has passed reads as `expired` and cannot be accepted; the accept surface shows a "link expired — ask for a new invite" state.

**Consequences (testable):**
- Accepting an expired token returns the expired state and never inserts a membership.
- Pending list in the admin surface labels expired invites.

### 4.4 Org Settings

**Description:** Adds an Organization settings block (name, slug, org-wide base currency, org-wide VAT rate) managed by Org Admins. Members inherit these as defaults and may keep Personal Setting overrides. Realizes UJ-4.

**Functional Requirements:**

#### FR-17: Edit org profile

An Org Admin can edit the Organization name and slug; slug changes are validated for uniqueness and format.

**Consequences (testable):**
- Duplicate or invalid slug is rejected with a message.
- Renaming an org does not alter member data or the active cookie.

#### FR-18: Set org-wide defaults

An Org Admin can set org-wide base currency (from the supported currency list) and VAT rate (0–100). These apply to members who have no Personal Setting for the field.

**Consequences (testable):**
- Currency outside the supported list is rejected (shared `SUPPORTED_CURRENCIES`).
- Non-numeric or out-of-range VAT is rejected (shared numeric coercion).
- A member with no personal override sees the org default in dashboards and forms.
- A member with a Personal Setting keeps their value.
- The org-wide VAT default applies to *new* expense entries; stored `tax_amount_cents` / `tax_rate_used` on existing rows are not retroactively rewritten.

#### FR-19: Personal overrides are per-field

A member's Personal Setting overrides the Org-Wide Setting per field (currency or VAT independently), not wholesale.

**Consequences (testable):**
- Member override for currency only → VAT still uses the org default.

**Out of Scope:**
- Org-wide theme. [ASSUMPTION]

#### FR-20: Org settings access control

Only Org Admins can mutate Org-Wide Settings; members read them.

**Consequences (testable):**
- A `member` calling the update action receives a permission error and the settings are unchanged.

### 4.5 Admin Console — Client Requests

**Description:** Wires the existing `/request-access` form + `client_requests` table into the Admin Console as a Requests surface, using the approval path that handles new users (FR-34). Realizes UJ-5.

**Functional Requirements:**

#### FR-21: Review request queue

A Platform Admin sees all `client_requests` ordered newest-first, with status filter.

**Consequences (testable):**
- Queue shows pending, approved, and rejected requests with timestamps.
- Non-super-admins get a permission error (or the surface is hidden).

#### FR-22: Approve with plan assignment

A Platform Admin can approve a `pending` request, choosing a Plan; the system creates the user (if new), the Organization, the membership, and an `active` subscription, and marks the request `approved`. The approver may check "assign as Org Admin" for the new org owner (first-admin bootstrap — FR-34). [LOCKED 2026-08-03: the create-user path runs through the service-role server action; the shipped `approve_client_request` RPC cannot create users and is superseded (FR-34).]

**Consequences (testable):**
- Approval for an already-approved request fails (status guarded).
- Approving a requester with no existing account produces a working org; the requester receives a sign-in email and can log in (outcome email to requester remains out of scope — §6.2).
- The resulting org appears in Clients with the chosen plan.
- All mutations run through authenticated server actions (revoked from anon/public).

#### FR-23: Reject a request

A Platform Admin can reject a `pending` request, recording reviewer and timestamp; no user or org is created.

**Consequences (testable):**
- Rejected request shows reviewer and reviewed_at; re-approval of that row is impossible after rejection.
- Re-submission after a *rejection* creates a new `pending` row (the `requestAccess` guard is updated so only `approved` and `pending` block re-submission).

**Out of Scope:**
- Emailing the requester the approval/rejection outcome (v2).

### 4.6 Admin Console — Plans & Subscriptions

**Description:** Wires the existing `getAdminPlans`/`updatePlan` actions into a Plans surface for the Admin Console. Realizes UJ-5 (plan selection at approval).

**Functional Requirements:**

#### FR-24: View plans

A Platform Admin sees all Plans with monthly/yearly price, member and expense limits.

**Consequences (testable):**
- List renders seeded plans (free/pro/enterprise) and any custom plans.

#### FR-25: Edit plan pricing

A Platform Admin can update a Plan's monthly and yearly price in cents.

**Consequences (testable):**
- Negative or non-numeric prices are rejected.
- Price change is audit-logged.

**Out of Scope:**
- Live billing / Stripe webhooks (subscription rows remain manual or plan-driven for v1). [ASSUMPTION]

#### FR-26: Per-org subscription view

The Clients surface shows each Organization's current Plan and subscription status; a Platform Admin can change an org's plan (update subscription row — new action; no existing implementation).

**Consequences (testable):**
- Changing plan updates `subscriptions.plan_id` and is audit-logged.
- Status transitions respect the existing `active | trialing | cancelled | expired | past_due` set.

### 4.7 Admin Console — Audit Logs

**Description:** A read-only, append-only trail of sensitive actions. The write path and tamper-evidence enforcement are defined in FR-33. Realizes UJ-6.

**Functional Requirements:**

#### FR-27: Record sensitive actions

The system records an Audit Log entry for: membership add/remove, role change, org settings change, invite send/revoke/accept, org status change, plan change, and client-request review.

**Consequences (testable):**
- Each entry contains actor, action, target (org/member id), timestamp, and outcome.
- Rows are insert-only via the write path in FR-33; no client or update path exists.

#### FR-28: Browse & filter audit log

A Platform Admin can browse the Audit Log and filter by actor, action type, org, and date range.

**Consequences (testable):**
- Filters combine; results are ordered newest-first.
- Pagination holds for large volumes.

**Out of Scope:**
- Export (v2).

#### FR-29: Org-admin visibility (scoped)

An Org Admin can view Audit Log entries for their own Organization only. [ASSUMPTION: org-admin audit view is read-only, scoped by `org_id`.]

**Consequences (testable):**
- Org Admin query returns only rows for their org.
- The current member-wide SELECT policy is narrowed to Org Admin (FR-33); plain `member`s cannot read the audit log.
- Platform Admin sees all orgs.

### 4.8 Pre-conditions — Correctness Fixes (Migration 013)

**Description:** The FRs in §4.1–§4.7 assume machinery that the code review (and this PRD's verification pass) found broken or divergent from shipped code. These are blocking pre-conditions, not polish: FR-30–FR-34 must land before the org-admin scope can be built or validated. They ship as migration 013 plus the corresponding application changes. [LOCKED 2026-08-03 — in scope by PM decision.]

#### FR-30: Correct `accept_invite` (join flow executable)

Migration 013 fixes the `accept_invite` RPC so the join transaction runs against the real schema: the `UPDATE` targeting the nonexistent `expense_settings` table is corrected to `settings` (the table every user receives at signup), and the whole transaction — membership insert, row migration (profiles, categories, expenses, settings), status flip — commits atomically.

**Consequences (testable):**
- Accepting a valid invite commits all steps in one transaction (regression test over migration 013).
- No statement in the RPC references a nonexistent relation (`settings`, never `expense_settings`).

#### FR-31: Close roster & invite RLS escalation

The current `FOR ALL ... USING (can_write_in_org(org_id))` policies on `org_members` and `invites` let *any* member mutate roster and invite rows — including inserting a `super_admin` membership for themselves. Migration 013 replaces these with `can_admin_org(org_id)`-gated policies (org_admin) plus a `super_admin` carve-out, so write access to membership and invite rows no longer derives from generic membership.

**Consequences (testable):**
- A `member` cannot INSERT/UPDATE/DELETE `org_members` or `invites` rows (RLS test).
- No membership path allows a non-`super_admin` actor to create a `super_admin` row; `is_super_admin()` cannot be reached by self-insertion.

#### FR-32: `can_admin_org` boundary and `/admin` guard

A SECURITY DEFINER `can_admin_org(org_id)` helper gates administrative actions: true for `org_admin` and `super_admin` memberships of an active org. Two consequences are pinned explicitly: (a) `can_admin_org` does **not** grant access to `/admin` — the `/admin` guard continues to require `role = 'super_admin'`; (b) `super_admin` memberships are outside Org Admin scope — an Org Admin cannot demote or remove them.

**Consequences (testable):**
- An `org_admin` (no `super_admin` membership) is rejected by the `/admin` guard.
- An Org Admin roster action targeting a `super_admin` row fails server-side.

#### FR-33: Audit write authorization and tamper evidence

A single audit implementation is chosen (the app's `audit-logger` contract), and migration 013 provides the authorized write path: a SECURITY DEFINER logging RPC callable by org admins for their own org and by platform admins for any org. Client/anon inserts are revoked, `UPDATE`/`DELETE` are revoked for all non-owner roles, and the org-member SELECT policy is narrowed to `can_admin_org` (see FR-29). Append-only is enforced by the DB, not asserted in prose.

**Consequences (testable):**
- An org-admin action produces a retrievable entry via the defined RPC; a direct client insert or DELETE fails.
- A plain `member` cannot read or write audit rows.
- Exactly one audit implementation is present in the codebase (no divergent schemas).

#### FR-34: Approval creates users + first-admin bootstrap and backfill

Approval of a client request creates the user if none exists (service-role path), then the org, the membership, and an `active` subscription. The approving Platform Admin may check "assign as Org Admin," which sets the new owner's role to `org_admin` (otherwise `member`). Migration 013 additionally backfills existing orgs (seeded and pre-existing clients) by promoting the earliest-`created_at` member to `org_admin`, so every org has exactly one designated Org Admin at launch.

**Consequences (testable):**
- Approving a requester with no account yields a working org; the new owner can log in (FR-22).
- After migration 013, every existing org has ≥1 `org_admin`; new orgs get one at first approval.
- The role assignment (approver-check vs backfill) is deterministic and audit-logged.

## 5. Non-Goals (Explicit)

- **No per-member data deletion** on removal — removal revokes access; data stays in the org.
- **No live billing or payment processing** — subscriptions are plan rows without Stripe integration in this work.
- **No read-only / guest member tier** — every membership is `member` or `org_admin` in v1.
- **No self-serve "join another org" beyond invites** — membership growth is invite-driven.
- **No SSO / directory sync / LDAP.**
- **No org-level theme** — theme remains personal.
- **No super-admin org switching** — Platform Admins stay pinned to `/admin` in v1; the OrgSwitcher is org-member-only (resolves OQ-1).
- **Ledgerly is not becoming a general identity provider** — auth stays email/password + OTP.

## 6. MVP Scope

### 6.1 In Scope

- Org switching via the corrected single-cookie, server-action model (FR-1–FR-4).
- `org_admin` role + Members surface: roster, remove, re-role, last-admin guard (FR-5–FR-10).
- Invite send/resend/revoke/expire with email delivery + accept/migration flow (FR-11–FR-16).
- Org Settings: name/slug + org-wide currency/VAT defaults with per-field personal overrides (FR-17–FR-20).
- Admin Console: client-request queue + approve-with-plan + reject (FR-21–FR-23).
- Admin Console: Plans view/edit + per-org plan change (FR-24–FR-26).
- Admin Console: Audit Logs record/browse/filter + org-admin scoped view (FR-27–FR-29).
- Correctness pre-conditions: migration 013 + application fixes (FR-30–FR-34).

### 6.2 Out of Scope for MVP

- Email to requester on approval/rejection (`[NOTE FOR PM]` — affects perceived responsiveness; revisit if request volume grows).
- Audit log export (v2).
- Stripe/live billing (v2).
- Org-admin suspension of members (platform-only for v1).
- Onboarding wizard for org admins (v2, driven by UX if needed).

## 7. Success Metrics

**Primary**
- **SM-1** — Member self-service rate: % of invites accepted within the 7-day window. Target ≥ 60%. Validates FR-12, FR-13. Baseline: N/A (no email today — invites are manually shared).
- **SM-2** — Requests throughput: % of client requests resolved (approved or rejected) within 7 days of submission. Target ≥ 80% (from 0 today). Validates FR-21–FR-23. (Plan-at-approval is flow-enforced by FR-22, not a driver.)

**Secondary**
- **SM-3** — Roster accuracy (audit-verified): % of roster mutations recorded in the Audit Log that match the current roster state (no unrecorded insert/delete). Target ≥ 95%. Validates FR-5–FR-10 via audit reconciliation, not activity touch.
- **SM-4** — Audit coverage: 100% of sensitive actions produce a retrievable Audit Log entry (instrumented, not sampled). Validates FR-27–FR-29.

**Counter-metrics (do not optimize)**
- **SM-C1** — Do not optimize for invite *acceptance speed* at the cost of security: the email-bound, single-use token model must not be loosened to improve SM-1.
- **SM-C2** — Do not optimize roster *churn speed* (aggressive removals) — removal is a sensitive, audited action; ease of removal must not encourage destructive team-management habits.

## 8. Open Questions

1. Who may suspend a member of an org — platform only, or also Org Admin? Default in this PRD: platform only (FR-10).
2. Does accepting an invite from a user who is already an Org Member of another org keep both memberships? Default: yes, both retained. Caveat: `profiles` carries a single `org_id` and `create_org_for_user` refuses users already in an org, so multi-org currently holds for the invite path only; the profile/`org_id` data model is a known tension to be resolved in architecture.
3. Should an Org Admin be able to transfer org ownership (hand admin to another member)? Deferred unless asked.
4. Audit Log retention and archival policy — how long entries are kept and whether they move to cold storage. R5 defers here.

*Resolved during review (2026-08-03; former numbering):* OQ-1 (super-admin pinning) → kept, see Non-Goals. OQ-4 (email provider) → transactional provider with dev no-op, see FR-12.

## 9. Assumptions Index

- From §3/§4.2 — `org_admin` is a plain `org_members.role` value; no separate table. Data-write permissions stay uniform (`can_write_in_org` true for `member` and `org_admin`).
- From §4.2/FR-10 — member suspension remains platform-admin-only in v1.
- From §4.3/FR-12 — email delivery via transactional provider with dev no-op.
- From §4.4 — no org-wide theme in v1.
- From §4.6/FR-25 — no live billing; subscription rows managed via plan assignment.
- From §4.7/FR-29 — org-admin audit view is read-only and org-scoped.
- From §2.3/UJ-3 — contractor read-only tier is v2, not v1.
- From §2.1 — the prior stale PRD (`prd-expenseos-2026-07-17`) is superseded for org-admin scope.
- From §4.8 — correctness fixes (FR-30–FR-34) are in scope via migration 013 and application changes.
- From §4.8/FR-34 — first Org Admin is approver-assigned or backfilled (earliest member); every org has ≥1 `org_admin` after migration 013.
- From §4.5/FR-22 — the create-user approval path supersedes the shipped `approve_client_request` RPC for new users.
- From §4.3/FR-12 — email is locked to a transactional provider (e.g., Resend) with dev no-op; resolves former OQ-4.
- From §5 — super-admin org switching is out of scope; Platform Admins stay pinned to `/admin`; resolves former OQ-1.
- From §4.2/FR-7 — roster emails come from a service-role lookup, not a `profiles.email` column.

---

## Cross-Cutting NFRs

- **Auditability** — every FR that mutates org/member/plan state is covered by FR-27; audit writes go through the authorized write path (FR-33) within the mutation's server action.
- **Security** — all admin/server mutations validate `auth.getUser()`, verify membership + role server-side, and never trust client-supplied org ids. The active org remains a single httpOnly cookie; the org cookie is deleted on logout (FR-3).
- **Performance** — roster and audit queries are paginated; audit log browse must stay under 500ms p95 for 10k+ rows (index on `(user_id, action, org_id, created_at)` — `user_id` is the actor column).
- **Accessibility** — Members/Invite/Admin surfaces meet the existing WCAG bar (keyboard navigable, focus states).
- **Observability** — every outbound invite email is logged (send id, status) for delivery diagnosis.

## Constraints and Guardrails

### Security
- Server actions are the only path to mutate org membership, roles, settings, plans, and audit rows. RLS on `org_members`, `invites`, `organizations`, `subscriptions`, and `audit_logs` is the authoritative boundary; application checks are defense-in-depth.
- Invite tokens are high-entropy and single-use; tokens never appear in URLs of logged-in app pages beyond the one-time accept link.
- The new `org_admin` role requires an RLS helper (e.g., `can_admin_org(org_id)`) and a DB migration; supersedes the current uniform-write assumption for administrative actions only.

### Privacy
- Member emails are shown to Org Admins within the Roster and to Platform Admins in the Console; they are not exposed to regular members.
- Audit Log entries contain actor/target ids and timestamps, not free-form content beyond action metadata.

## Risk and Mitigations

- **R1 — Role escalation via RLS gap.** Mitigation: `can_admin_org` SECURITY DEFINER helper reviewed in code review; tests cover role boundaries.
- **R2 — Data migration on invite-accept surprises existing solo users.** Mitigation: explicit confirmation UI (FR-14) + clear messaging; irreversible-by-design but confirmed by the user.
- **R3 — Email delivery becomes a dependency.** Mitigation: send is non-blocking to invite creation; failure surfaces in the pending list as a resend cue.
- **R4 — Last-admin lockout.** Mitigation: FR-6 guard + audit visibility for the event.
- **R5 — Audit log growth.** Mitigation: indexed query, pagination; retention/archival policy deferred to OQ-4.

## Information Architecture

- **Org surfaces** (`/dashboard`, `/expenses`, `/reports`, `/categories`): unchanged; sidebar gains the existing OrgSwitcher whenever >1 membership (FR-4).
- **Settings** (`/settings`): gains two sections — *Organization* (Org Admin: profile + org-wide defaults, FR-17/18) and *Members* (Org Admin: roster + invite, FR-5–FR-16). Personal settings remain as-is with per-field override affordances (FR-19).
- **Admin Console** (`/admin`): adds three tabs — *Requests* (FR-21–23), *Plans* (FR-24–26), *Audit Logs* (FR-27–29) alongside existing Users / Clients / Invites / Announcements / Messages.
- **Public** (`/invite`): accept surface with states for valid/expired/revoked/already-accepted.
