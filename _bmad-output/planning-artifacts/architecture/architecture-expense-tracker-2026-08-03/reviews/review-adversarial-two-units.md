# Adversarial Review (Two-Unit Construction Test) — Ledgerly Org Administration Architecture Spine

**Reviewer stance:** Adversarial reviewer in an architecture-spine validation gate.
**Reviewed artifact:** `_bmad-output/planning-artifacts/architecture/architecture-expense-tracker-2026-08-03/ARCHITECTURE-SPINE.md` (draft, 2026-08-03, AD-1..AD-9).
**Context used:** PRD `prd-expense-tracker-2026-08-03/prd.md` (FR-2..FR-34), plus the live repo: migrations 001, 002, 005, 010, 012; `src/entities/org/repository.ts`, `src/entities/invite/repository.ts`, `src/shared/lib/audit-logger.ts`, `src/shared/lib/org-context.ts`, `src/shared/lib/org-actions.ts`, `src/shared/lib/supabase/middleware.ts`, `src/features/admin/actions.ts`, `src/features/invites/actions.ts`, `src/features/settings/actions.ts`, `src/features/dashboard/scope.ts`, `src/app/(auth)/invite/actions.ts`.
**Method:** Construct two sibling epics that each obey every AD *to the letter*, run them against each other, and report every point where the two builds are incompatible. Read-only; no spine edits made.

## The two units under test

- **Epic A — "Org Administration & Roster"** (`features/org`, `features/invites`, `features/settings`): org_admin role, roster, invites, org-wide defaults, audit writes.
- **Epic B — "Admin Console & Platform Approval"** (`features/admin`): client-request approval, plans/subscriptions, audit read view, super-admin surfaces.

Both epics are written by separate story teams against the same spine. Every finding below is a place where **A and B both pass every AD as written and still build two systems that cannot interoperate.**

---

## Verdict

The two units are **incompatible as currently bounded**: four of the nine ADs (AD-1, AD-6, AD-8) are under-specified about *who owns what write path and read path*, and AD-3/AD-4/AD-5/AD-7 each contain a two-owner or ordering ambiguity that A and B will resolve in opposite directions. The spine can be made compatible, but only by tightening AD-3 (one cookie writer + middleware staleness rule), AD-5/AD-7 (user-creation vs email ordering and a single mail channel), AD-6 (one audit RPC with a re-derived actor, service-role ban on audit writes, and an exhaustive migration of today's three direct-insert sites), AD-8 (a single effective-value resolver with pinned precedence and an `ON CONFLICT` settings merge in `accept_invite`), and reconciling the dependency diagram (shared/entities marked read-only) with those rules.

---

## Findings

### F1 — CRITICAL — Audit writes: AD-6 names one divergent file, but today there are three direct-insert paths, and Epic B owns a service-role key that can bypass the RPC entirely

**Units/conflict:** Epic A writes audit rows via the single SECURITY DEFINER logging RPC (AD-6: "the dead/divergent `shared/lib/audit-logger.ts` is rewritten onto this RPC"). Epic B already owns a service-role client (`createServiceClient`, `src/features/admin/actions.ts:31-38`) used today for `emailLookup`, and FR-25/FR-26/FR-22/FR-23 require B to log plan changes and request reviews. The natural B implementation — `service.from('audit_logs').insert(...)` — **bypasses RLS entirely**, so the AD-6 "revoke client inserts" rule does not stop it, and the service-role session has no `auth.uid()`, so the RPC's "server-supplied actor" (derived from the JWT, per FR-33's "org admins for their own org") cannot attribute a platform action unless the actor is passed as a parameter — which the RPC cannot safely trust unless it re-derives the caller.

**Consequences if built as-is:** two audit write paths produce rows with different enrichment and attribution (A: RPC-enforced actor + ip/user-agent; B: whatever the service-role insert passed, potentially null actor or client-supplied values). Plan-change and request-review rows (FR-25/27) may be unattributable, breaking UJ-6 ("who did what") and SM-4. Worse, AD-6 never names the **live** third path: `entities/org/repository.ts:148-172` `logAuditEvent` already direct-inserts today via the anon client. A's rewrite of `shared/lib/audit-logger.ts` leaves the org-repository logger untouched, so roster mutations (A's core, FR-5..FR-9) keep writing through a path AD-6 did not sanction.

