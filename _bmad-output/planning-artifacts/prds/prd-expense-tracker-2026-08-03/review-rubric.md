# PRD Quality Review — Ledgerly Org Administration

## Overall verdict

This is a genuinely strong, downstream-ready PRD: nearly every FR carries a testable consequence, the scope arc (*request → approve → invite → manage → audit*) is coherent and bet on honestly, brownfield references are overwhelmingly accurate against the current codebase (I spot-checked `accept_invite`, `approve_client_request`, the partial unique index, `SUPPORTED_CURRENCIES`, middleware pinning, and the existing admin tabs — all match), and the open questions are real. What's at risk is concentrated in two places an architect or story author will hit fast: no mechanism creates an org's *first* Org Admin (the role is defined, but every new org currently receives only `member`), and FR-22's approval narrative contradicts the existing `approve_client_request` RPC, which does **not** create users. Both are fixable with small additions, but they are precisely the kind of silent assumptions a launch-grade chain-top PRD cannot afford.

## Decision-readiness — strong

Decisions are stated as decisions, not buried. The single-cookie server-action model is pinned as "the already-corrected design" (§4.1), FR-14 is explicitly a confirmed decision ("do not treat as a bug"), and FR-8's removal-as-revocation is called out as a deliberate non-deletion choice. Trade-offs name what was given up (contractor read-only tier → v2 in UJ-3/§9; email-to-requester deferred with a `[NOTE FOR PM]` at §6.2; SM-C1/C2 explicitly forbid optimizing invite speed or roster churn). Open Questions are genuinely open and grounded in verified code: OQ-1 correctly describes middleware pinning super admins to `/admin` (`middleware.ts:328`), and OQ-3's multi-org target-state question is a true unresolved decision with a stated default. The one soft spot is the boundary between the new `org_admin` role and the existing `super_admin` membership role, which is asserted but never constrained.

