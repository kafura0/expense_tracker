---
status: final
created: 2026-08-03
updated: 2026-08-03
---

# EXPERIENCE.md — Ledgerly Org Admin

*Experience spine. Owns how Ledgerly works. Sources: the finalized PRD `prd-expense-tracker-2026-08-03` (source of requirements; this spine does not restate them) and the existing application behavior. Visual identity reference: `DESIGN.md`. Conflicts between this spine and any mock, wireframe, or import resolve in favor of this document.*

## Foundation

- **Form-factor:** responsive web app (desktop-first, mobile-complete). All Org Admin and Admin Console surfaces are full-width desktop tables with mobile card-list fallbacks (established pattern on the Admin Users tab). No new native surfaces.
- **UI system:** the existing custom shadcn-style kit on Radix primitives (`src/shared/ui`): Button, Card, Input, Badge, Dialog, DropdownMenu, Table, Avatar, Skeleton, Toast, EmptyState, ErrorState, PageLoader. Native `<select>` and `<textarea>` are styled inline (no Select/Textarea kit components). DESIGN.md is the visual identity reference.
- **Tenancy model (non-negotiable):** the active org is one httpOnly cookie (`ledgerly_active_org`), written only by server actions. Switching always triggers a full page reload to invalidate per-org caches. The client never writes the cookie.
- **Role boundary (non-negotiable):** Platform Admins (`super_admin`) are pinned to `/admin`; they never see the OrgSwitcher or org surfaces. Org Admins operate only inside their org's surfaces. This is a deliberate v1 cut (PRD Non-Goals).

## Information Architecture

```
Org surfaces (sidebar-switched, OrgSwitcher on every page when >1 membership):
  /dashboard · /expenses · /reports · /categories   — unchanged
  /settings
    ├─ Profile            (all)      — unchanged
    ├─ Currency & Region  (all)      — unchanged, gains "use org default" affordance
    ├─ VAT Settings       (all)      — unchanged, gains "use org default" affordance
    ├─ Organization       (Org Admin) — NEW: name/slug + org-wide currency/VAT defaults
    ├─ Members            (Org Admin) — NEW: roster + invite management
    └─ Danger Zone        (all)      — unchanged

Platform (pinned):
  /admin
    ├─ Users · Clients · Invites · Announcements · Messages   — unchanged
    ├─ Requests  — NEW: client-request queue + approve/reject
    ├─ Plans     — NEW: plan pricing editor + per-org plan change
    └─ Audit Logs — NEW: read-only trail, filters, org scoping

Auth / public:
  /invite       — accept surface (valid / expired / revoked / already-accepted / done)
  /request-access — unchanged (public form)
  /no-access    — NEW (FR-8): reached when a user's active-org membership no longer exists
                  and they hold no other membership
```

Closure: every org-admin need (invite, roster, defaults, requests, plans, audit) has a surface; every surface has a journey below.

## Voice and Tone

Consistent with the existing app: **direct, calm, money-precise.**

- Actions are verbs on buttons ("Invite member", "Revoke", "Resend", "Approve", "Reject", "Save organization", "Assign as Org Admin").
- Progress states are gerunds ("Sending invite…", "Saving…", "Approving…").
- Feedback toasts are past-tense successes ("Invite sent successfully", "Member removed", "Org settings saved") and raw error messages in the `error` variant.
- Destructive confirmations always name the consequence and end with the existing formula: *"This action cannot be undone."*
- Invite/join copy keeps the existing gentle register: "You're Invited — Join an organization on Ledgerly."
- New microcopy to introduce (keep the register):
  - Org default currency helper: "Members who haven't set a personal currency will see this."
  - First-admin checkbox on approval: "Assign as Org Admin (grants this owner roster and settings management)."
  - No-access state: "You don't have access to this workspace. Contact your organization admin."

## Component Patterns

Behavioral contracts; visuals live in DESIGN.md.

- **Roster (Members surface):** table rows = member avatar, name, email, role chip, member-since, status badge, row menu (Promote/Demote, Remove). Remove opens a confirm dialog ("Remove {name} from {org}? They'll lose access immediately; their expenses stay in the org. This action cannot be undone."). Promote/Demote confirm inline (role chip swap + toast). A `super_admin` row renders **no row menu** (out of scope, FR-32).
- **Invite management:** inline "Invite member" (email input + button) at the top; pending list below with status badge and Revoke/Resend row actions. Duplicate-pending → inline error "This email already has a pending invite." Expired invites render a warning badge.
- **Requests queue:** newest-first list of request cards. Approve opens a Dialog with plan `Select` and the "Assign as Org Admin" checkbox; submit runs the approval action (creates user/org/subscription). Reject opens a confirm Dialog. After any decision, the badge count in the Requests tab decrements and a toast confirms.
- **Plans editor:** price inputs (cents, numeric) per plan with a per-row Save; per-org subscription change lives in the Clients tab as a plan `Select` on the org accordion.
- **Audit log:** filter bar (actor, action, org, date range) above a newest-first table; filters combine; results paginate. Monospace timestamps.
- **Org settings:** form with org name/slug + currency `Select` (with a "Members default" helper) + VAT number input; Save runs the update action; per-field "use org default" overrides appear on the personal Currency/VAT cards as a checkbox/select that clears the personal row.

## State Patterns

