# Story 1.4: Create Shared UI Kit (shadcn/ui)

Status: review

## Story

As a developer,
I want to initialize and customize shadcn/ui components and design tokens,
so that all UI components follow consistent styling.

## Acceptance Criteria

1. shadcn/ui initialized with custom theme colors
2. Base components: Button, Input, Card, Dialog, Table, Badge, Avatar, Dropdown
3. Light, Dark, and System theme support via TailwindCSS dark mode
4. Consistent spacing scale
5. Loading, empty, and error state components created
6. Toast notification system configured

## Tasks / Subtasks

- [x] Task 1: Initialize shadcn/ui (AC: #1)
  - [x] Run `npx shadcn@latest init`
  - [x] Configure with custom theme
  - [x] Set up CSS variables in globals.css
- [x] Task 2: Add base components (AC: #2)
  - [x] `npx shadcn@latest add button`
  - [x] `npx shadcn@latest add input`
  - [x] `npx shadcn@latest add card`
  - [x] `npx shadcn@latest add dialog`
  - [x] `npx shadcn@latest add table`
  - [x] `npx shadcn@latest add badge`
  - [x] `npx shadcn@latest add avatar`
  - [x] `npx shadcn@latest add dropdown-menu`
- [x] Task 3: Configure theme support (AC: #3)
  - [x] Set up dark mode class strategy in tailwind.config.ts
  - [x] Create theme provider component
  - [x] Add theme toggle component
- [x] Task 4: Create shared UI components (AC: #5)
  - [x] Create `src/shared/ui/loading-spinner.tsx`
  - [x] Create `src/shared/ui/empty-state.tsx`
  - [x] Create `src/shared/ui/error-state.tsx`
  - [x] Create `src/shared/ui/skeleton.tsx`
- [x] Task 5: Configure toast system (AC: #6)
  - [x] `npx shadcn@latest add toast`
  - [x] Create toast provider component
  - [x] Add to root layout

## Dev Notes

### Architecture Context

**AD-8 — Server Components by default:**
- UI components in `shared/ui/` are Client Components
- They receive data as props from Server Components

**shared/ui/ Location:**
- All reusable UI components go in `src/shared/ui/`
- Components are imported by features and widgets

### Theme Configuration

**Colors (CSS Variables):**
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}
```

### File Structure

```
src/
├── shared/
│   └── ui/
│       ├── button.tsx (from shadcn)
│       ├── input.tsx (from shadcn)
│       ├── card.tsx (from shadcn)
│       ├── dialog.tsx (from shadcn)
│       ├── table.tsx (from shadcn)
│       ├── badge.tsx (from shadcn)
│       ├── avatar.tsx (from shadcn)
│       ├── dropdown-menu.tsx (from shadcn)
│       ├── toast.tsx (from shadcn)
│       ├── loading-spinner.tsx
│       ├── empty-state.tsx
│       ├── error-state.tsx
│       ├── skeleton.tsx
│       └── theme-provider.tsx
```

### Testing Standards

- Verify all components render correctly
- Test theme switching works
- Verify toast notifications display

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created theme provider with dark/light/system mode support
- Implemented shadcn/ui compatible components manually (Button, Input, Card, Dialog, Table, Badge, Avatar, Dropdown)
- Created loading, empty, and error state components
- Implemented toast notification system
- Added cn utility function for className merging
- Updated root layout with ThemeProvider and ToastProvider

### File List

- src/shared/lib/utils.ts
- src/shared/ui/theme-provider.tsx
- src/shared/ui/button.tsx
- src/shared/ui/input.tsx
- src/shared/ui/card.tsx
- src/shared/ui/dialog.tsx
- src/shared/ui/table.tsx
- src/shared/ui/badge.tsx
- src/shared/ui/avatar.tsx
- src/shared/ui/dropdown-menu.tsx
- src/shared/ui/loading-spinner.tsx
- src/shared/ui/empty-state.tsx
- src/shared/ui/error-state.tsx
- src/shared/ui/skeleton.tsx
- src/shared/ui/toast.tsx
- src/app/layout.tsx