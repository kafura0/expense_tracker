# Adversarial Review (General) — PRD: Ledgerly Org Administration

**Reviewer stance:** Cynical adversarial review per `bmad-review-adversarial-general` workflow.
**Reviewed artifact:** `_bmad-output/planning-artifacts/prds/prd-expense-tracker-2026-08-03/prd.md` (draft, 2026-08-03)
**Context used:** `.memlog.md`, plus the live repo (migrations 001–012, `src/features/admin/actions.ts`, `src/features/auth/actions.ts`, `src/features/settings/actions.ts`, `src/shared/lib/org-context.ts`, `src/shared/lib/org-provider.tsx`, `src/shared/lib/org-actions.ts`, `src/shared/lib/supabase/middleware.ts`, `src/entities/org/repository.ts`, `src/entities/invite/repository.ts`, `src/shared/lib/audit-logger.ts`, `docs/code-review.md`, `docs/deferred-work.md`).
**Scope flags:** org switching, org admin experience, admin console, org_admin RBAC, invite/membership flows, audit log, open questions. Read-only; no PRD edits made.
**Verdict:** Do not build from this draft. The PRD repeatedly describes pre-existing machinery as "existing, already-corrected" when the shipped code is either broken (`accept_invite` writes to a nonexistent table) or divergent from the PRD's own model (approval does not use `approve_client_request`; `requestAccess` contradicts FR-23; current RLS lets any member mutate roster/invites and self-escalate to `super_admin`). The new `org_admin` role cannot be bootstrapped at all under the stated design. These are blocking pre-conditions, not polish items.

---

## Evidence base

Every finding below is grounded in a repo check, not inference:

- `supabase/migrations/012_security_hardening.sql` — `accept_invite`, `approve_client_request`, `create_org_for_user`, org-status-aware RLS helpers, revoke/grants.
- `supabase/migrations/011_remove_legacy_org_roles.sql`, `010_unify_org_member_write.sql`, `002_tenancy_and_security.sql`, `005_invites_and_solo_support.sql`, `001_initial_schema.sql`.
- `src/features/auth/actions.ts` (approveClientRequest, rejectClientRequest, requestAccess, logout).
- `src/features/admin/actions.ts` (getAdminAuditLogs, getAdminPlans, updatePlan, emailLookup).
- `src/shared/lib/org-context.ts`, `org-actions.ts`, `org-provider.tsx`, `supabase/middleware.ts`.
- `src/entities/org/repository.ts`, `src/entities/invite/repository.ts`, `src/shared/lib/audit-logger.ts`.
- Working-tree diff on `org-provider.tsx` / `auth/actions.ts` / `settings/actions.ts` (uncommitted).

---

## Findings

### A. The PRD's "already-corrected" foundations are factually wrong

1. **`accept_invite` — cited as "existing, already-corrected" — is broken on the current DB.**
   FR-13 says: *"Joining binds the invite to the invitee's authenticated email and migrates their unbound personal rows into the org (existing, already-corrected `accept_invite` RPC behavior)."* In `012_security_hardening.sql:256` the RPC runs `UPDATE public.expense_settings SET org_id = ...`. No `expense_settings` table exists anywhere in the schema (grep: only docs and that one line; the real table is `settings`, per `001_initial_schema.sql:73`). Every user gets a `settings` row via `handle_new_user`, so the `UPDATE` always raises "relation expense_settings does not exist", aborting the whole SECURITY DEFINER transaction — the `org_members` insert, the four data migrations, and the status flip all roll back. UJ-2's climax ("his dashboard immediately shows org data alongside his imported history") and the entire FR-13/FR-14 flow cannot execute on the shipped schema. The PRD's signature feature is built on a phantom.

2. **FR-22 attributes approval to an RPC that does not do what the PRD says.**
   FR-22: *"the system creates the user (if new), the Organization, the membership, and an `active` subscription via the hardened `approve_client_request` RPC"*; consequence: *"The RPC is called through the authenticated path only (revoked from anon/public)."* Two contradictions:
   - The shipped `approve_client_request` RPC (`012_security_hardening.sql:88-150`) explicitly does **not** create users: `IF v_user_id IS NULL THEN ... RETURN NULL` after marking the request `approved`. A new-user approval produces an approved request, no org, no owner — and is then unrecoverable (status already flipped, FR-22 consequence says re-approval fails).
   - The live flow that actually creates users is a service-role server action `approveClientRequest` (`src/features/auth/actions.ts:152-272`) using `auth.admin.createUser` + `create_org_for_user`. It never calls `approve_client_request`. An engineer building "wire the hardened RPC" will ship a dead path; an engineer who trusts the RPC ships the broken new-user case.