**AD tightening that closes the hole (rewrite AD-6):**
1. The logging RPC derives the actor from the JWT for authenticated callers **and** accepts an explicit `p_actor_id` that is honored **only** when the RPC itself re-verifies `is_super_admin()` — never client-supplied for org-admin actions.
2. **All** audit writes — org-admin *and* platform — go through that one RPC, invoked from `features/*/actions.ts`. The service-role client is explicitly forbidden from touching `audit_logs` (a clause AD-6 currently lacks).
3. Migration 013 enumerates and migrates every existing direct-insert site: `shared/lib/audit-logger.ts` (wrong schema, dead), `entities/org/repository.ts logAuditEvent` (live, direct insert), and the admin console's future inserts — and pins the shared `action` vocabulary (e.g. `plan.update`, `request.review`) so A and B emit the same strings FR-28's filters depend on.

### F2 — HIGH — The dependency diagram contradicts AD-1 and AD-6: shared/entities are drawn read-only, but AD-6 mandates a shared/lib *write* and today's repositories *mutate*

**Units/conflict:** The flowchart draws `shr -. reads .-> db` (shared may only read) and no `ents -> db` edge at all. But AD-6 literally says "the ... `shared/lib/audit-logger.ts` is rewritten onto this RPC" — a write from shared. And AD-1's "every write goes through a `'use server'` action" is ambiguous about whether repositories may mutate: today `entities/invite/repository.ts` inserts/updates invites and calls the `accept_invite` RPC, and `entities/org/repository.ts` inserts audit rows and calls `create_org_for_user`. Epic A (following current code) keeps writes in repositories orchestrated by actions; Epic B (following AD-1's literal text) inlines all Supabase writes in `features/*/actions.ts`. Both "obey" AD-1; the result is two different mutation boundaries, and the audit-logger's location (shared vs features) becomes a per-epic guess.

**AD tightening:**
- Rewrite AD-1's rule to be location-explicit: repositories are read-only; every write call site (including RPC invocations) lives in `features/*/actions.ts`.
- Fix the diagram: add `shr -. 'audit RPC only' .-> db` (the one sanctioned shared write) or relocate the audit logger into `features/` with only types in shared — the spine must not mandate a write where its own diagram forbids one.

### F3 — HIGH — AD-3 vs AD-4: two owners of the active-org cookie, and a stale-cookie member falls into a /no-access trap before `ensureActiveOrg` ever runs

