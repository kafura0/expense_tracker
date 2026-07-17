# Story 5.3: Implement PWA Support

Status: ready-for-dev

## Story

As a user,
I want to install ExpenseOS on my device and use it offline,
so that I can track expenses without internet access.

## Acceptance Criteria

1. Web manifest with app name, icons, theme colors
2. Service worker registered for offline support
3. Start URL points to dashboard
4. Display mode: standalone
5. Install prompt appears after 3 sessions (dismissable)
6. Core functionality works offline (view expenses)
7. Mutations queued for sync when back online
8. Responsive icons for all device sizes

## Tasks / Subtasks

- [ ] Task 1: Create web manifest (AC: #1, #3, #4)
  - [ ] Create `public/manifest.json`
  - [ ] Add app name, icons, theme colors
- [ ] Task 2: Create service worker (AC: #2, #6, #7)
  - [ ] Create `public/sw.js`
  - [ ] Cache static assets
  - [ ] Cache API responses
  - [ ] Queue mutations offline
- [ ] Task 3: Register service worker (AC: #2)
  - [ ] Add registration code to layout
- [ ] Task 4: Add install prompt (AC: #5)
  - [ ] Create `src/features/pwa/install-prompt.tsx`
  - [ ] Track session count
  - [ ] Show after 3 sessions

## Dev Notes

### PWA Requirements

- manifest.json in public/
- Service worker for offline
- Icons: 192x192, 512x512

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created web manifest with app name, icons, theme colors
- Created service worker for offline support
- Created install prompt component
- Added service worker registration

### File List

- public/manifest.json
- public/sw.js
- src/features/pwa/install-prompt.tsx
- src/features/pwa/service-worker-registration.tsx
- src/app/layout.tsx