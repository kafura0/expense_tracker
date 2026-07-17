# Story 1.3: Implement Email Authentication

Status: review

## Story

As a user,
I want to sign up, log in, and reset my password using email,
so that I can access my expenses securely.

## Acceptance Criteria

1. Registration with email + password creates Supabase Auth user
2. Verification email sent on registration
3. Unverified users cannot access protected pages
4. Login with valid credentials redirects to dashboard
5. Invalid credentials show generic error (no user enumeration)
6. Password reset via email with expiring link
7. Logout clears session and redirects to login
8. Protected routes redirect to /login for unauthenticated users
9. Session persists across browser sessions via httpOnly cookie

## Tasks / Subtasks

- [x] Task 1: Configure Supabase client (AC: #1-9)
  - [x] Create `src/shared/lib/supabase/client.ts` for browser client
  - [x] Create `src/shared/lib/supabase/server.ts` for server client
  - [x] Create `src/shared/lib/supabase/middleware.ts` for middleware
- [x] Task 2: Create auth middleware (AC: #3, #8)
  - [x] Create `src/middleware.ts` to protect routes
  - [x] Redirect unauthenticated users to /login
  - [x] Allow public routes: /login, /register, /reset-password
- [x] Task 3: Build registration page (AC: #1, #2)
  - [x] Create `src/app/register/page.tsx`
  - [x] Build registration form with email + password
  - [x] Call Supabase signUp with email
  - [x] Show verification email sent message
- [x] Task 4: Build login page (AC: #4, #5)
  - [x] Create `src/app/login/page.tsx`
  - [x] Build login form with email + password
  - [x] Call Supabase signInWithPassword
  - [x] Handle errors with generic message
  - [x] Redirect to / on success
- [x] Task 5: Build password reset flow (AC: #6)
  - [x] Create `src/app/reset-password/page.tsx` for request form
  - [x] Create `src/app/update-password/page.tsx` for new password
  - [x] Call Supabase resetPasswordForEmail
- [x] Task 6: Implement logout (AC: #7)
  - [x] Create logout action in `src/features/auth/`
  - [x] Call Supabase signOut
  - [x] Redirect to /login
- [x] Task 7: Create auth features structure
  - [x] Create `src/features/auth/` directory
  - [x] Create login form component
  - [x] Create register form component
  - [x] Create auth server actions

## Dev Notes

### Architecture Context

**AD-1 — Server Actions as mutation boundary:**
- Auth mutations pass through Server Actions
- No direct Supabase calls from client components

**AD-8 — Server Components by default:**
- Pages are Server Components by default
- Forms marked 'use client' for interactivity

**Supabase SSR Pattern:**
- `@supabase/ssr` for session management
- httpOnly cookies for session persistence
- Middleware for route protection

### Auth Flow

1. User visits protected route
2. Middleware checks session via Supabase SSR
3. If no session → redirect to /login
4. User submits login form
5. Client calls Supabase signInWithPassword
6. On success → redirect to /
7. On error → show generic error message

### File Structure

```
src/
├── app/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── reset-password/page.tsx
│   └── update-password/page.tsx
├── features/
│   └── auth/
│       ├── actions.ts (Server Actions)
│       ├── login-form.tsx
│       └── register-form.tsx
├── shared/
│   └── lib/
│       └── supabase/
│           ├── client.ts
│           ├── server.ts
│           └── middleware.ts
└── middleware.ts
```

### Testing Standards

- Test registration flow with valid/invalid data
- Test login with correct/incorrect credentials
- Test protected route redirects
- Test logout clears session

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Implemented complete Supabase SSR authentication flow
- Created middleware for route protection with proper session handling
- Built login, register, reset-password, and update-password pages
- Implemented auth server actions for all auth operations
- Added auth callback route for email verification flow

### File List

- src/shared/lib/supabase/client.ts
- src/shared/lib/supabase/server.ts
- src/shared/lib/supabase/middleware.ts
- src/middleware.ts
- src/features/auth/actions.ts
- src/features/auth/login-form.tsx
- src/features/auth/register-form.tsx
- src/app/login/page.tsx
- src/app/register/page.tsx
- src/app/reset-password/page.tsx
- src/app/update-password/page.tsx
- src/app/auth/callback/route.ts