**Units/conflict:** Epic A implements `ensureActiveOrg`/`switchOrg` in server actions (cookie written on dashboard load, per AD-3's fallback: "pins the earliest-`created_at` membership when the cookie names an org the user left"). Epic B implements the middleware guard (AD-4: "middleware redirects ... non-members of the pinned org to `/no-access`").

Scenario that breaks both teams' builds: user is a member of orgs A and B; cookie pins org A; an Org Admin removes them from A (FR-8). On their next request the middleware reads cookie=A, finds no A membership — and AD-4's letter says "non-members of the pinned org → `/no-access`". The user is a **member of B**, so AD-3's letter says they should be repinned to B — but the middleware runs first and bounces them; A's `ensureActiveOrg` never executes. A still-valid member of B is trapped at `/no-access`. Neither epic violated its AD.

Related two-owner divergence: AD-3 allows the cookie to be written by "server actions/middleware only". A implements the fallback in a server action; B implements it in middleware. Today's middleware explicitly cannot set the org cookie on first visit (`supabase/middleware.ts:263-266`); if B writes it via `NextResponse.cookies`, A then overwrites on reload — two writers of one cookie with different staleness policies (request-time memberships vs fresh DB read), the exact "client cookie shadowing" AD-3 claims to prevent, recreated on the server side.

**AD tightening:**
- AD-3 must name exactly **one** cookie writer (the `switchOrg`/`ensureActiveOrg`/invite-accept server actions); middleware may read and may redirect, never write the org cookie.
- AD-4 must split its no-access rule: middleware distinguishes "cookie names a left org but the user has other memberships" (redirect to `/dashboard` and let `ensureActiveOrg` repin) from "no memberships at all" (only then `/no-access`). As written, AD-4's `/no-access` clause and AD-3's repin clause are mutually unreachable for this user class.

### F3b — HIGH — AD-4 is silent on org_admin gating for non-`/admin` surfaces, so A and B disagree about whether middleware blocks `/settings`

**Units/conflict:** AD-4 pins only `/admin` gating in middleware (super_admin). The new org-admin surfaces live **inside** `/settings` (`settings/organization`, `settings/members`, per the spine's own tree). Epic A gates them with `can_admin_org` in server actions + RLS only. Epic B adds middleware redirects for those subpaths. If B's middleware rejects a plain member at `/settings/organization`, the member also loses personal settings, because the PRD co-locates personal and org settings under `/settings` — the very page a member must keep. Both builds obey AD-4's letter; users get an inconsistent permission surface depending on which epic shipped first.

**AD tightening:** AD-4 must state that org_admin gating for non-`/admin` routes is RLS + server-action only, never middleware — because `/settings` is a shared member/admin route and middleware-level blocking there is unmanageable without path-granular ACLs AD-4 does not specify.

### F4 — HIGH — AD-5 vs AD-7 vs AD-9: user-creation timing, two email channels, and two email-lookup mechanisms diverge between the approval and invite epics

**Units/conflict:**
1. **Order of user-creation vs email.** AD-5 says the join and the approval are atomic and "Invitation email must only be sent after the row commits." Epic A (invites) sends the join-link email at invite creation (before any membership exists — that is the point of an invite) and sets the cookie only after the `accept_invite` RPC commits. Epic B (approval) creates the auth user via `auth.admin.createUser` — an HTTP call to GoTrue that **cannot** be inside the DB transaction — then commits org+subscription+membership, then emails the sign-in link. "The row" is ambiguous (request row vs membership row), so A reads AD-5 one way, B the other. Result: either an email reaches a user whose org never committed (ghost account, no org), or an org commits whose owner never receives a sign-in email (unusable org, and the email that is sent can only be sent **after** commit, leaving a dead window where a failed send is unrecoverable because the request is already flipped to `approved`, per FR-22's "re-approval impossible").
2. **Two outbound mail channels.** AD-7: "All outbound mail goes through one mailer module." But user-creation through Supabase Auth (`auth.admin.createUser`/`inviteUserByEmail`) triggers **GoTrue's own email** — a second outbound path AD-7 never acknowledges. A's invite emails are logged by the Resend-backed mailer; B's new-user sign-in email is not, so AD-7's "no email-sent toasts with no email" guarantee silently does not hold for B's flow.
3. **Two email lookups.** AD-9 pins `auth.admin.listUsers` paging for roster *display*. B's approval needs find-or-create by email; the natural implementation is a direct service-role `select id from auth.users where lower(email)=lower($1)` plus `createUser` on miss — a different resolver than A's paged `listUsers`. A user created by B after page 3 of A's pagination is invisible to A's roster until a full re-page, and listUsers vs direct-query email normalization (case/whitespace) can disagree, so B approves an email A's roster cannot resolve. Both obey AD-9's letter ("service-role lookup, not a new column").

**AD tightening:**
- Tighten AD-5: pin the commit order — (1) service-role `createUser` (explicitly documented as out-of-transaction, a real window the spine must accept), (2) one DB transaction committing org + subscription + membership + request flip, (3) email **only after both (1) and (2) succeed**, send non-blocking/retryable with dev no-op so a failed send surfaces in the pending list rather than a dead approval.
- Tighten AD-7: declare Supabase Auth (GoTrue) sign-up/confirmation email either in-scope of the single mailer **or** an explicitly delegated second channel with documented behavior — no third, unnamed path.
- Tighten AD-9: find-or-create for approval uses the same service-role user resolver as roster display (one shared helper), so pagination and email normalization cannot diverge.

### F5 — HIGH — AD-8 has no "effective value" resolver and `accept_invite` collides with the per-(user,org) settings row it is supposed to preserve

**Units/conflict:**
1. **Divergent effective-value reads.** AD-8 puts org-wide defaults on `organizations.default_currency/default_vat_rate` and keeps personal overrides in `settings` — but defines no merge rule and no shared resolver. Today the dashboard reads `settings.base_currency` for `(user, org)` and hardcodes `'USD'` on miss (`scope.ts:134-143, 142`). Epic A's settings preview (UJ-4: "members' dashboards now default to KES") reads `organizations.default_currency`. Epic B's expense/dashboard forms follow the existing pattern and keep hardcoding `'USD'`. Same member, same org, two different "effective" values: A shows the org default, B shows USD. The column-name mismatch (`organizations.default_currency` vs `settings.base_currency`) invites a third buggy read (`organizations.base_currency`, which does not exist → silent USD fallback). Neither epic violates AD-8.
2. **Two writers of one settings row.** AD-5's corrected `accept_invite` migrates `settings` rows (`org_id IS NULL → org`). Migration 002 added `UNIQUE(user_id, org_id)` on `settings` (002:109). A user who is approved-then-invited, or removed-then-re-invited (the PRD explicitly allows rejoining), already has a `(user, org)` settings row — the blind `UPDATE ... SET org_id = <org>` in `accept_invite` (012:256) then raises a unique violation and rolls back the **entire join transaction**, including the membership insert and invite flip. Meanwhile Epic A's `updateSettings` (`features/settings/actions.ts:112-120`) upserts that same `(user, org)` row. Two epics own one row with no merge rule; AD-8 says settings "remain personal overrides" but never says what `accept_invite` does when the target row already exists.

**AD tightening (rewrite AD-8):**
- Migration 013 defines a single effective-value resolver (SECURITY DEFINER `effective_org_setting(org_id, user_id)` or a shared server-side helper) with pinned precedence — personal `(user, org)` setting → org default → built-in default (`'USD'`/16) — used by **both** dashboard/expense reads and the settings preview, never a per-feature hardcode.
- Pin the column pairing: `organizations.default_currency ↔ settings.base_currency`, `organizations.default_vat_rate ↔ settings.vat_rate`.
- Specify `accept_invite`'s settings migration as a **per-field merge** into the existing `(user, org)` row (`ON CONFLICT (user_id, org_id) DO UPDATE`, preserving any personal override), never a blind `UPDATE` that can violate the unique constraint.

---

## Dependency-diagram checks (as requested)

- **Flowchart `shr -. reads .-> db` contradicts AD-6's shared/lib audit logger.** Covered in F2 — this is the direct diagram-vs-AD contradiction the gate asked about, and it is real.
- **No `ents -> db` edge** contradicts both the current code (repositories mutate: `invite/repository.ts`, `org/repository.ts`) and any reading of AD-1 that keeps repository writes. Covered in F2.
- **ER diagram `org_members ||--o{ settings : personal-overrides`** is consistent with AD-8's "personal overrides stay in settings," but the diagram has no `organizations ||--o{ settings` edge, which would be the honest projection of org defaults now living on `organizations`. Cosmetic; fold into the AD-8 resolver change so the diagram reflects the source of truth.

---

## Consolidated closure list (what the spine must change to make the two units compatible)

| # | AD to tighten / add | Hole closed | Severity |
|---|---|---|---|
| 1 | AD-6 rewrite: one audit RPC, actor re-derived in-RPC, service-role banned from `audit_logs`, all three existing direct-insert sites migrated, action vocabulary pinned | Three write paths → one | Critical |
| 2 | AD-1 rewrite + diagram fix: repositories read-only, all writes (incl. RPC calls) in `features/*/actions.ts`; diagram shows the sanctioned shared audit write | Two mutation boundaries → one | High |
| 3 | AD-3 + AD-4: one cookie writer; middleware redirects (not writes) and distinguishes "left org but has others" (→ dashboard, repin) from "no memberships" (→ `/no-access`); org_admin gating for `/settings/*` is RLS + action only, never middleware | Cookie two-owner + stale-member trap + permission-surface split | High |
| 4 | AD-5 + AD-7 + AD-9: pinned order (createUser → DB commit → email after both, non-blocking); GoTrue email declared or delegated; one shared service-role user resolver | Email/creation ordering + two channels + two lookups | High |
| 5 | AD-8 rewrite: single effective-value resolver with pinned precedence and column pairing; `accept_invite` settings migration is a per-field `ON CONFLICT` merge | Divergent effective reads + settings-row unique violation | High |

*Reviewer's stance note:* these are construction-time holes, not prose nits — each was demonstrated as two letter-faithful builds that cannot interoperate, grounded in shipped code (`scope.ts`, `admin/actions.ts`, `org/repository.ts`, `012_security_hardening.sql`, `002_tenancy_and_security.sql`).