3. **FR-23 contradicts the shipped `requestAccess` guard.**
   FR-23 consequence: *"A subsequent request from the same email creates a new `pending` row."* But `requestAccess` (`src/features/auth/actions.ts:79-89`) blocks every re-submission: approved → error, pending → error, rejected → "contact support". After a rejection, a new pending row is impossible. As written, FR-23's testable consequence fails immediately.

4. **Approval email behavior contradicts the PRD's own "v2" carve-outs.**
   UJ-5: *"Reject with no email-to-user side effect (email remains a v2 item)"* and FR-23 out-of-scope: *"Emailing the requester the approval/rejection outcome (v2)."* The live approval path already emails every new user (`auth.admin.inviteUserByEmail`, `auth/actions.ts:221-223`) with a reset link. The PRD's product model of a silent v1 is out of step with shipped behavior, and its SM-2 ("% of approved clients who had their plan set at approval") depends on a flow the PRD mis-describes.

### B. The `org_admin` role: RBAC model is underspecified and unbootstrappable

5. **There is no path to ever create the first Org Admin — the role cannot bootstrap.**
   Every membership-creation path hardcodes `member`: `create_org_for_user` (`011:46-47`, `012:59-60`), `accept_invite` (`012:248-250`), and the manager-add in approval (`012:143-145`). FR-22 doesn't specify the created membership's role, FR-13 accepts as `member`, and promotion requires an existing Org Admin (FR-5/FR-9). So no org can ever acquire its first `org_admin`, FR-6/FR-9/FR-11/FR-17 all deadlock, and UJ-1's "Dena is Org Admin" has no mechanism by which she became one. The PRD also specifies no backfill for existing orgs (Carter Enterprises, seeded/existing clients). Launching this role requires an explicit first-admin rule (e.g., approval assigns `org_admin`; backfill migration) — the PRD is silent.

6. **The current RLS grants *every member* roster and invite mutation — including self-escalation to platform `super_admin` — and the PRD treats this as a routine migration, not a live vulnerability.**
   Migration 010 redefined `can_write_in_org()` to return true for any `org_members` row (`010:12-19`). The `org_members` policy *"Managers can manage members in their org" FOR ALL USING (can_write_in_org(org_id))* (`002:281-282`) and the invites policy *"Org managers can manage invites" FOR ALL* (`005:43-44`) therefore let **any member** INSERT/UPDATE/DELETE rows today. Because `FOR ALL`'s USING doubles as the INSERT check and `is_super_admin()` is `EXISTS(... role = 'super_admin')` with no status guard, any member can insert a `super_admin` membership row for themselves and become a global platform admin. The PRD's FR-5 consequence *"RLS: `org_admin` can manage roster rows in their org; `member` cannot"*, FR-8, FR-11, and FR-15 consequences ("member-role users cannot create invites", "member-role users can do neither") are all **false as of today** and remain false until a `can_admin_org` migration lands. Constraints (§Security, line 472) mentions that migration but does not surface that this is a pre-existing escalation hole and a hard pre-condition of every roster/invite FR.

