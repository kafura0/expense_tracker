---
status: final
created: 2026-08-03
updated: 2026-08-03
---

# DESIGN.md — Ledgerly (Org Admin scope)

*Visual identity spine. Owns how Ledgerly looks. Source: the existing production design system in `src/app/globals.css`, `src/shared/ui/*`, and the admin/dashboard layouts — documented as the canonical identity and extended where the Org Admin scope adds surface. Conflicts between this spine and any mock, wireframe, or import resolve in favor of this document.*

## Brand & Style

Ledgerly is a premium expense-tracking SaaS. Its identity is **dark-first, precise, and calm**: a deep indigo-navy canvas (`background`) lit by an emerald primary used sparingly — actions, active states, and data that matters — with indigo as the secondary/assistive hue. The look is glass-forward on marketing/auth surfaces (`glass-card`, `hero-gradient`, `gradient-border`) and flatter-but-warm inside the app (`bg-card`, subtle borders, emerald glows on active nav). Data is always tabular, never decorative.

The Org Admin scope inherits this identity wholesale; it adds no new colors, fonts, or surface styles. New capability is expressed through existing tokens and existing component vocabulary (badges, tables, dialogs, toasts), so a member meeting an Org Admin surface for the first time cannot tell it is "new."

## Colors

The palette below is the authoritative token set (`@theme` in `globals.css`). Semantic roles, not raw hex, drive usage.

### Core

| Token | Value | Role |
|---|---|---|
| `colors.background` | `#0a0f1e` | Page canvas |
| `colors.foreground` | `#e2e8f0` | Primary text |
| `colors.card` | `#111827` | Surface (cards, popovers, dialogs) |
| `colors.card.foreground` | `#e2e8f0` | Text on card |
| `colors.primary` | `#34d399` | Emerald — primary actions, active states, focus ring |
| `colors.primary.foreground` | `#022c22` | Text on primary |
| `colors.secondary` | `#818cf8` | Indigo — assistive/highlight |
| `colors.muted` | `#1e293b` | Fill (inputs, chips, tab bar, hover rows) |
| `colors.muted.foreground` | `#94a3b8` | Secondary text, placeholders, captions |
| `colors.border` | `#1e293b` | Borders, separators |
| `colors.input` | `#1e293b` | Input borders |
| `colors.destructive` | `#f87171` | Destructive actions, errors |
| `colors.ring` | `#34d399` | Focus rings |

### Status & role semantics (Org Admin scope)

Reuse the existing Badge vocabulary. No new tokens:

| State | Pattern |
|---|---|
| Roster: active member | `badge.success` — `bg-emerald-500/15 text-emerald-400` |
| Roster: suspended | `badge.warning` — `bg-amber-500/15 text-amber-400` |
| Role: Org Admin | emerald chip — `bg-primary/10 text-primary` (matches the member role pill) |
| Role: Super Admin | purple chip — `bg-purple-500/15 text-purple-400` (existing admin pill) |
| Request: pending | `badge.info` — `bg-sky-500/15 text-sky-400` |
| Request: approved | `badge.success` |
| Request: rejected | `badge.destructive` (existing variant) |
| Invite: pending / accepted / revoked / expired | `badge.info` / `badge.success` / `badge.secondary` / `badge.warning` |

### Charts

`chart-1..5`: `#34d399`, `#818cf8`, `#fb923c`, `#38bdf8`, `#f472b6`. Unchanged.

### Sidebar

`sidebar` `#0f172a`, `sidebar.foreground` `#e2e8f0`, `sidebar.primary` `#34d399`, `sidebar.accent`/`sidebar.border` `#1e293b`. Active nav = `bg-sidebar-accent text-sidebar-primary` with a `3px` emerald left bar + icon glow.

> Deprecated tokens (`surface-dim`, `surface-container*`, `on-surface*`, `outline*`, `primary-container`, `secondary-container`, `tertiary*`) remain defined in CSS but are **forbidden** in new code — they were replaced by the semantic set above.

## Typography

| Token | Value | Use |
|---|---|---|
| `typography.font.sans` | Inter (fallback Geist, system-ui) | All UI text |
| `typography.font.mono` | Geist Mono (fallback JetBrains Mono) | Numeric/technical; `label-sm` micro-labels |
| `text-display-lg` | 48px | Landing hero |
| `text-headline-lg` | 32px | Landing section heads |
| `text-headline-md` | 24px | Page H1 (`font-headline text-2xl font-bold tracking-tight`) |
| `text-body-lg` | 18px | Auth/landing copy |
| `text-body-md` | 15px | Body, tables, form copy |
| `text-label-sm` | 12px | Micro-labels, field helpers, badges (uppercase where mono) |

Rules: money always `tabular-nums`; page H1 left-aligned on dashboard surfaces; field labels `text-sm font-medium text-foreground`; helpers `text-sm text-muted-foreground`.

## Layout & Spacing