### Findings
- **[medium]** `super_admin` vs `org_admin` boundary is undefined where it matters. The Glossary (§3) calls Platform Admin a "DB role `super_admin`… Not a member-facing role," but in the codebase `super_admin` is a value of `org_members.role` (`is_super_admin()` in `002_tenancy_and_security.sql:156`, the `/admin` guard at `middleware.ts:323`), and FR-5 lists `super_admin | org_admin | member` in that same column. The PRD never states the two load-bearing consequences: (a) `org_admin` must **not** satisfy the `/admin` guard (today it checks `role === 'super_admin'`, so it won't by default — but that's security-by-accident, and R1's risk only covers RLS, not this guard), and (b) whether a `super_admin` who is also a roster member of an org has Org-Admin powers there. *Fix:* add one FR or a Constraint line: "`/admin` access requires `role='super_admin'`; `org_admin` grants org-surface powers only," and specify super-admin membership semantics inside an org.
- **[low]** OQ-2's default is stated but the counter-decision (Org Admin suspension) is dismissed without a trade-off. §8.2 gives "platform only" as the default with no discussion of the cost of org admins not being able to suspend. Given FR-10 pins it as an assumption, this is a defensible default — flagged only because the rest of the PRD is more honest about such calls.

## Substance over theater — strong

No persona theater: exactly three personas, each load-bearing — Dena drives FR-5–FR-20, Malik drives FR-13/FR-14, Osman drives FR-21–FR-29. No innovation theater: the Vision is explicitly about wiring "completed-but-unwired workflows," which matches reality. NFRs are product-specific where they matter — the audit browse target is a concrete bound with an index ("<500ms p95 for 10k+ rows (index on `(actor, action, org_id, created_at)`)", §Cross-Cutting), and observability is an email-log line, not "be observable." The only boilerplate is Accessibility ("meets the existing WCAG bar") and Security, both of which are anchored to an existing baseline rather than invented.

### Findings
- None that add information.

## Strategic coherence — strong

The PRD has a thesis and the features serve it: the org lifecycle in §1 ("request → approve → invite → manage → audit") maps one-to-one onto feature sections §4.1–§4.7, and the success metrics track the thesis rather than generic activity — SM-1 validates the invite machinery, SM-2 validates the admin-console wiring, SM-4 is instrumented-not-sampled. Counter-metrics are present and concrete. The MVP scope kind (platform/SaaS enablement) matches the scope logic: platform admins get the console, org admins get the roster, members get nothing that breaks their existing flow.

### Findings
- **[low]** SM-3 ("roster accuracy") measures *touch*, not accuracy — "% of orgs whose roster was touched by an Org Admin within 30 days of a membership change" rewards churn (an org whose roster is correct and untouched scores 0%). This is the rubric's activity-instead-of-quality tell. *Fix:* rename it "roster hygiene" or swap to a measurable accuracy proxy (e.g., % of removals that occurred within N days of last activity, or audit-verified roster).
- **[low]** SM-2 is near-100%-by-construction: FR-22 makes plan selection part of the approval UI, so "approved clients who had their plan set at approval" measures UI flow compliance, not a real outcome. Not a blocker — but the 90% target reads as theater when the flow enforces 100%. *Fix:* restate as "approvals completed via the new queue" or pick a plan-adjacent outcome.

## Done-ness clarity — adequate

This is the strongest section of the PRD and its most exposed one. Every FR 1–29 has a "Consequences (testable)" block, and most are excellent — FR-1's regression guard ("grep + browser console check"), FR-11's partial unique index, FR-13's exactly-once acceptance, FR-26's explicit status set. But three consequences either assert behavior the codebase does not have or leave a load-bearing path unspecified, and one entire capability (first Org Admin bootstrap) has no FR at all.

### Findings
- **[high]** No mechanism creates an org's *first* Org Admin. The Vision promises "every organization gains a designated Org Admin," but every path into the PRD produces `member` only: FR-22's approval inserts a membership, and the existing RPC assigns `'member'` (`approve_client_request` in `012_security_hardening.sql:144`; `accept_invite` at :249). FR-5 says "An Org Admin can promote… any `member` or `org_admin`," but with zero `org_admin`s, no one can. All four Dena UJs hand-wave the role into existence. For a chain-top PRD, architecture and stories will invent this path divergently (seed migration? super-admin console action? first-approver auto-promotion?). *Fix:* add an explicit FR — e.g., "the approving Platform Admin may assign the first `org_admin`, or the org creator is seeded as `org_admin` at approval" — and a testable consequence.
- **[high]** FR-22's approval flow contradicts the hardened RPC it names. §4.5/FR-22: "the system creates the user (if new), the Organization, the membership, and an `active` subscription via the hardened `approve_client_request` RPC." The actual RPC (`012_security_hardening.sql:88–150`) does **not** create users — if `auth.users` has no row for the requester's email it returns NULL after marking the request approved, creating neither org nor subscription. The "requester hasn't signed up yet" path — arguably the common case, since `/request-access` inserts only into `client_requests` — is therefore silently undefined, and UJ-5's climax ("an approved org appears under Clients… the client can log in and start") fails for it. *Fix:* either specify that the RPC must be extended to create the user (with password/OTP mechanics), or state the required path — approval requires an existing account and the flow must handle the no-account case explicitly.
- **[medium]** FR-18's org-wide VAT default collides with stored per-expense tax data. The consequence only covers "dashboards and forms," but VAT is currently a compile-time constant (`DEFAULT_VAT_RATE = 16`, `src/shared/lib/vat.ts`) baked into expenses at entry time (`tax_rate_used`, `tax_amount_cents` in `expense-form.tsx:209`). The PRD never says whether the org default (a) flows into expense-entry tax calculation, (b) retroactively restates stored tax amounts, or (c) only affects future rendering. An architect can't derive this. *Fix:* add an explicit consequence: "org-wide VAT applies to new expense entries; stored `tax_amount_cents`/`tax_rate_used` are not retroactively rewritten" (or state the reverse).
- **[medium]** FR-8's removal consequence asserts a middleware behavior that doesn't exist. "the middleware redirects non-members to a no-access state" — verified middleware (`middleware.ts:289–294`) passes zero-membership users through on protected non-admin paths (only `/admin` gets a redirect), and `/suspended` is keyed to org status, not membership removal. RLS genuinely blocks the data (the real claim), but the redirect is new behavior presented as existing. *Fix:* either delete the redirect clause or mark it as a required addition.
- **[low]** FR-2's "first membership" fallback is under-specified — first by what ordering (`created_at`? insertion order)? The consequence doesn't pin it. *Fix:* say "earliest `created_at` membership."
- **[low]** FR-13's migration list ("profiles, categories, expenses, settings") differs from the RPC it pins as "already-corrected," which migrates `expense_settings` (`012_security_hardening.sql:256`) — a table that has no `CREATE TABLE` anywhere in `supabase/migrations` (the real table is `settings` from `001`). The PRD names the right table; the pinned RPC is broken against it. Worth one sentence so the architect reconciles RPC-with-PRD rather than PRD-with-RPC.

## Scope honesty — strong

Non-goals are explicit and do real work (§5), the MVP cut is itemized against FR ranges (§6.1), and de-scoping is proposed out loud with reasons (email-to-requester carries a `[NOTE FOR PM]`; contractor tier, export, and Stripe are marked v2). Assumptions are inline-tagged and consolidated in §9, including a "superseded" note for the stale July PRD — the kind of cleanup that prevents cross-doc drift. The two gaps above (first Org Admin, no-account approval) are the honest omissions the PRD doesn't make explicit; they are silent, not staged.

### Findings
- **[low]** The §9 Assumptions Index lists entries that lack inline `[ASSUMPTION]` tags — "no org-wide theme in v1" (§4.4) and "contractor read-only tier is v2" (§2.3) are stated as Out-of-Scope/UJ content, not tagged assumptions. The roundtrip is nearly clean; these two entries break the "every inline tag indexed, every index entry inline-tagged" rule.

## Downstream usability — strong

The PRD is built to be source-extracted: glossary terms are used consistently in FR text, UJs each have a named protagonist (Dena, Malik, Osman) with entry state and context, and every section survives pull-out (no "see above" cross-refs). ID continuity is clean for FRs (1–29), UJs (1–6), SMs, and OQs. The mechanical defects below are few but real, and two of them (a dangling "FR-30" and a mis-pointed OQ reference) are exactly what a story author will trip on.

### Findings
- **[medium]** Dangling cross-reference: FR-8's consequence cites "the Audit Log (FR-30)" — no FR-30 exists; audit recording is FR-27. *Fix:* re-point to FR-27.
- **[low]** R5's mitigation "retention/archival policy deferred to OQ-5 area" points at the wrong question — OQ-5 is org ownership transfer, not audit retention. *Fix:* add an OQ for audit retention or drop the pointer.
- **[low]** Plans surface (FR-24–FR-26) has no UJ while its sibling admin surfaces do (UJ-5, UJ-6). Not overhead — the PRD already commits to the UJ shape for platform admin; one more protagonist-context block for the plan-editor would keep the pattern complete.
- **[low]** "Personal Setting(s)" drifts between singular (Glossary) and plural (§4.4 description, FR-19 title). Cosmetic, but §3 defines the singular and the features should match.

## Shape fit — strong

Correct shape for the product: multi-stakeholder SaaS (consumer + B2B org-admin + internal platform console) with load-bearing UJs, and a chain-top placement that earns the heavy downstream-usability work. The brownfield posture is exemplary — new capability (org_admin role, org-wide settings, audit recording) is cleanly distinguished from existing-corrected design (single-cookie tenancy, `accept_invite` migration, `approve_client_request`, plans policies), with "already-corrected" used honestly where the code review already settled the design. The two high findings above are the only places where "pins existing behavior" and "asserts new behavior" blur.

## Mechanical notes

- **ID continuity:** FR 1–29 contiguous and unique; UJ 1–6; SM 1–4 plus SM-C1/C2; OQ 1–5. Clean.
- **Broken cross-refs:** FR-8 → "FR-30" (doesn't exist; should be FR-27); R5 → "OQ-5 area" (OQ-5 is ownership transfer, unrelated to audit retention). Both noted above.
- **Assumptions Index roundtrip:** §4.4 "no org-wide theme" and §2.3 "contractor read-only v2" indexed but not inline-tagged; FR-25's inline `[ASSUMPTION]` is indexed. Minor asymmetry.
- **Glossary drift:** "Personal Setting" (Glossary) vs "Personal Settings overrides" (§4.4); "Solo User" (§2.2/§3) vs "Solo" (UJ-2 entry state). Cosmetic.
- **Brownfield accuracy spot-checks:** all passed — single httpOnly cookie (`middleware.ts:52`, `org-context.ts:43`), switcher in sidebar (`dashboard/layout.tsx:166`), partial unique invite index (`012_security_hardening.sql:270`), `SUPPORTED_CURRENCIES` (`types.ts:16`), admin tabs Users/Clients/Invites/Announcements/Messages (`admin/page.tsx:37–39`), super-admin pinning (`middleware.ts:328`).
- **Required sections:** Vision, Target User + UJs, Glossary, Features with FRs, Non-Goals, MVP Scope, Success Metrics + counter-metrics, Open Questions, Assumptions Index, NFRs, Risks, IA — all present for a chain-top B2B PRD.
- **One deliberate note:** no addendum.md exists in the folder; this review covers `prd.md` alone.