- **Loading:** PageLoader for page-level fetches; Skeleton rows for tables while the roster/queue/audit data loads; button-level "Saving…/Sending…" states.
- **Empty:** EmptyState for "No members yet — invite your first member", "No pending invites", "No client requests", "No audit entries match the filters".
- **Error:** ErrorState with retry for load failures; inline `text-xs text-red-400` under fields for validation; toast `error` for action failures; auth-style error banner for whole-form failures.
- **Permission-denied:** server actions return a permission error; the UI hides org-admin controls from `member`s (never renders them disabled-only).
- **Cookie/org resolution:** a member with memberships but no cookie is resolved to their earliest-`created_at` org on dashboard load via a server action that writes the cookie (FR-2). A user whose membership vanished and has no other org is sent to `/no-access` (FR-8).

## Interaction Primitives

- **Switch org:** OrgSwitcher trigger → panel (opens upward) → select org → server action validates membership → cookie set → **full page reload**. Optimistic UI is explicitly *not* used; the reload is the contract.
- **Confirm destructive:** Dialog with destructive button; never instant-destroy from a list row.
- **Row actions:** DropdownMenu (kebab) for dense tables (roster); inline outline buttons where a row has ≤2 actions (invite list, requests).
- **Forms:** controlled client forms calling server actions; success → toast + revalidate; failure → inline field errors.
- **Keyboard:** Radix-managed focus for dialog/dropdown; Tab order follows reading order; Esc closes dialogs/menus.

## Accessibility Floor

Behavioral; visual contrast lives in DESIGN.md.

- All interactive controls reachable by keyboard; focus ring visible via the global `ring-2 ring-ring/70` rule.
- Dialogs and dropdown menus are Radix-based (focus trap, Esc, aria-labelledby/describedby).
- Badges are never the sole status indicator — status is also conveyed by text (e.g., "Active", "Suspended", "Pending") on the row/card.
- Tables use real `<table>` markup (`Table` kit) with `<th scope>`; the mobile card-list fallback keeps the same semantics.
- Form fields pair a `<label>` (or `aria-label`) with the input; errors are announced via `aria-describedby`-style association (inline `text-red-400`).
- Color-contrast targets per WCAG AA on text; badge colors (text-400 on /15 tint) already pass on both `card` and `muted` fills.

## Key Flows

**K1 — Dena invites Malik (UJ-1).** Dena (Org Admin, Carter Enterprises) opens `/settings → Members`, taps "Invite member", enters `malik@vendorbh.co`. The system creates a pending Invite and emails the link; a row appears with a pending badge, Revoke and Resend actions. **Climax:** Malik accepts; the row flips to accepted and Malik appears in the roster. Edge: duplicate pending → inline error; expired → warning badge with Resend.

**K2 — Malik joins without losing history (UJ-2).** Malik (Solo User, one year of personal expenses) opens the emailed link, is authenticated, lands on `/invite`, confirms the org, and the system binds the token to his email, inserts the membership, migrates his unbound rows, sets the active-org cookie, and redirects to `/dashboard`. **Climax:** his dashboard shows org data alongside imported history. Edge: expired token → "link expired — ask for a new invite"; wrong-email token → error, token not consumed.

**K3 — Dena manages the roster (UJ-3).** In Members, Dena removes a departed teammate (confirm dialog), then accidentally promotes a contractor to Org Admin and immediately demotes them. **Climax:** roster reflects reality; the removed member loses access on their next request and, having no other membership, lands on `/no-access`. Edge: Dena tries to demote/remove the last Org Admin → refused with the reason.

**K4 — Dena sets org defaults (UJ-4).** In `/settings → Organization`, Dena sets currency = KES, VAT = 16% and saves. Members without personal overrides now see KES; a member with a personal currency keeps it (per-field override). **Climax:** toast confirms; the personal Currency/VAT cards show a "using org default" affordance. VAT applies to new expense entries only (stored rows unchanged).

**K5 — Osman approves a client (UJ-5).** Osman (Platform Admin) sees a pending request in `/admin → Requests`, opens it, picks the Pro plan, optionally checks "Assign as Org Admin", and approves. The system creates the user (if new), org, and active subscription; the badge clears and the org appears under Clients. **Climax:** the client can log in and start. Edge: rejecting a request lets the requester re-apply (new pending row); re-approving the same row is impossible.

**K6 — Osman edits a plan (plans beat).** In `/admin → Plans`, Osman updates a price, saves; the change is audit-logged. In Clients, he changes an org's plan from the accordion. **Climax:** subscription status reflects the change; the event appears in the Audit Log.

**K7 — Osman investigates (UJ-6).** In `/admin → Audit Logs`, Osman filters by actor + action + org + date range, reads the trail, and identifies the admin who suspended an org. **Climax:** a precise, unalterable record answers the question in seconds. An Org Admin viewing Audit Logs sees only their own org's rows.

## Inspiration & Anti-patterns

- **Anti-pattern (avoided):** role differentiation leaking into expense editing. `member` and `org_admin` share all data-write access; the role gates *administration* only. UI must not hint otherwise.
- **Anti-pattern (avoided):** "disabled-looking" hidden features. Non-admin members simply do not see Members/Organization sections (no placeholder cards).
- **Anti-pattern (avoided):** soft-delete ambiguity. Removed = gone from roster immediately; data stays in the org. Copy must say "lose access" not "deleted".
- **Anti-pattern (avoided):** instant destruction without confirm on roster/request actions.
- **Inspiration:** the Admin Users tab's responsive table→card fallback and the existing OrgSwitcher panel are the reference implementations to imitate for new surfaces.

## Responsive & Platform

- Desktop (`md+`): full tables and multi-column settings; sidebar visible.
- Mobile: hamburger drawer navigation; tables collapse to card lists (roster, requests, audit); forms stack full-width; dialogs max-h with internal scroll (`max-h-[90vh] overflow-y-auto`).
- All surfaces honor PWA safe areas and the `bottom-20 md:bottom-4` toast offset.
- No touch-gesture-only interactions; every action has a keyboard path.