- App container max `1280px` (`max-w-container-max`).
- Dashboard: fixed desktop sidebar (`w-64`, hidden below `md`) + main `p-4 md:p-6`; mobile = sticky blurred header (`bg-card/80 backdrop-blur-xl`) + hamburger drawer (`w-72`).
- Settings columns cap at `max-w-3xl` centered; auth pages at `max-w-md` centered on `hero-gradient`.
- Radius scale: `sm 6px` · `md 8px` · `lg 10px` · `xl 14px` · `2xl 18px`. Buttons `rounded-lg`, cards `rounded-xl`, badges `rounded-full`.
- Spacing uses the default Tailwind scale; standard component rhythm `p-4`/`p-6`, table cells `px-4 py-3`, section gaps `space-y-6`.
- Mobile bottom nav exists on the landing page only; app surfaces use the mobile header + drawer. Toast offset `bottom-20 md:bottom-4` clears both.
- PWA safe areas: header `padding-top: env(safe-area-inset-top)`; nav `padding-bottom: env(safe-area-inset-bottom)`; `pb-safe` utility.

## Elevation & Depth

- Card: `border-border bg-card shadow-sm` (rest) → `transition-all` hover.
- Button primary: `shadow-md`, hover `shadow-lg shadow-primary/20`.
- Glass: `.glass-card` `rgba(17,24,39,0.8)` + `backdrop-blur(16px) saturate(180%)` + border `rgba(30,41,59,0.6)` + `0 10px 40px -10px rgba(0,0,0,0.4)`.
- Glow: `--shadow-glow 0 0 20px rgba(52,211,153,0.15)` and `--shadow-glow-lg 0 0 40px rgba(52,211,153,0.2)` — used on primary emphasis (active nav bar, hero).
- Motion: `--ease-spring cubic-bezier(0.34,1.56,0.64,1)`, `--ease-smooth cubic-bezier(0.4,0,0.2,1)`; registered animations `fade-in`, `slide-up`, `slide-in-right`, `scale-in`, `pulse-soft`, `shimmer` (utilities `animate-*`). Dialogs/menus use zoom/slide Radix animations.

## Shapes

- Buttons, inputs, tables, cards: rounded rectangles per radius scale above.
- Badges/status chips: `rounded-full`.
- Avatar: `rounded-full`; icon tiles (`CategoryIconTile`, admin role tiles): `rounded-2xl` with `ring-1 ring-white/5`.
- OrgSwitcher trigger: full-width `bg-muted rounded-lg`; its panel opens upward (`absolute bottom-full`), `rounded-lg`.
- Admin tab bar: `bg-muted rounded-xl p-1.5` with active tab as `bg-card shadow-sm` pill + `h-0.5 w-8 bg-primary` underline dot.

## Components

Behavioral contract for the Org Admin surfaces. Visual specs here; interaction details in EXPERIENCE.md.

- **OrgSwitcher** (existing): full-width `bg-muted rounded-lg` trigger with Building2 icon, org name + role subtext, rotating ChevronDown. Panel opens upward, `max-h-64 overflow-y-auto`, active org = `bg-primary/10 text-primary` + emerald dot. Hidden when ≤1 membership; **never rendered for `super_admin`** (they are pinned to `/admin`).
- **Roster table** (new): standard `Table` (hover rows `hover:bg-muted/50`); columns Member / Email / Role (chip) / Member since / Status (badge) / row menu (`DropdownMenu`). Mobile: card-list fallback per the admin Users pattern.
- **Invite pending list** (new): rows with email, status badge, expiry, and inline actions Revoke / Resend rendered as `Button variant="outline" size="sm"`.
- **Requests queue** (new, `/admin`): card-per-request list (name, business, email, date) with an Approve flow in a `Dialog` (plan `Select` + "Assign as Org Admin" checkbox) and a Reject action (inline confirm). Uses existing Dialog/Table/Button vocabulary.
- **Plans editor** (new, `/admin`): table of plans with price inputs (number, cents) and a Save row action; status badge on per-org subscription rows in Clients.
- **Audit log** (new, `/admin` + org Members? — read-only): filter bar (`Select` actor/action/org + date range) + `Table`, newest-first; monospace timestamps.
- **No-access state** (new route): centered `EmptyState`-style block with Building2/ShieldAlert icon, "You don't have access to this workspace", and a "Back to login" action.
- All else (Button, Card, Input, Badge, Dialog, DropdownMenu, Table, Skeleton, Toast, Avatar, EmptyState, ErrorState, PageLoader) unchanged.

## Do's and Don'ts

- **Do** use emerald for the one primary action per surface; indigo for secondary emphasis; destructive red only for destructive actions.
- **Do** reuse `EmptyState` / `ErrorState` / `PageLoader` — never inline ad-hoc empty/error blocks.
- **Do** keep money `tabular-nums`, badges `rounded-full`, dialogs `max-w-lg` (confirm `max-w-md`).
- **Do** gate destructive actions behind a confirm dialog that states "This action cannot be undone."
- **Don't** introduce new hex colors or the deprecated Material tokens (`on-surface*`, `surface-container*`, `outline-variant`).
- **Don't** put a primary action on a `muted` background at reduced contrast; primary buttons stay `bg-primary`.
- **Don't** build new floating menus by hand — use `DropdownMenu`/`Dialog` (Radix) for accessibility.
- **Don't** reuse the landing-page bottom nav inside the app.
