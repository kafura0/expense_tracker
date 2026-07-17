# Story 5.1: Build Settings Page

Status: ready-for-dev

## Story

As a user,
I want to configure my preferences including theme, currency, VAT, and profile,
so that the app works the way I want.

## Acceptance Criteria

1. Theme selector: Light, Dark, System (applies immediately, persists across sessions)
2. Base currency selector (changes affect dashboard calculations)
3. VAT rate configuration
4. Profile: display name, avatar upload (Supabase Storage)
5. Form validation on all settings
6. Changes saved via Server Actions

## Tasks / Subtasks

- [ ] Task 1: Create settings page layout (AC: #1, #2, #3)
  - [ ] Create `src/app/(dashboard)/settings/page.tsx`
  - [ ] Add theme selector
  - [ ] Add currency selector
  - [ ] Add VAT rate input
- [ ] Task 2: Create profile section (AC: #4)
  - [ ] Add display name input
  - [ ] Add avatar upload
  - [ ] Integrate with Supabase Storage
- [ ] Task 3: Create settings actions (AC: #6)
  - [ ] Create `src/features/settings/actions.ts`
  - [ ] Save theme preference
  - [ ] Save currency preference
  - [ ] Save VAT rate
  - [ ] Update profile
- [ ] Task 4: Add validation (AC: #5)
  - [ ] Validate all inputs

## Dev Notes

### Architecture Context

**Storage:**
- Theme: localStorage + cookie for SSR
- Currency/VAT: user settings table
- Profile: profiles table + Supabase Storage

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created settings page with profile, theme, currency, VAT settings
- Added avatar upload with Supabase Storage
- Created server actions for settings update
- Theme persists via ThemeProvider

### File List

- src/app/(dashboard)/settings/page.tsx
- src/features/settings/actions.ts