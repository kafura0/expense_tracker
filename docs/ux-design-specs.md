# Ledgerly — UX Design Specifications

**Author:** Sally, UX Designer
**Date:** 2026-07-26
**Status:** Living Document — updated as design debt is addressed

---

## Table of Contents

1. [Design System Review](#1-design-system-review)
2. [Page-by-Page UX Specs](#2-page-by-page-ux-specs)
3. [Component Library Gaps](#3-component-library-gaps)
4. [Mobile Experience Specs](#4-mobile-experience-specs)
5. [Accessibility Specs (WCAG 2.1 AA)](#5-accessibility-specs-wcag-21-aa)
6. [Animation / Transition Specs](#6-animation--transition-specs)
7. [Empty State Specs](#7-empty-state-specs)
8. [Error State Specs](#8-error-state-specs)
9. [Typography Scale](#9-typography-scale)
10. [Color System](#10-color-system)

---

## 1. Design System Review

### 1.1 Design Tokens (Current State)

All tokens are defined in `globals.css` via CSS custom properties and mapped into Tailwind v4 via `@theme inline`.

| Token Category | Tokens | Tailwind Mapping |
|---|---|---|
| **Background** | `--background: #0a0f1e` | `bg-background` |
| **Foreground** | `--foreground: #e2e8f0` | `text-foreground` |
| **Card** | `--card: #111827` | `bg-card` |
| **Primary** | `--primary: #34d399` (emerald) | `text-primary`, `bg-primary` |
| **Secondary** | `--secondary: #818cf8` (indigo) | `text-secondary`, `bg-secondary` |
| **Muted** | `--muted: #1e293b` | `bg-muted` |
| **Muted FG** | `--muted-foreground: #94a3b8` | `text-muted-foreground` |
| **Destructive** | `--destructive: #f87171` | `bg-destructive`, `text-destructive` |
| **Border** | `--border: #1e293b` | `border-border` |
| **Ring** | `--ring: #34d399` | `ring-ring` |
| **Sidebar** | `--sidebar: #0f172a` | `bg-sidebar` |
| **Sidebar Primary** | `--sidebar-primary: #34d399` | `text-sidebar-primary` |

**Shadow tokens:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-glow`, `--shadow-glow-lg`
**Easing tokens:** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, `--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)`

#### Token Issues to Fix

| Issue | Location | Fix |
|---|---|---|
| `--muted` and `--border` share identical value `#1e293b` | `globals.css:15,23` | Consider differentiating: `--border: #1c2639` for subtler contrast |
| `--accent` same as `--muted` | `globals.css:18` | Not harmful but redundant — consider removing or repurposing for hover states |
| Surface container tokens defined but underutilized | `globals.css:40-48` | Use `bg-surface-container` for card interiors, `bg-surface-container-high` for elevated panels |
| No light-mode palette defined | `globals.css:5` | Add `@media (prefers-color-scheme: light)` block or `.light` class overrides |

### 1.2 Component Inventory

| Component | File | Variants | Status |
|---|---|---|---|
| **Button** | `shared/ui/button.tsx` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` × `default`, `sm`, `lg`, `xl`, `icon` | ✅ Complete. Includes `loading` prop with spinner, `asChild` via Radix Slot |
| **Card** | `shared/ui/card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | ✅ Complete. Standard shadcn/ui pattern |
| **Input** | `shared/ui/input.tsx` | Base + `error` boolean + `icon` slot | ⚠️ Missing: `helperText`, `label`, `suffix` props |
| **Badge** | `shared/ui/badge.tsx` | `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info` | ✅ Complete |
| **Dialog** | `shared/ui/dialog.tsx` | Radix Dialog primitive | ✅ Complete. Uses `animate-in`/`animate-out` |
| **Toast** | `shared/ui/toast.tsx` | `default`, `success`, `error`, `warning`, `info` | ⚠️ No undo action support, no queue limit, fixed 4s timeout |
| **Skeleton** | `shared/ui/skeleton.tsx` | Single variant, shimmer animation | ✅ Complete |
| **EmptyState** | `shared/ui/empty-state.tsx` | Icon + title + description + optional action | ✅ Complete |
| **DropdownMenu** | `shared/ui/dropdown-menu.tsx` | Radix DropdownMenu | ✅ Exists |
| **Table** | `shared/ui/table.tsx` | Standard HTML table wrapper | ✅ Exists |
| **Avatar** | `shared/ui/avatar.tsx` | Radix Avatar | ✅ Exists |
| **ErrorState** | `shared/ui/error-state.tsx` | Error display | ✅ Exists |

### 1.3 Pattern Analysis

**Strengths:**
- Consistent use of `rounded-xl` / `rounded-2xl` for cards, `rounded-lg` for buttons/inputs
- `glass-card` utility class provides premium glassmorphism effect
- `emerald-drop` and `emerald-glow` utility classes for branded shadows
- Sidebar navigation has consistent active-state indicator (left green bar + glow)
- PWA safe-area insets handled via `@supports (padding: env(safe-area-inset-top))`

**Weaknesses:**
- No consistent `Select` component — native `<select>` used in Settings and Admin pages with unstyled appearance
- No `Checkbox`, `Switch`, `RadioGroup`, or `Toggle` components
- No `Tooltip` component
- No `Popover` component
- No `Slider` / `Range` component
- No consistent form layout wrapper (Label + Input + HelperText + Error)

---

## 2. Page-by-Page UX Specs

### 2.1 Landing Page (`/` — `src/app/page.tsx`)

**Current State:** Full marketing landing page with hero, features, how-it-works, teams, pricing, CTA, and footer sections.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Hero** | Gradient text, pulsing dots, glass mockup | Hero mockup is a static placeholder (line 270-279) | Replace with real dashboard screenshot or animated Lottie |
| **Scroll tracking** | JS `scrollY` → active nav highlight | Modifies DOM classes directly (imperative) | Refactor to Intersection Observer + React state |
| **Trusted By** | Fake company names: VERTEX, LINEAR, etc. | Deceptive social proof | Either use real logos or remove section entirely |
| **Pricing** | 3-tier with hardcoded values | "Contact Sales" links to `href="#"` (dead link) | Link to `/org-signup` or contact form |
| **CTA** | "Contact Sales" → `href="#"` | Dead link | Wire to `/request-access` |
| **Newsletter** | Email input in footer | No validation, no `type="email"`, no submit handler | Add `type="email"`, `required`, `pattern` attribute, form action |
| **Mobile bottom nav** | 4 tabs: Home, Features, Pricing, Settings | "Settings" icon (gear) links to `/login` — misleading | Replace with "Sign In" icon or "Get Started" CTA |
| **Mobile bottom nav** | Uses inline SVG icons | Inconsistent with Lucide icons used elsewhere | Switch to Lucide `Home`, `BookOpen`, `DollarSign`, `LogIn` |
| **Footer social** | GitHub, Twitter, LinkedIn | No `aria-label` on social links | Add `aria-label="GitHub"`, `aria-label="Twitter"`, `aria-label="LinkedIn"` |
| **"See How It Works"** | `<Link href="#features">` | Misleading — not a video/demo | Either add a demo video or relabel to "Explore Features" |

**Responsive Breakpoints (current):**
- `sm:` (640px) — "Sign In" link visible, button row horizontal
- `md:` (768px) — Hero text scales, nav visible, footer columns
- `lg:` (1024px) — Larger display text

**Missing Breakpoint Coverage:**
- No `xl:` adjustments for ultra-wide monitors — content stretches to max-width container
- Hero mockup hidden on `sm` breakpoint (`hidden sm:block`) — mobile users see no visual

### 2.2 Dashboard Layout (`(dashboard)/layout.tsx`)

**Current State:** Sidebar (desktop) + slide-in drawer (mobile) + top header (mobile) + main content area.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Desktop sidebar** | Fixed `w-64`, `hidden md:flex` | Good. Active indicator is a `h-6 w-[3px]` green bar | ✅ No changes needed |
| **Mobile overlay** | `bg-black/60 backdrop-blur-sm` | `mobileOpen` → `document.body.style.overflow = 'hidden'` | Good pattern — scroll lock applied |
| **Mobile header** | Hamburger + logo + avatar | Avatar is not tappable to profile — just decorative | Make avatar a Link to `/settings` |
| **OrgSwitcher** | Renders inside sidebar | No fallback for solo users without org | Show user name/org name without switcher when `activeOrg` is null |
| **Role badges** | Color-coded: purple (admin), blue (manager), slate (client) | `super_admin` shows in sidebar but role labels missing `solo` | Add `solo: 'Solo User'` to `roleLabels` map |
| **Logout button** | `<form action={logout}>` with submit button | No confirmation dialog | Add a `ConfirmDialog` before logout |
| **Nav items** | Dashboard, Expenses, Settings, Admin | Missing: Reports, Categories (these pages exist but aren't in nav) | Add to `baseNavItems`: `{ href: '/reports', label: 'Reports', icon: BarChart3 }`, `{ href: '/categories', label: 'Categories', icon: Tag }` |
| **Sidebar sections** | Single "Navigation" label | Consider grouping | Add section headers: "Main" (Dashboard, Expenses) and "Analysis" (Reports, Categories) |

### 2.3 Dashboard Page (`/dashboard`)

**Current State:** Clean widget-based layout with KPI cards, charts, activity, insights, tax/currency summaries.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Page title** | `<h2 className="sr-only">` | No visible heading | Add a visible page heading: `<h1 className="font-headline text-2xl font-bold">Dashboard</h1>` above the KPI section |
| **Section headings** | All `sr-only` | Screen-reader only — no visual hierarchy for sighted users | Add visible section headings or use larger font for widget titles |
| **Grid layout** | `grid-cols-1 lg:grid-cols-2` and `grid-cols-1 lg:grid-cols-3` | Good responsive grid | ✅ No changes needed |
| **KPI cards** | Loading: `KpiCards` skeleton | Component handles its own loading | ✅ Delegated to widget |
| **Widget gap** | `gap-6` | Consistent spacing | ✅ Good |
| **Date range** | Not visible on page | No way to filter dashboard by time period | Add a date range picker at the top: `Last 7 days | This Month | This Quarter | This Year` |

### 2.4 Expenses Page (`/expenses`)

**Current State:** Full CRUD with filter bar, stats cards, data table, dialog for add/edit.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Header** | Title + "Add Expense" button | Button has `shadow-md shadow-primary/20` — nice depth | ✅ Good |
| **Stats cards** | Total Amount, Total Records, Average | Computed from current page data only (line 91-101) | Stats should reflect ALL expenses, not just current page. Fix `useMemo` to use `data?.total` for counts |
| **Stats card icons** | TrendingUp (total), Receipt (count), Calculator (avg) | `ArrowDownRight` used for "no org" and "error" states — wrong icon | Use `AlertCircle` or `Search` for error, `Building` for no-org |
| **Filter component** | `<ExpenseFilters>` | Rendered but not collapsible | Consider a collapsible filter panel with "X filters active" badge |
| **Empty state (no org)** | Generic icon + "No organization selected" | Helpful but could link to org creation | Add action: "Create Organization" → `/org-signup` |
| **Error state** | "Failed to load expenses" | No retry button | Add `<Button variant="outline" onClick={() => refetch()}>Retry</Button>` |
| **Sort indicators** | Click to sort by date/amount | No visual arrow showing current sort direction | Add `ArrowUp`/`ArrowDown` icons next to sortable column headers |
| **Delete** | Toast "Expense deleted. Click Undo to restore." | No actual undo button rendered in toast | Implement undo action in toast: `toast('Deleted', 'default', { action: { label: 'Undo', onClick: undoFn } })` |
| **Pagination** | `page` state + `onPageChange` | Page controls inside `ExpenseTable` — need to verify component renders them | Ensure table shows page numbers + prev/next at bottom |
| **Mobile table** | `ExpenseTable` handles its own responsive | Verify table has card-view on mobile | Add specification: on screens `< md`, render expenses as stacked cards, not a table |

### 2.5 Reports Page (`/reports`)

**Current State:** Static mock data — summary cards, monthly bar chart (CSS-based), top categories progress bars.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Data source** | Hardcoded `summaryCards`, `monthlyData`, `topCategories` arrays | All data is fake | Wire to real data from Supabase queries |
| **`hasData` state** | `const [hasData] = useState(true)` | Always true — empty state never renders | Connect to real data length check |
| **Monthly overview** | CSS bar chart with `style={{ width }}` | Not a real chart — bars don't show income vs expense ratio well | Replace with Recharts `BarChart` for proper interactive chart |
| **Top Categories** | Horizontal progress bars | Missing legend, no click-through | Add click → navigate to filtered expenses by category |
| **Date range toggle** | Week / Month / Quarter / Year | No visual indicator of selected state beyond background color | Current implementation is fine — uses `bg-background shadow-sm` |
| **Export button** | `<Button variant="outline">Export</Button>` | No export functionality wired | Implement CSV/PDF export with `react-csv` or similar |
| **Page title** | `text-3xl` | Inconsistent with Expenses page (`text-2xl`) | Standardize all dashboard page headings to `text-2xl font-bold` |

### 2.6 Categories Page (`/categories`)

**Current State:** Category cards with budget progress bars, summary stats at top.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Data source** | `defaultCategories` hardcoded in component | Not connected to Supabase | Wire to real categories table |
| **Add Category** | `<Button>` with no `onClick` | Button does nothing | Implement `CategoryDialog` for create/edit |
| **Empty state** | `<EmptyState>` with `onClick: () => {}` | Dead action | Wire to open CategoryDialog |
| **Budget progress bar** | Color changes: green → orange (>80%) → amber (100%) → red (over) | Good semantic coloring | ✅ Good pattern |
| **"Over" / "At Limit" badges** | `<Badge variant="destructive">` and `<Badge variant="warning">` | Good use of semantic variants | ✅ Good |
| **Page title** | `text-3xl` | Inconsistent with Expenses page | Standardize to `text-2xl` |
| **Card hover** | `hover:shadow-md hover:shadow-primary/5` | Subtle and premium | ✅ Good |
| **Missing: edit/delete** | No way to edit or delete categories | Category management incomplete | Add context menu or icon buttons on each card for edit/delete |

### 2.7 Settings Page (`/settings`)

**Current State:** Profile, Currency & Region, VAT Settings, Danger Zone sections.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Page title** | `text-2xl` | Consistent with expenses | ✅ Good |
| **Avatar upload** | Hover overlay with camera icon | Works but `ring-2 ring-border` on avatar could use `ring-border` from theme | ✅ Fine |
| **Email field** | Fabricated from display name: `displayName.toLowerCase().replace(/\s/g, '.') + '@email.com'` | Misleading — shows fake email | Show actual user email from Supabase auth, make read-only |
| **Role field** | `<Badge variant="secondary">Member</Badge>` | Always shows "Member" | Pull real role from org membership |
| **Theme select** | Native `<select>` element | Unstyled native element — looks out of place | Replace with custom `Select` component matching design system |
| **Currency select** | Native `<select>` with flag emoji prefix | Works but native styling inconsistent | Replace with custom `Select` with flag + code + name display |
| **VAT Rate** | `<Input type="number">` with % suffix | Validation runs on every render via `validateVatRate()` | Good — inline validation. Add debounce to avoid visual flicker |
| **Danger Zone** | Delete Account button | No confirmation dialog | Must implement `<ConfirmDialog>` with typed confirmation before delete |
| **Save buttons** | Three separate save buttons (Profile, Preferences, VAT) | Confusing — user may not know which to click | Consolidate into one "Save All Changes" or clearly delineate sections with save per section |
| **"foreground-variant" class** | Used in VAT description text | Not a defined Tailwind class — may not render correctly | Replace with `text-muted-foreground` |

### 2.8 Admin Dashboard (`/admin`)

**Current State:** Tabbed admin panel with Users, Clients, Invites, Announcements, Messages.

| Area | Current | Issue | Fix |
|---|---|---|---|
| **Tab bar** | Custom pill-style tabs with active indicator | Good visual design | ✅ Good |
| **Tab overflow** | `overflow-x-auto` on tab container | Good for horizontal scroll on mobile | ✅ Good |
| **Users table** | Desktop: `<table>`, Mobile: card layout | Good responsive pattern | ✅ Good |
| **Client expand** | Accordion-style expand/collapse | `expandedOrg` state toggles visibility | ✅ Good interaction |
| **Announcement form** | `<textarea>` element | Native textarea — inconsistent styling | Wrap in a `Textarea` component matching design system |
| **Messages filters** | Native `<select>` elements | Inconsistent with design system | Replace with custom `Select` |
| **Invite form** | Inline email + role select + send button | Native `<select>` for role | Replace with custom `Select` |
| **Page title** | `text-2xl` | Consistent | ✅ Good |
| **Reply flow** | Inline input appears on "Reply" click | Good — stays in context | ✅ Good |
| **Confirmation** | No confirmation on suspend/activate | Destructive action without confirmation | Add `ConfirmDialog` for org status toggle |

---

## 3. Component Library Gaps

### 3.1 Missing Components (Priority Order)

| # | Component | Priority | Usage Locations | Implementation |
|---|---|---|---|---|
| 1 | **Select** | 🔴 Critical | Settings (theme, currency), Admin (filters, role), Expense filters | Build on Radix `@radix-ui/react-select`. Match `Input` styling: `h-10 rounded-lg border border-input bg-muted/50`. Add custom trigger with `ChevronDown` icon. |
| 2 | **Textarea** | 🔴 High | Admin announcements, expense notes | Build as styled `<textarea>` matching `Input` visual: `rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm`. Add `error`, `helperText`, `maxLength` props. |
| 3 | **Checkbox** | 🟡 Medium | Expense filters (tax_applicable), bulk select in table | Build on Radix `@radix-ui/react-checkbox`. Custom check icon using Lucide `Check`. |
| 4 | **Switch / Toggle** | 🟡 Medium | Settings (dark mode toggle), expense tax toggle | Build on Radix `@radix-ui/react-switch`. Animated knob with `transition-all duration-200`. |
| 5 | **Tooltip** | 🟡 Medium | Sidebar icons (when collapsed), KPI card info, icon buttons | Build on Radix `@radix-ui/react-tooltip`. Dark bg with emerald accent arrow. |
| 6 | **ConfirmDialog** | 🟡 Medium | Delete account, logout, org suspension, expense delete | Extend `Dialog` with pre-configured `destructive` Button and warning text. |
| 7 | **Popover** | 🟢 Low | Date picker anchor, filter dropdowns | Build on Radix `@radix-ui/react-popover`. Match `Dialog` visual weight. |
| 8 | **DatePicker** | 🟢 Low | Expense date field, report date range | Build on `react-day-picker` + `Popover`. Dark theme calendar grid. |
| 9 | **Slider** | 🟢 Low | VAT rate input (visual alternative), budget allocation | Build on Radix `@radix-ui/react-slider`. Emerald track, white thumb. |
| 10 | **Command / Search** | 🟢 Low | Global search (Cmd+K), expense search | Build on `cmdk` library. Filterable list with keyboard navigation. |

### 3.2 Component Enhancement Requests

| Component | Enhancement | Spec |
|---|---|---|
| **Input** | Add `helperText` prop | `<p className="text-xs text-muted-foreground mt-1">{helperText}</p>` below input |
| **Input** | Add `label` prop | `<label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>` above input |
| **Input** | Add `suffix` prop | Right-side icon/text like the `%` in VAT rate input. `absolute right-3 top-1/2 -translate-y-1/2` |
| **Button** | Add `leftIcon` prop | Icon before children, currently only gap-2 handles this implicitly |
| **Toast** | Add `action` prop | Render a secondary button inside toast: `<button className="text-primary font-medium text-sm hover:underline">{action.label}</button>` |
| **Toast** | Add `duration` prop | Allow override of default 4000ms timeout |
| **Toast** | Limit concurrent toasts | Max 3 visible, queue the rest |
| **EmptyState** | Add `illustration` prop | Support SVG illustration or Lottie animation alongside icon |
| **Badge** | Add `size` prop | `sm` (smaller text/padding for table cells), `lg` (for prominent status) |

---

## 4. Mobile Experience Specs

### 4.1 Responsive Breakpoints

| Breakpoint | Width | Usage |
|---|---|---|
| Default | `< 640px` | Mobile phones (portrait) |
| `sm:` | `≥ 640px` | Mobile phones (landscape), small tablets |
| `md:` | `≥ 768px` | Tablets, sidebar appears |
| `lg:` | `≥ 1024px` | Desktop, 2-column grids |
| `xl:` | `≥ 1280px` | Large desktop, 3-column grids |

### 4.2 Touch Target Specifications

All interactive elements must meet minimum 44×44px touch target (WCAG 2.5.8):

| Element | Current Size | Minimum Required | Fix |
|---|---|---|---|
| Sidebar nav items | `py-2.5` + icon + text ≈ 40px | 44px | Increase to `py-3` |
| Mobile hamburger button | `p-2 -ml-2` → ~40px | 44px | Increase to `p-2.5` or add min-h/min-w |
| Toast dismiss button | `h-4 w-4` (16px icon) | 44px tap area | Wrap in `p-2.5 rounded-lg` |
| Mobile bottom nav (landing) | `px-3 py-1.5` ≈ 36px | 44px | Increase to `py-2.5` |
| Pagination buttons | Inside ExpenseTable | 44px | Verify table pagination buttons are ≥ 44px |
| Admin tab buttons | `px-3 py-2.5` ≈ 40px | 44px | Increase to `py-3` |
| Delete/Action buttons in table rows | `h-7 text-xs` | 44px | Wrap in container with min-height |

### 4.3 Mobile Layout Patterns

**Dashboard Layout (mobile):**
- Hamburger menu → slide-in sidebar overlay (already implemented)
- Top bar: hamburger + logo + avatar (already implemented)
- No bottom tab bar for dashboard pages (only landing page has one)

**Landing Page (mobile):**
- Bottom fixed nav with 4 tabs (already implemented)
- `pb-24 md:pb-0` on main content to account for bottom nav (already implemented)

**Table → Card Conversion (expenses, admin):**
- On `< md`, tables should render as stacked cards
- Card layout: full-width with clear section separators
- Actions (edit, delete) should be accessible via swipe or overflow menu

### 4.4 Mobile Gesture Specs

| Gesture | Location | Behavior |
|---|---|---|
| **Swipe left on expense row** | Expense table | Reveal delete action (red background) |
| **Pull to refresh** | Dashboard, Expenses list | Trigger `queryClient.invalidateQueries()` |
| **Tap outside** | Modal/Dialog overlay | Close dialog (already implemented via Radix) |
| **Back button** | Android | Navigate back in history (browser default) |

### 4.5 PWA Considerations

- Safe area insets handled via `pb-safe` class: `padding-bottom: calc(8px + env(safe-area-inset-bottom))`
- `env(safe-area-inset-top)` applied to `<header>` elements
- Manifest and service worker should be configured for offline support of cached pages

---

## 5. Accessibility Specs (WCAG 2.1 AA)

### 5.1 Color Contrast Checklist

| Element | Foreground | Background | Ratio | Required | Status |
|---|---|---|---|---|---|
| Body text | `#e2e8f0` | `#0a0f1e` | 14.6:1 | 4.5:1 | ✅ Pass |
| Muted text | `#94a3b8` | `#0a0f1e` | 7.1:1 | 4.5:1 | ✅ Pass |
| Primary text (on dark) | `#34d399` | `#0a0f1e` | 10.8:1 | 4.5:1 | ✅ Pass |
| Primary on primary-bg | `#022c22` | `#34d399` | 10.8:1 | 4.5:1 | ✅ Pass |
| Destructive text | `#f87171` | `#0a0f1e` | 5.1:1 | 4.5:1 | ✅ Pass |
| Muted text on card | `#94a3b8` | `#111827` | 5.7:1 | 4.5:1 | ✅ Pass |
| **Badge success text** | `#34d399` (emerald-400) | `rgba(16,185,129,0.15)` | ⚠️ Variable | 4.5:1 | ⚠️ Test with actual bg |
| **Badge warning text** | `#fbbf24` (amber-400) | `rgba(245,158,11,0.15)` | ⚠️ Variable | 4.5:1 | ⚠️ Test with actual bg |

### 5.2 Keyboard Navigation

| Requirement | Status | Notes |
|---|---|---|
| All interactive elements focusable | ✅ | `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background` globally applied |
| Focus order follows DOM | ✅ | Radix components handle this |
| Skip to main content link | ❌ Missing | **Must add:** `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>` at top of layout |
| Escape closes dialogs | ✅ | Radix Dialog handles this |
| Arrow keys navigate dropdowns | ✅ | Radix DropdownMenu handles this |
| Tab through sidebar nav | ✅ | Natural tab order |
| Tab through expense table actions | ✅ | Buttons are in tab order |

### 5.3 ARIA Requirements

| Pattern | Requirement | Implementation |
|---|---|---|
| Page headings | One `h1` per page | ⚠️ Dashboard uses `sr-only` h2 — add visible `h1` |
| Landmark regions | `<main>`, `<nav>`, `<header>` | ✅ Layout uses semantic elements |
| Button labels | All buttons have accessible names | ⚠️ Icon-only buttons (hamburger, close) need `aria-label` |
| Image alt text | All images have alt or are decorative | ⚠️ Avatar `<img>` has `alt="Avatar"` — should be `alt={userName}'s avatar'` |
| Live regions | Dynamic content updates announced | ⚠️ Toast notifications should use `role="status"` or `aria-live="polite"` |
| Form labels | All inputs have associated labels | ⚠️ Settings page uses `<label>` elements but not `htmlFor`/`id` pairing |
| Table semantics | Tables use `<th>` with `scope` | ⚠️ Admin users table uses `<th>` but missing `scope="col"` |

### 5.4 Accessibility Fix Priority

1. **Add skip-to-content link** to `(dashboard)/layout.tsx` and `page.tsx`
2. **Add `aria-label`** to all icon-only buttons (hamburger, close, social links)
3. **Add `role="status"` and `aria-live="polite"`** to toast container
4. **Add `scope="col"`** to all `<th>` elements in admin table
5. **Fix form label associations** with `htmlFor`/`id` pairs
6. **Add `aria-current="page"`** to active sidebar nav link
7. **Test all badge success/warning variants** for contrast — adjust opacity if needed

---

## 6. Animation / Transition Specs

### 6.1 Existing Animation Library

All defined in `globals.css`:

| Animation | Keyframes | Duration | Easing | Class |
|---|---|---|---|---|
| `fade-in` | opacity 0→1, translateY 8px→0 | 400ms | `var(--ease-smooth)` | `.animate-fade-in` |
| `slide-up` | opacity 0→1, translateY 16px→0 | 500ms | `var(--ease-smooth)` | `.animate-slide-up` |
| `slide-in-right` | opacity 0→1, translateX 16px→0 | 400ms | `var(--ease-smooth)` | `.animate-slide-in-right` |
| `slide-in-left` | translateX -100%→0 | 300ms | ease-out | `.animate-[slide-in-left_0.3s_ease-out]` |
| `scale-in` | opacity 0→1, scale 0.95→1 | 300ms | `var(--ease-spring)` | `.animate-scale-in` |
| `pulse-soft` | opacity 1→0.6→1 | 2000ms | ease-in-out | `.animate-pulse-soft` |
| `shimmer` | background-position -200%→200% | 2000ms | linear | `.animate-shimmer` |

**Stagger delays:** `delay-75` (75ms), `delay-150` (150ms), `delay-200` (200ms), `delay-300` (300ms), `delay-400` (400ms)

### 6.2 Transition Specs by Element

| Element | Property | Duration | Easing | Notes |
|---|---|---|---|---|
| **Button hover** | `all` | 200ms | `var(--ease-smooth)` | Already via `transition-all duration-200` |
| **Button active** | `scale` | 100ms | `var(--ease-spring)` | `active:scale-[0.98]` |
| **Card hover** | `shadow`, `transform` | 200ms | default | `hover:shadow-md transition-shadow duration-200` |
| **Card hover (landing)** | `transform`, `shadow`, `border` | 300ms | default | `hover:-translate-y-1 hover:shadow-lg hover:border-primary/30` |
| **Input focus** | `border`, `ring` | 200ms | default | `transition-all duration-200` on input |
| **Sidebar nav** | `background`, `color` | 200ms | default | `transition-all duration-200` |
| **Sidebar active bar** | `width`, `opacity` | — | — | Appears/disappears instantly (acceptable) |
| **Dialog overlay** | `opacity` | 200ms | default | `animate-in`/`animate-out` via Radix |
| **Dialog content** | `opacity`, `scale`, `translate` | 200ms | default | `zoom-in-95`/`zoom-out-95` via Radix |
| **Toast** | `opacity`, `translateX` | 400ms | `var(--ease-smooth)` | `animate-slide-in-right` |
| **Progress bars** | `width` | 500ms | default | `transition-all duration-500` on category/reports bars |
| **Mobile sidebar** | `translateX` | 300ms | ease-out | `animate-[slide-in-left_0.3s_ease-out]` |

### 6.3 Page Transition Spec

Currently: **None.** Pages swap instantly on navigation.

**Recommended:** Add a subtle page-enter animation to `(dashboard)/layout.tsx`:

```tsx
// Wrap {children} in:
<div key={pathname} className="animate-fade-in">
  {children}
</div>
```

This provides a 400ms fade-up on every route change. Keep it subtle — no exit animation needed.

### 6.4 Loading State Animations

| State | Current | Recommended |
|---|---|---|
| **Page loading** | Spinner: `animate-spin rounded-full h-8 w-8 border-b-2 border-primary` | ✅ Good. Consider adding "Loading..." text for screen readers |
| **Skeleton** | `animate-shimmer` (gradient sweep) | ✅ Good. Duration 2s is appropriate |
| **Button loading** | SVG spinner inside button | ✅ Good. `disabled` prop prevents double-clicks |
| **Query refetching** | No visual indicator | Add subtle skeleton overlay or opacity reduction on refetching content |

### 6.5 Micro-Interaction Specs

| Interaction | Spec |
|---|---|
| **Expense row hover** | `hover:bg-muted/50 transition-colors duration-150` |
| **Nav item hover** | `hover:bg-sidebar-accent/50 hover:text-sidebar-foreground` with 200ms |
| **Pricing card hover (landing)** | `hover:-translate-y-1 hover:shadow-lg hover:border-primary/30` with 300ms |
| **Feature card icon hover** | No specific hover — add `group-hover:scale-110 transition-transform duration-200` on icon |
| **Mobile sidebar overlay** | `bg-black/60 backdrop-blur-sm` fade in 300ms |

---

## 7. Empty State Specs

### 7.1 Current Empty States

| Page | Icon | Title | Description | Action |
|---|---|---|---|---|
| Reports (no data) | `BarChart3` | "No reports available" | "Start tracking your expenses to see detailed reports and spending insights." | "Add Expense" → `/expenses` |
| Categories (no data) | `ShoppingCart` | "No categories yet" | "Create your first category to start tracking your budget by spending area." | "Add Category" → `onClick: () => {}` ⚠️ Dead |
| Admin Users (no search) | `Users` | "No users found" | "No users match your search criteria" | None |
| Admin Users (no users) | `Users` | "No users found" | "No users have been onboarded yet" | None |
| Admin Clients | `Building2` | "No clients yet" | "Organizations will appear here once they have been onboarded" | None |
| Admin Announcements | `Megaphone` | "No announcements yet" | "Create your first announcement using the form above" | None |
| Admin Messages | `MessageSquare` | "No messages found" | "No messages match the current filters" | None |
| Expenses (no org) | `ArrowDownRight` | "No organization selected" | "Please switch to an organization to view expenses." | None |

### 7.2 Empty State Design Spec

Every empty state should follow this structure:

```
┌─────────────────────────────────────┐
│                                     │
│         [Illustration/Icon]         │  ← 64×64 container, rounded-2xl, bg-muted/50
│                                     │
│          [Title Text]               │  ← text-lg font-semibold text-foreground
│                                     │
│      [Description Text]             │  ← text-sm text-muted-foreground max-w-sm
│                                     │
│        [Action Button]              │  ← Primary Button with clear CTA
│                                     │
└─────────────────────────────────────┘
```

### 7.3 Missing Empty States to Add

| Location | Scenario | Title | Description | Action |
|---|---|---|---|---|
| Dashboard | No expenses yet | "Welcome to Ledgerly" | "Start by adding your first expense to see your financial overview come to life." | "Add Your First Expense" → `/expenses` |
| Expenses | 0 results after filtering | "No expenses match filters" | "Try adjusting your search or filter criteria." | "Clear Filters" → reset filters |
| Reports | No data for selected period | "No data for this period" | "There are no recorded expenses in the selected date range." | "Expand Date Range" |
| Categories | Category with 0 expenses | "No spending yet" | "This category has no recorded expenses. Start tracking to see your budget progress." | "Add Expense" → `/expenses` |
| Settings | No avatar | "No avatar set" | Use the existing initial-letter fallback — no empty state needed | N/A |

### 7.4 Illustration Recommendations

For premium feel, replace Lucide icon-only empty states with custom SVG illustrations:

- **Dashboard welcome:** Animated wallet with floating coins (Lottie)
- **No expenses:** Receipt with magnifying glass
- **No categories:** Grid of colorful shapes
- **No reports:** Bar chart with upward arrow

Keep the existing `EmptyState` component but add an optional `illustration` slot:

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode
  illustration?: React.ReactNode  // NEW: larger SVG/Lottie
  title: string
  description: string
  action?: { label: string; href?: string; onClick?: () => void }
}
```

---

## 8. Error State Specs

### 8.1 Current Error States

| Location | Pattern | Message | Recovery |
|---|---|---|---|
| Expenses fetch error | Icon + text block | "Failed to load expenses" / "Please try again later." | None — no retry |
| Toast errors | Toast notification | Dynamic message from server | Auto-dismiss after 4s |
| Settings save error | Toast | `error.message` from mutation | Auto-dismiss after 4s |
| VAT validation | Inline text | "VAT rate cannot be negative" / "cannot exceed 100%" | Inline fix |
| Name validation | Inline text | "Display name is required" / "must be at least 2 characters" | Inline fix |
| Admin toggle error | Toast | `e.message` from mutation | Auto-dismiss after 4s |
| Invite error | Inline text below form | Dynamic error message | Fix and retry |

### 8.2 Error State Design Spec

**Pattern 1: Page-level error (fetch failure)**

```tsx
<div className="text-center py-16">
  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
    <AlertCircle className="h-8 w-8" />
  </div>
  <p className="text-base font-semibold text-foreground mb-1">Failed to load [resource]</p>
  <p className="text-sm text-muted-foreground mb-4">[Helpful description of what went wrong]</p>
  <div className="flex gap-3 justify-center">
    <Button variant="outline" onClick={retryFn}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Try Again
    </Button>
    <Button variant="ghost" onClick={() => router.push('/dashboard')}>
      Go to Dashboard
    </Button>
  </div>
</div>
```

**Pattern 2: Inline validation (form fields)**

```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-foreground" htmlFor="fieldName">Label</label>
  <Input id="fieldName" error={!!error} />
  {error && (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {error}
    </p>
  )}
</div>
```

**Pattern 3: Toast with action (destructive operations)**

```tsx
toast('Expense deleted', 'default', {
  action: {
    label: 'Undo',
    onClick: () => undoDelete(id),
  },
  duration: 10000, // Longer for undo-able actions
})
```

**Pattern 4: Error boundary (unhandled crashes)**

Add a global `error.tsx` at `src/app/error.tsx`:

```tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  )
}
```

### 8.3 Error Recovery Matrix

| Error Type | User Action | System Response |
|---|---|---|
| Network timeout | Click "Try Again" | Refetch with exponential backoff |
| 401 Unauthorized | None (automatic) | Redirect to `/login` with return URL |
| 403 Forbidden | None | Show "Access Denied" page |
| 404 Not Found | None | Show custom 404 page with nav |
| 500 Server Error | Click "Try Again" | Refetch + show toast "Still having trouble?" |
| Validation error | Fix field value | Clear error on input change ✅ (already implemented for name) |
| Rate limit | Wait | Show "Please wait X seconds" countdown |

---

## 9. Typography Scale

### 9.1 Font Families

| Token | Font Stack | Usage |
|---|---|---|
| `--font-sans` | Inter, Geist Sans, ui-sans-serif, system-ui | Body text, UI labels |
| `--font-headline` | Geist Sans, ui-sans-serif, system-ui | Page titles, card titles, nav items |
| `--font-mono` | Geist Mono, JetBrains Mono, ui-monospace | Code, tabular data |
| `--font-label-sm` | JetBrains Mono, ui-monospace | Uppercase labels, badges, step numbers |

### 9.2 Type Scale

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `text-display-lg` | 48px | 1.1 | 700 | Hero headline (landing) |
| `text-headline-lg` | 32px | 1.2 | 700 | Section headlines, large card titles |
| `text-headline-md` | 24px | 1.3 | 600 | Card titles, sidebar brand |
| `text-body-lg` | 18px | 1.6 | 400 | Hero subtitle, CTA text |
| `text-body-md` | 15px | 1.6 | 400 | Body text, descriptions |
| `text-label-sm` | 12px | 1.5 | 500 | Uppercase labels, nav labels, badges |

**Tailwind text size classes used in codebase:**
- `text-xs` (12px) — labels, helper text, timestamps
- `text-sm` (14px) — body text, input text, button text
- `text-base` (16px) — card titles, nav items
- `text-lg` (18px) — brand name, dialog titles
- `text-xl` (20px) — section headings
- `text-2xl` (24px) — page titles
- `text-3xl` (30px) — page titles (reports, categories — should standardize to 2xl)
- `text-[32px]` / `text-[40px]` / `text-[72px]` — hero responsive sizes

### 9.3 Typography Issues

| Issue | Location | Fix |
|---|---|---|
| Inconsistent page titles | Reports/Categories use `text-3xl`, Expenses/Settings use `text-2xl` | Standardize all to `text-2xl font-bold tracking-tight` |
| `font-headline` vs `font-sans` | Both use Geist Sans — they're identical | Consider using Inter for headlines to differentiate, or keep Geist for premium feel |
| Line height on descriptions | Inconsistent `leading-relaxed` vs default | Standardize descriptions to `leading-relaxed` (1.625) |
| Landing hero responsive sizes | `text-[32px] sm:text-[40px] md:text-display-lg lg:text-[72px]` | Good responsive scaling. The lg breakpoint jumps from 48px to 72px — consider `lg:text-[56px]` for smoother progression |

### 9.4 Font Weight Reference

| Weight | Value | Usage |
|---|---|---|
| Normal | 400 | Body text, descriptions |
| Medium | 500 | Labels, buttons, nav items |
| Semibold | 600 | Card titles, dialog titles |
| Bold | 700 | Page titles, brand name, KPI numbers |

---

## 10. Color System

### 10.1 Dark Mode Palette (Primary)

| Role | Hex | Tailwind Token | Usage |
|---|---|---|---|
| **Background** | `#0a0f1e` | `bg-background` | Page background |
| **Surface** | `#111827` | `bg-card` | Card backgrounds, elevated surfaces |
| **Surface variant** | `#1e293b` | `bg-muted` | Secondary surfaces, input backgrounds, borders |
| **Surface high** | `#334155` | `bg-surface-container-highest` | Hover states, scrollbar thumb |
| **Foreground** | `#e2e8f0` | `text-foreground` | Primary text |
| **Foreground muted** | `#94a3b8` | `text-muted-foreground` | Secondary text, descriptions |
| **Border** | `#1e293b` | `border-border` | All borders |

### 10.2 Brand Colors

| Role | Hex | Tailwind Token | Usage |
|---|---|---|---|
| **Primary** | `#34d399` | `text-primary`, `bg-primary` | CTA buttons, active indicators, links |
| **Primary container** | `#059669` | `bg-primary-container` | Primary badges, progress fills |
| **Primary foreground** | `#022c22` | `text-primary-foreground` | Text on primary backgrounds |
| **Secondary** | `#818cf8` | `text-secondary`, `bg-secondary` | Secondary actions, charts |
| **Secondary foreground** | `#e0e7ff` | `text-secondary-foreground` | Text on secondary backgrounds |
| **Secondary container** | `#4338ca` | `bg-secondary-container` | Secondary badges |
| **Tertiary** | `#fb923c` | `text-tertiary` | Accent, chart-3 |
| **Tertiary container** | `#ea580c` | `bg-tertiary-container` | Warning accents |

### 10.3 Semantic Status Colors

| Status | Foreground | Background (10% opacity) | Badge Class |
|---|---|---|---|
| **Success** | `#34d399` (emerald-400) | `rgba(52,211,153,0.15)` | `badge-variant-success` |
| **Warning** | `#fbbf24` (amber-400) | `rgba(245,158,11,0.15)` | `badge-variant-warning` |
| **Error** | `#f87171` (destructive) | `rgba(248,113,113,0.1)` | `badge-variant-destructive` |
| **Info** | `#38bdf8` (sky-400) | `rgba(56,189,248,0.15)` | `badge-variant-info` |

### 10.4 Chart Colors

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `chart-1` | `#34d399` | `fill-chart-1` | Primary data series (emerald) |
| `chart-2` | `#818cf8` | `fill-chart-2` | Secondary data series (indigo) |
| `chart-3` | `#fb923c` | `fill-chart-3` | Tertiary data series (orange) |
| `chart-4` | `#38bdf8` | `fill-chart-4` | Quaternary data series (sky) |
| `chart-5` | `#f472b6` | `fill-chart-5` | Quinary data series (pink) |

### 10.5 Sidebar Color System

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `sidebar` | `#0f172a` | `bg-sidebar` | Sidebar background |
| `sidebar-foreground` | `#e2e8f0` | `text-sidebar-foreground` | Sidebar text |
| `sidebar-primary` | `#34d399` | `text-sidebar-primary` | Active nav item, brand |
| `sidebar-accent` | `#1e293b` | `bg-sidebar-accent` | Hover background, role badges |
| `sidebar-border` | `#1e293b` | `border-sidebar-border` | Dividers |

### 10.6 Gradient System

| Gradient | CSS | Usage |
|---|---|---|
| **Hero** | `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(52,211,153,0.12), transparent 70%)` | Landing hero background |
| **Emerald drop** | `filter: drop-shadow(0 0 24px rgba(52,211,153,0.25))` | Primary CTA buttons |
| **Glass card** | `rgba(17,24,39,0.8)` + `backdrop-filter: blur(16px) saturate(180%)` | Premium card surfaces |
| **Surface elevated** | `linear-gradient(135deg, rgba(17,24,39,0.9), rgba(30,41,59,0.4))` | Elevated panels |

### 10.7 Shadow System

| Token | CSS | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle depth (buttons, badges) |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.3)` | Cards, floating elements |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.4)` | Dialogs, elevated cards |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.4)` | Modals, dropdowns |
| `shadow-glow` | `0 0 20px rgba(52,211,153,0.15)` | Active sidebar items, brand elements |
| `shadow-glow-lg` | `0 0 40px rgba(52,211,153,0.2)` | Primary CTA hover states |

### 10.8 Light Mode Spec (Future)

When light mode is implemented, the palette should invert:

| Token | Dark Value | Light Value |
|---|---|---|
| `--background` | `#0a0f1e` | `#ffffff` |
| `--foreground` | `#e2e8f0` | `#0f172a` |
| `--card` | `#111827` | `#f8fafc` |
| `--muted` | `#1e293b` | `#f1f5f9` |
| `--border` | `#1e293b` | `#e2e8f0` |
| `--primary` | `#34d399` | `#059669` (darker for contrast) |
| `--primary-foreground` | `#022c22` | `#ffffff` |
| `--muted-foreground` | `#94a3b8` | `#64748b` |

---

## Appendix: Implementation Priority

### Phase 1 — Critical (This Sprint)

1. Add `Select` component (Radix-based)
2. Add `Textarea` component
3. Add skip-to-content link (accessibility)
4. Add `aria-label` to all icon-only buttons
5. Fix sidebar nav — add Reports and Categories links
6. Fix Settings email field — show real email
7. Add retry button on Expenses error state
8. Standardize page heading sizes to `text-2xl`
9. Fix mobile bottom nav links (landing page)
10. Add `role="status"` to toast container

### Phase 2 — High (Next Sprint)

1. Wire Reports page to real data
2. Wire Categories page to real data
3. Add `ConfirmDialog` component for destructive actions
4. Add `Checkbox` component
5. Add `Switch` component
6. Add page transition animation
7. Implement expense table → card conversion on mobile
8. Fix stats on Expenses page (reflect all data, not current page)
9. Add date range picker to Dashboard
10. Implement undo action in delete toasts

### Phase 3 — Medium (Backlog)

1. Add `Tooltip` component
2. Add `Popover` component
3. Add `DatePicker` component
4. Replace native `<select>` in admin pages
5. Add custom SVG illustrations to empty states
6. Add light mode support
7. Implement pull-to-refresh on mobile
8. Add Command palette (Cmd+K)
9. Implement swipe-to-delete on expense rows
10. Add skeleton overlay on query refetch

---

*End of UX Design Specifications*