7. **The PRD's roster model does not account for `super_admin` rows inside orgs.**
   Platform admins are `org_members` rows with `role='super_admin'` (that is the middleware's definition of a platform admin, `middleware.ts:323`). FR-5 lists `super_admin | org_admin | member` as the role values and FR-7 says the roster is *"exactly the org's `org_members` rows"* — so a `super_admin` row appears in the roster. The PRD never says whether an Org Admin may demote or remove it. If `can_admin_org` covers all `org_members` rows (the natural reading of "manage roster rows in their org"), an Org Admin can delete the platform admin's only `super_admin` membership, which **globally deactivates the platform admin** (`is_super_admin` is `EXISTS ... ANYWHERE`). FR-6's last-admin guard protects only the `org_admin` role. This boundary must be stated explicitly.

8. **Member emails are not available to any RLS-safe query, so FR-7's roster cannot be built as written.**
   FR-7 requires *"member name, email, role, membership since, and status"*. `profiles` has no email column (`001:10-17`), and `auth.users` is unreachable through the anon-key RLS client. The Admin Console works around this with a service-role `emailLookup()` that pages `auth.admin.listUsers` (`admin/actions.ts:40-56`). No such mechanism is specified for the org-admin-facing Members surface, and members who joined via request-approval (never invited) have no other email source. The Privacy section ("member emails are shown to Org Admins") is therefore unimplementable without a service-role path the PRD does not define.

9. **Multi-org (OQ-3's default "yes") conflicts with the one-profile-per-user data model and the org-approval guard.**
   `profiles.user_id` is UNIQUE (`001:12`) and a profile carries a single `org_id`. After a user joins org B, their profile still points at org A (`accept_invite` only updates `org_id IS NULL`), and the profiles RLS policy *"Org members can view profiles in their org"* is `is_org_member(profiles.org_id)` (`005:145-146`) — so org B's roster cannot read that member's name. Separately, `create_org_for_user` now hard-refuses anyone already in any org (`012:47-51`): an existing org member who submits a client request for a second org can never be approved. OQ-3's "both memberships retained" default holds for the invite path only, and the PRD never reconciles the two.

10. **The invite read policy is case-sensitive while `accept_invite` is case-insensitive — asymmetric and user-hostile.**
    FR-13: *"acceptance binds the token to the invitee's JWT email (case-insensitive)"*. The RPC compares `lower(...)=lower(...)` (`012:243`), but the RLS read the `/invite` page relies on is `email = auth.jwt()->>'email'` (`012:214`) — exact match. An invite to `Malik@vendorbh.co` will render as "invite not found" for a user whose JWT email is `malik@vendorbh.co`, even though acceptance would succeed. The PRD's "case-insensitive" claim covers only half the flow.

### C. Audit log: unworkable as specified, and integrity is unenforced

11. **No RLS policy allows an org member or Org Admin to write audit rows — FR-27 will fail on first insert.**
    `audit_logs` RLS is *"Super admins can do everything"* FOR ALL + *"Org members can view audit logs for their org"* FOR SELECT (`002:368-372`). There is **no INSERT policy for non-super-admins**. FR-27 requires entries for org-admin actions (remove member, role change, org settings change, invite send/revoke) via *"Rows are insert-only from server actions"* — but server actions run through the user's anon-key client (see `org/repository.ts:148-172`), so RLS applies and the insert is denied. Fixing it naively (a "members can insert" policy) lets any member forge audit rows, destroying the very trust UJ-6 ("a precise, unalterable record") and SM-4 ("100% of sensitive actions produce a retrievable entry") claim. The PRD must specify the write mechanism (SECURITY DEFINER logging RPC or service-role), and currently specifies neither.

12. **"Append-only / unalterable" is asserted, never enforced.**
    Glossary defines the Audit Log as *"an append-only record"*; UJ-6 climax is *"a precise, unalterable record"*. Nothing in the PRD or schema enforces that: no trigger, no revoked update/delete, no excluded-from-tampering storage. The PRD's Constraints name RLS as "the authoritative boundary" but `audit_logs` grants super_admin `FOR ALL` and nothing stops accidental direct edits. For a security feature whose entire point is tamper-evidence, the enforcement mechanism is a hole, not a detail.

13. **Two divergent audit implementations exist and the PRD does not disambiguate.**
    The migration-002 `audit_logs` schema (`org_id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent`) differs from the schema shipped in `src/shared/lib/audit-logger.ts` (`action, user_id, resource_type, resource_id, metadata`), which proposes its own table + policies including *"Authenticated users can insert audit logs"* (`audit-logger.ts:112-114`) — i.e., anyone can forge. FR-27/28/29 inherit whichever implementation the engineer picks; the PRD doesn't say which, and one of them actively contradicts FR-27's "no client path exists."

14. **FR-29's admin-only scoping contradicts the current policy, and FR-28's filters are incomplete.**
    FR-29: *"An Org Admin can view Audit Log entries for their own Organization only."* Today *every* org member can SELECT their org's audit log (`002:371-372`) — a widening the PRD flags nowhere. FR-28 requires filter by *"actor, action type, org, and date range"*; the existing `getAdminAuditLogs` (`admin/actions.ts:346-371`) supports only `action` and `org_id`, with no actor or date-range support and no matching index. The NFR index "(actor, action, org_id, created_at)" references an `actor` column that does not exist (`user_id` is the actor column).

### D. Org context & switching: the PRD papers over known, unresolved behavior

15. **FR-2's "first-membership fallback" contradicts the server-side contract and is unfulfilled.**
    FR-2: *"When the cookie is absent or invalid, the system resolves the Active Org to the user's first membership."* But `getActiveOrgId()` returns `null` with an explicit contract to *"never guess"* (`org-context.ts:74-78`), the middleware deliberately falls through on an invalid/missing cookie ("let the request through", `middleware.ts:303-309`), and the client cannot set an httpOnly cookie. In practice the cookie is only ever written by `switchOrg`, onboarding, or invite-accept (`invite/actions.ts:39`, `onboarding/actions.ts:35`). A member who never passes through those flows stays cookieless forever; FR-2's testable consequence ("A user with memberships and no cookie resolves to a valid org and can load the dashboard") holds only for the client-side provider state, not for server reads. The PRD presents this as a pinned, already-corrected design when the shipped behavior is known-flaky (see `docs/deferred-work.md` D-01/D-02).

16. **FR-8's "no-access state" does not exist.**
    FR-8 consequence: *"the middleware redirects non-members to a no-access state."* There is no such route or branch. A removed member with zero memberships falls through to the solo dashboard experience (no redirect), and a member whose cookie points at a removed org is explicitly let through (`middleware.ts:303-309`). RLS does block the data (correct), but the stated middleware behavior is fiction. Removed-member UX ("they're now a solo user" vs "you lost access") is undefined — a product decision the PRD silently makes.

17. **OQ-1 vs FR-4: a hard FR is unsatisfiable while the open question stays open.**
    FR-4: *"The switcher renders in the dashboard sidebar ... on every org surface."* OQ-1 asks whether to keep pinning super admins to `/admin`; the middleware today hard-redirects any `super_admin` membership away from every protected org path (`middleware.ts:328-332`). So for exactly the multi-membership super admins FR-4 targets, the switcher is unreachable, and `/admin` has no switcher. Launching both FR-4 and the current pin is contradictory; the PRD must resolve OQ-1 to a decision, not leave it open. Relatedly, the "regression guard" in FR-1 (no `document.cookie`) only became true in the *uncommitted* working-tree diff of `org-provider.tsx`; the committed code still wrote a shadow cookie (`docs/deferred-work.md` D-02).

### E. Admin console details

18. **FR-26 has no existing backing action.** The PRD frames §4.6 as *"Wires the existing `getAdminPlans`/`updatePlan` actions"* — those exist and work (`admin/actions.ts:471-505`, with the migration-012 plans write policy). But FR-26's per-org plan change (`update subscriptions.plan_id`) has no action and no policy; subscription writes are super-admin-only (`002:292-293`), which is fine, but the PRD counts it among "existing orphaned features" when it is genuinely new surface. Minor, but the framing is wrong.

19. **FR-25's audit consequence is unfulfilled.** *"Price change is audit-logged."* There is no audit write in `updatePlan` (`admin/actions.ts:484-505`), and per finding 11 any member-role insert would fail anyway. The FR's own test would fail.

### F. Metrics, open questions, and missing pre-conditions

20. **SM-1 is unmeasurable against a broken foundation.** SM-1 targets ≥60% invite acceptance within 7 days "validating FR-12, FR-13". With `accept_invite` broken (finding 1), FR-12's email has no working destination flow; the metric's baseline ("no email today") also silently concedes that the funnel this PRD owns does not function yet. Fine as a target; wrong as validation of FR-13.

21. **OQ-4 (email provider) is a launch-blocker dressed as an open question.** FR-12's email is the primary invite-delivery mechanism; "transactional provider" with a "logged no-op in dev" is an implementation assumption, but the concrete provider/from-address decision is parked in OQ-4 with a default. For a launch-grade PRD whose headline metric depends on delivered email, this should be a locked decision, not an open question.

22. **Migration-of-profiles ambiguity in FR-13.** FR-13 lists *"(profiles, categories, expenses, settings)"* as the migrated row sets. Migrating a user's single `profiles` row into the org is what orphans their display from any second org (finding 9). The PRD adopts this with no acknowledgment of the multi-org consequence it enables in OQ-3.

### G. What the PRD gets right (brief)

- The single-httpOnly-cookie tenancy posture and full-reload-on-switch are the correct architecture and are honestly flagged (FR-1–FR-4, §Security).
- FR-6 (last-admin guard), FR-11's partial unique index on pending invites, and FR-14's explicit solo-migration confirmation are all real, well-specified requirements.
- The audit FRs correctly enumerate the action set and the org-scoped read for admins; the gaps are in *enforcement*, not intent.
- Explicit Non-Goals (§5) and counter-metrics (SM-C1/SM-C2) are genuinely good practice.

---

## Conclusion

This is a well-structured product narrative wrapped around machinery that does not match it. Three of the four core flows — join (FR-13), approval (FR-22), and roster/invite security (FR-5/FR-8/FR-11) — either cannot run on the shipped schema or are contradicted by shipped behavior, and the `org_admin` role cannot be created by any defined path. The PRD's single biggest liability is its habit of calling things "existing, already-corrected" (`accept_invite`, the hardened RPCs, the cookie model) without verifying them, which converts known-broken states into unstated assumptions. Before any downstream UX/architecture/epics work, the PRD needs: (1) an `accept_invite` fix and re-verification of the join transaction; (2) a decided first-admin + backfill rule; (3) a `can_admin_org` migration that also closes the current self-escalation hole and excludes `super_admin` rows from org-admin scope; (4) an audit-write authorization and tamper-evidence design; and (5) resolution of OQ-1 and OQ-4 to hard decisions.
