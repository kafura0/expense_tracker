# Ledgerly — Deferred Work

**Source:** Adversarial code review of the deployed core (2026-08-02).
**Status:** Deferred by agreement — non-blocking for the security-hardening release (migration 012 + `5129ccd`).
**Owners:** To be scheduled alongside the org-features PRD (budgets, member management, approvals).

---

## Deferred Findings

### D-01 — Invite Email Delivery
**Severity:** High · **Deferred by agreement**

The invite flow works end-to-end (token generation, `accept_invite` RPC, membership + data reassignment), but the invitation email is never actually sent — only the invite link is surfaced. There is no transactional email integration (Resend/SendGrid/etc.) wired up yet.

**Work needed:**
- Add a transactional email provider + key to env vars.
- Send the invitation email on `inviteUserByEmail` with the accept link (`/invite?token=...`).
- Handle provider failures gracefully (retry/queue, surface to admin).

### D-02 — Client-Side Org Cookie Shadowing
**Severity:** Medium · **Deferred by agreement**

`src/shared/lib/org-provider.tsx` still mirrors `ledgerly_active_org` to a client-side cookie (`document.cookie`) that is neither `HttpOnly` nor `Secure`. The server cookie (httpOnly + secure in prod) remains authoritative, but the shadow cookie is redundant and can drift, plus it is readable via XSS.

**Work needed:**
- Remove the client cookie entirely; rely on the server action return value for client state.
- If a client cache is required, use `localStorage` (documented XSS exposure) or React state.

### D-03 — Org Cookie Trust Rework
**Severity:** Medium · **Deferred by agreement**

The current cookie model double-stores the active org in a `ledgerly_active_org` cookie (client + server, separate lifetimes). The server cookie is correct, but the architecture invites confusion and shadowing (see D-02).

**Work needed:**
- Single source of truth for the active org (server-only cookie or JWT claim).
- Migration path so existing sessions keep working.

### D-04 — Category Deduplication
**Severity:** Medium · **Deferred by agreement**

Expense categories are stored per-expense; there is no canonical category table per org. Renaming/merging categories requires touching every expense row, and a typo can silently create a duplicate category.

**Work needed:**
- A `categories` table per org (seed with system categories on org creation).
- Expenses reference category by id; UI reads the catalog.
- Migration of existing expense rows.

### D-05 — Middleware Fail-Open
**Severity:** Medium · **Deferred by agreement**

`src/shared/lib/supabase/middleware.ts` treats a cookie-parse/DB error as pass-through (fail-open) to avoid bricking auth. This is the right default for availability, but it means a transient Supabase outage relaxes org-status enforcement.

**Work needed:**
- Configurable fail-closed mode for the org-suspension check on admin-only routes.
- Observability (log when middleware downgrades to fail-open).

### D-06 — Admin Invites Lack Org Context
**Severity:** Medium · **Deferred by agreement**

The super-admin invite UI can invite a user into a specific org, but the form doesn't always surface the target org's context, and invite tokens are not yet one-time-URL scoped (they are single-use but reusable until accepted).

**Work needed:**
- Invite tokens with expiry (e.g. 72h) and optional org preset.
- UI polish for choosing/confirming the target org.

### D-07 — Mixed-Currency Totals & Date-Boundary Labels
**Severity:** Medium · **Deferred by agreement**

Totals that mix currencies sum cents without converting (previously silently converted at 1:1 — the silent 1:1 path is now removed, so these now refuse to convert). Date-group boundaries in the expense list group by local midnight using `toISOString()`, which can shift grouping across UTC offsets.

**Work needed:**
- Currency-aware totals using exchange rates only when a rate actually exists.
- Locale-aware date boundary handling in the expense list grouping.

---

## Tracking

- [ ] D-01 invite email delivery (with PRD feature: member management)
- [ ] D-02 client org cookie removal
- [ ] D-03 org cookie trust rework
- [ ] D-04 category catalog per org
- [ ] D-05 middleware fail-open option
- [ ] D-06 invite token expiry + org context
- [ ] D-07 currency-aware totals + date boundaries

*Deferred items are explicitly out of scope for the security-hardening release and will be picked up with the org-features PRD.*
