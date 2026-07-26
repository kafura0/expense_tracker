# Ledgerly — Adversarial Code Review

**Reviewer:** Amelia (Senior Software Engineer)
**Date:** 2026-07-26
**Scope:** 10 critical files — auth, org isolation, expense CRUD, invites, UI, layout
**Method:** Three parallel layers — Blind Hunter, Edge Case Hunter, Acceptance Auditor

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 9 |
| Medium | 11 |
| Low | 5 |
| **Total** | **29** |

---

## Layer 1: Blind Hunter

Bugs, logic errors, and security holes found without context of intent.

---

### BH-01 — Duplicate `'use client'` Directive
**Severity:** Medium
**File:** `src/shared/lib/org-provider.tsx:1,30`

Two identical `'use client'` directives at the top of the file. While not a runtime error (Next.js ignores the duplicate), it signals sloppy editing and could confuse bundler optimizations.

**Fix:** Remove the second `'use client'` on line 30.

**Test:** Static analysis / ESLint rule for duplicate directives.

---

### BH-02 — Client-Side Cookie Sets Missing `Secure` Flag
**Severity:** Critical
**File:** `src/shared/lib/org-provider.tsx:186,239`

```js
document.cookie = `ledgerly_active_org=${orgId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
```

The server-side cookie (`org-context.ts:96-102`) correctly sets `secure: process.env.NODE_ENV === 'production'`, but the **client-side** cookie in `org-provider.tsx` never sets `Secure`. This means:
1. In production, the client cookie is transmitted over plain HTTP alongside the httpOnly cookie that is HTTPS-only.
2. An attacker on the same network can read this cookie via HTTP downgrade.
3. The client cookie is **not** httpOnly, so any XSS payload can read it directly.

The dual-cookie architecture is documented but the client cookie undermines the security model described in `org-context.ts` lines 26-31.

**Fix:** Remove the client-side cookie entirely. The server action `switchOrg` already sets the httpOnly cookie. The OrgProvider should rely solely on the server action return value, not a parallel client cookie. If a client-side cache is truly needed, use `localStorage` (which has its own XSS exposure, but at least doesn't leak via network).

**Test:** Attempt to read `document.cookie` containing `ledgerly_active_org` in a browser DevTools console. In production, this should be impossible.

---

### BH-03 — SQL Injection via `ilike` Interpolation
**Severity:** Critical
**File:** `src/entities/expense/repository.ts:83`

```ts
query = query.or(`notes.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
```

`filters.search` is interpolated directly into the PostgREST filter string. While PostgREST parameterizes column values, the **filter operator and column name** are constructed from user input. A crafted search string containing `%,` could break out of the `ilike` operator and inject arbitrary PostgREST filter conditions. For example, a search string containing `%,amount_cents.gte.0,` could manipulate the query structure.

PostgREST does have some protections, but the `or()` filter takes a raw string — it does not parameterize the filter expression itself.

**Fix:** Validate and sanitize `filters.search` before interpolation. At minimum, strip `%`, `,`, `(`, `)`, and `.ilike.` characters from the input. Better: use PostgREST's RPC or a parameterized approach.

```ts
const sanitized = filters.search.replace(/[^a-zA-Z0-9\s]/g, '')
query = query.or(`notes.ilike.%${sanitized}%,title.ilike.%${sanitized}%`)
```

**Test:** Send a search string like `%,amount_cents.gte.0,notes.ilike.%admin` and verify the query still only searches text fields. Run with `pg_audit` logging enabled.

---

### BH-04 — `acceptInvite` Lacks Authentication
**Severity:** Critical
**File:** `src/entities/invite/repository.ts:92-141`

```ts
export async function acceptInvite(token: string, userId: string): Promise<string> {
```

The `userId` is accepted as a **caller-supplied parameter** with no authentication check. If this function is called from a server action that does not verify the caller's session, an attacker could pass any `userId` to:
1. Add an arbitrary user to an organization
2. Overwrite that user's `profiles.org_id`, `categories.org_id`, `expenses.org_id`, and `expense_settings.org_id`

The function also does not call `supabase.auth.getUser()` to verify the `userId` belongs to an authenticated session.

**Fix:** Either (a) remove the `userId` parameter and derive it from `supabase.auth.getUser()` inside the function, or (b) add an `auth.getUser()` check that the passed `userId` matches the authenticated user.

```ts
export async function acceptInvite(token: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // ... use user.id instead of parameter
}
```

**Test:** Call `acceptInvite` with a valid token but a different user's ID. Verify it throws or is rejected. Verify the authenticated user's ID is used instead.

---

### BH-05 — `revokeInvite` No Auth Check
**Severity:** High
**File:** `src/entities/invite/repository.ts:57-66`

```ts
export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = await createClient()
  // No auth check — anyone with a server client can revoke any invite
```

No `auth.getUser()` call. If a server action calls this function without its own auth check, any authenticated user (or unauthenticated if RLS is bypassed) could revoke invites for any org.

**Fix:** Add authentication and verify the caller has `org_id` membership before revoking.

**Test:** Call `revokeInvite` from a user who is not a member of the invite's org. Verify RLS blocks it (defense-in-depth), but also verify the application-level check catches it.

---

### BH-06 — `listInvites` No Org Validation
**Severity:** High
**File:** `src/entities/invite/repository.ts:44-55`

```ts
export async function listInvites(orgId: string): Promise<Invite[]> {
  const supabase = await createClient()
  // No auth check — caller supplies orgId directly
```

The caller passes `orgId` as a raw parameter. There is no check that the authenticated user is a member of this org. Relies entirely on RLS.

**Fix:** Add `auth.getUser()` and validate the user is a member of `orgId` before querying.

**Test:** Call `listInvites` with a valid org ID that the user does not belong to. Verify RLS blocks it, but also verify the application-level check catches it.

---

### BH-07 — `getOrgId` Duplicated Across Files
**Severity:** Medium
**File:** `src/entities/expense/repository.ts:14-32` and `src/features/settings/actions.ts:14-32`

Identical `getOrgId()` function exists in both files. Any bug fix or behavioral change must be applied to both, creating a maintenance hazard. The function also creates its own Supabase client, separate from the one used by the calling function — two `createClient()` calls per request.

**Fix:** Extract to `src/shared/lib/org-context.ts` as a shared utility.

**Test:** Refactor and run existing Vitest suite to verify no regressions.

---

### BH-08 — `Math.random()` for Toast IDs
**Severity:** Low
**File:** `src/shared/ui/toast.tsx:45`

```ts
const id = Math.random().toString(36).slice(2)
```

`Math.random()` is not cryptographically secure and has ~36^22 possible values. While collision probability is low, in a rapid-fire toast scenario (e.g., batch import with per-item errors), duplicate IDs could cause React key collisions and failed dismiss operations.

**Fix:** Use `crypto.randomUUID()` or a monotonic counter.

**Test:** Rapidly trigger 100 toasts and verify all dismiss correctly without stale state.

---

### BH-09 — `duplicateExpense` Dynamic Import
**Severity:** Low
**File:** `src/features/expenses/actions.ts:53`

```ts
const { findExpenseById } = await import('@/entities/expense/repository')
```

Dynamic import inside a server action that already imports 4 functions from the same module at the top of the file (line 4). This is unnecessary and adds code-splitting overhead for no benefit.

**Fix:** Import `findExpenseById` at the top of the file alongside the other imports.

**Test:** Verify `duplicateExpense` works after removing the dynamic import.

---

### BH-10 — Toast Timeout Not Cleaned Up
**Severity:** Low
**File:** `src/shared/ui/toast.tsx:47-49`

```ts
setTimeout(() => {
  setToasts((prev) => prev.filter((t) => t.id !== id))
}, 4000)
```

The `setTimeout` is not stored or cleared on unmount. If the `ToastProvider` unmounts while toasts are pending, the callback will attempt to call `setToasts` on an unmounted component. While React 18+ doesn't warn about this, it's a leaked timer.

**Fix:** Store the timeout ID and clear it in a cleanup function, or use a `useEffect` with the toast list as dependency.

**Test:** Mount and unmount `ToastProvider` rapidly while toasts are active. Verify no React state warnings or errors.

---

## Layer 2: Edge Case Hunter

Every branching path, boundary condition, and unhandled edge case.

---

### EC-01 — `orgScopeFilter` When `orgId` Is Null
**Severity:** High
**File:** `src/entities/expense/repository.ts:7-12`

```ts
function orgScopeFilter(query: any, orgId: string | null, userId: string) {
  if (orgId) {
    return query.eq('org_id', orgId)
  }
  return query.eq('user_id', userId).is('org_id', null)
}
```

When `orgId` is `null` (solo user with no org), this queries for expenses where `org_id IS NULL` **and** `user_id = userId`. This is correct for solo users, but what happens if:
1. A user was previously in an org, their expenses got an `org_id`, and they're now solo — those expenses are invisible.
2. RLS policies don't have a matching `IS NULL` check — the query returns empty but doesn't error.
3. The `getOrgId()` fallback (line 14-32) returns the user's first `org_members` row if the cookie is missing. This means a solo user with no `org_members` rows gets `null`, but a user who was removed from their only org still has stale `org_members` rows (if the org was soft-deleted without cascade) and gets a non-null `orgId`.

**Fix:** Add explicit handling for the case where `orgId` is non-null but the org no longer exists (the Supabase `!inner` join handles this in the provider, but `getOrgId()` does not use the join).

**Test:** Create a user with org membership, soft-delete the org, then query expenses. Verify the query doesn't return stale data or error.

---

### EC-02 — `findInviteByToken` Race Condition on Expiry
**Severity:** Medium
**File:** `src/entities/invite/repository.ts:68-90`

```ts
if (new Date(data.expires_at) < new Date()) {
  await supabase
    .from('invites')
    .update({ status: 'expired' })
    .eq('id', data.id)
  return null
}
```

Two concurrent requests with the same expired token could both read `status: 'pending'` before either updates to `'expired'`. This isn't a security issue (both return `null`), but the second `update` is a wasted write. More importantly, if `findInviteByToken` is called from `acceptInvite`, both concurrent calls could proceed past the token check and insert duplicate `org_members` rows.

**Fix:** In `acceptInvite`, use an atomic operation (e.g., `UPDATE ... WHERE status = 'pending' RETURNING *`) to check-and-set in a single query. Or add a unique constraint on `org_id, email, status` where `status = 'pending'`.

**Test:** Send two concurrent `acceptInvite` requests with the same token. Verify only one succeeds.

---

### EC-03 — `acceptInvite` Data Migration Without Error Handling
**Severity:** High
**File:** `src/entities/invite/repository.ts:108-131`

```ts
await supabase.from('profiles').update({ org_id: invite.org_id }).eq('user_id', userId).is('org_id', null)
await supabase.from('categories').update({ org_id: invite.org_id }).eq('user_id', userId).is('org_id', null)
await supabase.from('expenses').update({ org_id: invite.org_id }).eq('user_id', userId).is('org_id', null)
await supabase.from('expense_settings').update({ org_id: invite.org_id }).eq('user_id', userId).is('org_id', null)
```

Four sequential `await` calls with **no error checking**. If the `profiles` update fails but `categories` succeeds, the user's data is partially migrated. The invite is still marked as `'accepted'` (line 132-138) even if the migration is incomplete. There is no rollback.

**Fix:** Wrap in a transaction or check each result. If any migration step fails, the `org_members` insert should also be rolled back.

**Test:** Mock the Supabase client to fail on the `categories` update. Verify the `org_members` insert is not committed and the invite is not marked as accepted.

---

### EC-04 — Middleware: No Redirect for Unauthenticated on `/`
**Severity:** Medium
**File:** `src/shared/lib/supabase/middleware.ts:135-149,178-185`

The root path `/` is in `publicPaths`. When an unauthenticated user visits `/`, the middleware returns `supabaseResponse` without redirect. The landing page renders. But when the same user visits `/dashboard`, they're redirected to `/login`. The landing page at `/` may make authenticated assumptions if it renders any user-specific data.

**Fix:** Verify the landing page handles the unauthenticated state correctly. If it's purely marketing content, this is fine. If it checks for user data, this is a bug.

**Test:** Visit `/` while logged out. Verify no authenticated data is displayed or fetched.

---

### EC-05 — Middleware: Org Cookie Validated But Not Enforced
**Severity:** Medium
**File:** `src/shared/lib/supabase/middleware.ts:257-267`

```ts
if (!validOrg && isProtectedPath) {
  // No valid org cookie set — let the request through.
  // The client-side OrgProvider will detect this, set the cookie
  // to the user's first available org, and re-render.
}
```

When the org cookie is invalid or missing on a protected path, the middleware intentionally lets the request through. This means the page renders with `activeOrg = null` until the client-side OrgProvider fetches orgs and sets the cookie. During this window:
1. Server components that depend on `activeOrg` will receive null.
2. Any server-side data fetching in the page will use no org filter (or the wrong org).
3. A user could craft a request with no org cookie and potentially see data from `org_id IS NULL` queries.

**Fix:** Consider redirecting to `/?org=setup` or the onboarding page when no valid org is set on protected routes, rather than letting the page render in a null-org state.

**Test:** Clear the `ledgerly_active_org` cookie, then navigate to `/dashboard`. Verify the page doesn't flash unorged data before the client provider sets the cookie.

---

### EC-06 — Settings: VAT Rate Not Type-Safe on Input
**Severity:** Medium
**File:** `src/features/settings/actions.ts:96-101`

```ts
if (settings.vat_rate !== undefined) {
  if (settings.vat_rate < 0 || settings.vat_rate > 100) {
    return { error: 'VAT rate must be between 0 and 100' }
  }
```

`settings` is `Partial<UserSettings>` where `vat_rate: number`. But since this comes from a server action parameter, the actual runtime type could be a string (e.g., `"16"` from FormData). TypeScript type checking is erased at runtime. A string `"abc" < 0` is `false` in JavaScript, so the validation passes, and a non-numeric value is written to the database.

**Fix:** Parse `vat_rate` as a number first: `const vatRate = Number(settings.vat_rate); if (isNaN(vatRate)) return { error: '...' }`.

**Test:** Call `updateSettings({ vat_rate: "not_a_number" as any })`. Verify it returns an error.

---

### EC-07 — Settings: Currency Code Not Validated
**Severity:** Medium
**File:** `src/features/settings/actions.ts:95`

```ts
if (settings.base_currency !== undefined) settingsUpdate.base_currency = settings.base_currency
```

Any string is accepted as `base_currency`. The `expenseSchema` restricts to `['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']`, but the settings action does not validate against this list. A user could set `base_currency` to `"<script>"` which would be stored and rendered in the UI.

**Fix:** Validate against the allowed currency list: `const allowed = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']`.

**Test:** Call `updateSettings({ base_currency: 'INVALID' })`. Verify it returns an error.

---

### EC-08 — `duplicateExpense` Overwrites Original Date
**Severity:** Medium
**File:** `src/features/expenses/actions.ts:65`

```ts
date: new Date().toISOString(),
```

When duplicating an expense, the original date is replaced with today's date. This could confuse users who duplicate an expense to quickly create a similar entry with a different date — they'd need to manually change it back. More critically, the original `date` is in `expenseData` (via spread), but it's overwritten.

**Fix:** Preserve the original date, or prompt the user. At minimum, keep the original date and let the user change it in the form.

**Test:** Duplicate an expense dated 2025-01-15. Verify the duplicate's date is 2025-01-15 (not today).

---

### EC-09 — Dashboard Layout: No Loading State for User Data
**Severity:** Low
**File:** `src/app/(dashboard)/layout.tsx:88-89,100-112`

```ts
const [userName, setUserName] = useState<string>('')
const [userEmail, setUserEmail] = useState<string>('')
```

On initial render, `userName` is `''` and `userEmail` is `''`. The initials computation produces `''` (since `''.split(' ').map(...)` returns an empty array), which falls back to `'U'`. The user sees a brief flash of "U" in the avatar before the real name loads. This is a UX issue, not a security issue.

**Fix:** Use the `user` data from the OrgProvider or Supabase auth state directly, rather than fetching it separately in the layout.

**Test:** Throttle network to slow 3G and verify no visual flash of "U" in the avatar.

---

### EC-10 — Dashboard Layout: Body Overflow Not Restored on Unmount
**Severity:** Low
**File:** `src/app/(dashboard)/layout.tsx:133-140`

```ts
useEffect(() => {
  if (mobileOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => { document.body.style.overflow = '' }
}, [mobileOpen])
```

The cleanup function resets `overflow` to `''`, but `''` is not the same as the original value. If the body had `overflow: hidden` set by another component (e.g., a modal), this cleanup would remove it. The `return` cleanup only runs on unmount, not on `mobileOpen` change — so if the component unmounts while the mobile menu is open, the body is correctly restored. However, the non-cleanup path (line 137) sets `overflow = ''` which may not restore the original value.

**Fix:** Store the original `document.body.style.overflow` before modification and restore it.

**Test:** Open mobile menu, then trigger a component unmount (e.g., route change). Verify body scroll is restored.

---

### EC-11 — OrgProvider: `switchOrg` Reads Stale `orgs` State
**Severity:** Medium
**File:** `src/shared/lib/org-provider.tsx:213-244`

```ts
const switchOrg = useCallback(async (orgId: string) => {
  // ...
  const org = orgs.find(o => o.org_id === orgId)
  if (!org) return
  // ...
}, [orgs])
```

`switchOrg` depends on `orgs` via the `useCallback` dependency. If `orgs` is stale (e.g., the user belongs to a new org that was just added by an admin, but `fetchOrgs` hasn't been called yet), the `orgs.find()` will return `undefined` and the switch silently fails.

**Fix:** Instead of looking up the org from local state, query it from the server or trust the server validation result.

**Test:** Add a user to a new org from a different tab. Without refreshing, try to switch to that org in the original tab. Verify it works (or at least doesn't silently fail).

---

## Layer 3: Acceptance Auditor

Code vs. stated requirements and design patterns.

---

### AA-01 — Cookie Security Model Inconsistent with Documentation
**Severity:** High
**File:** `src/shared/lib/org-provider.tsx:186` vs `src/shared/lib/org-context.ts:26-31`

The `org-context.ts` documentation states: "httpOnly: true → JavaScript cannot read the cookie (XSS protection)". But `org-provider.tsx:186` sets a **client-readable** cookie with the same name:

```ts
document.cookie = `ledgerly_active_org=${active.org_id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
```

This creates **two cookies** with the same name:
1. Server-side: httpOnly, secure (in production), sameSite lax
2. Client-side: **not** httpOnly, **not** secure, sameSite lax

Browsers will send both cookies. The server will read the httpOnly one (which is more secure). But the client cookie is exposed to XSS. If an attacker injects a script, they can read `document.cookie` and extract the org_id, then use it for targeted attacks.

**Fix:** Eliminate the client-side cookie. The server action `switchOrg` in `org-actions.ts:66-89` already sets the httpOnly cookie. The OrgProvider should not set a parallel client cookie.

**Test:** Run `document.cookie` in the browser console while logged in. Verify `ledgerly_active_org` is NOT present.

---

### AA-02 — `switchOrg` Calls Server Action But Doesn't Use Its Result
**Severity:** High
**File:** `src/shared/lib/org-provider.tsx:213-243`

The `switchOrg` function in the provider validates membership client-side and sets a client cookie, then calls `window.location.reload()`. But it **never calls the `switchOrg` server action** from `org-actions.ts`. The server action (`org-actions.ts:66-89`) is the authoritative cookie setter, but the provider bypasses it entirely.

This means:
1. The httpOnly cookie (the authoritative one) is **never set** by the client-side switch.
2. On the next page load, the server reads the httpOnly cookie — which still has the **old** org_id.
3. The page renders with the old org's data until the client-side OrgProvider fires `fetchOrgs` and sets the client cookie.

**Fix:** The `switchOrg` provider function should call the server action, then reload:

```ts
const switchOrg = useCallback(async (orgId: string) => {
  const { switchOrg: switchOrgAction } = await import('@/shared/lib/org-actions')
  const result = await switchOrgAction(orgId)
  if (result.error) throw new Error(result.error)
  window.location.reload()
}, [])
```

**Test:** Switch orgs. Verify the httpOnly cookie is updated by checking the `Set-Cookie` response header in DevTools Network tab.

---

### AA-03 — Route Protection Missing `/reports` and `/categories`
**Severity:** High
**File:** `src/shared/lib/supabase/middleware.ts:162`

```ts
const protectedPaths = ['/dashboard', '/expenses', '/settings']
```

The AGENTS.md defines these routes as requiring auth:
```
/reports                    Reports (auth + org)
/categories                 Categories (auth + org)
```

But neither `/reports` nor `/categories` is in `protectedPaths`. An unauthenticated user can access these routes directly by navigating to `/reports` or `/categories`.

**Fix:** Add `/reports` and `/categories` to `protectedPaths`.

**Test:** Log out, then navigate directly to `/reports`. Verify you are redirected to `/login`.

---

### AA-04 — `logout` Does Not Clear Org Cookie
**Severity:** High
**File:** `src/features/auth/actions.ts:92-96`

```ts
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

`signOut()` clears the Supabase auth cookies, but does **not** call `clearActiveOrgId()` from `org-context.ts:109-112`. The `ledgerly_active_org` cookie persists. On the next login (even a different user), the stale org cookie is read, and the middleware may allow access to an org the new user doesn't belong to (until the OrgProvider overrides it).

**Fix:**
```ts
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  await clearActiveOrgId()
  redirect('/login')
}
```

**Test:** Log in as User A, note the org cookie, log out, log in as User B. Verify User B's org cookie is their own org, not User A's.

---

### AA-05 — `createExpense` Input Not Validated Before Insert
**Severity:** Medium
**File:** `src/entities/expense/repository.ts:189-208`

```ts
export async function createExpense(expense: ExpenseInsert): Promise<Expense> {
  // ...
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...expense, user_id: user.id, org_id: orgId })
    .select()
    .single()
  if (error) throw new Error(...)
  return expenseSchema.parse(data)  // validated AFTER insert
}
```

`expenseInsertSchema` exists in `schema.ts` but is never called to validate the input **before** the insert. Validation happens **after** the database write. If the insert succeeds but the Zod parse fails, the data is in the database but the caller receives an error. The expense is orphaned.

**Fix:** Validate input before insert:
```ts
const validated = expenseInsertSchema.parse(expense)
const { data, error } = await supabase.from('expenses').insert({ ...validated, user_id: user.id, org_id: orgId })
```

**Test:** Pass an expense with `amount_cents: -100`. Verify it fails at validation, not at the database.

---

### AA-06 — `duplicateExpense` Doesn't Preserve `category_id` Correctly
**Severity:** Medium
**File:** `src/features/expenses/actions.ts:61`

```ts
const { id: _, user_id: __, created_at: ___, updated_at: ____, ...expenseData } = expense
```

The destructuring strips `id`, `user_id`, `created_at`, `updated_at`. But `expense` from `findExpenseById` includes the full `Expense` type which has `org_id`, `is_deleted`, `deleted_at`. These are also spread into `expenseData`. When passed to `createExpenseRepo`, the `org_id` and `is_deleted` fields are present in the spread. The `createExpenseRepo` overwrites `user_id` and `org_id`, but `is_deleted` and `deleted_at` are **not** overwritten — they're passed through to the insert.

However, `expenseInsertSchema` (the type for `ExpenseInsert`) **excludes** `is_deleted` and `deleted_at` (they're omitted in the schema). So TypeScript should catch this... unless the types are loose. Looking at the spread, `expenseData` would have `is_deleted: false` and `deleted_at: null` from the source expense. These would be included in the insert, which is fine for `is_deleted: false` but `deleted_at: null` could cause issues if the column has a NOT NULL constraint.

**Fix:** Explicitly destructure and exclude `org_id`, `is_deleted`, `deleted_at`:
```ts
const { id: _, user_id: __, org_id: ___, created_at: ____, updated_at: _____, is_deleted: ______, deleted_at: _______, ...expenseData } = expense
```

**Test:** Duplicate an expense that was restored (deleted_at is null). Verify the duplicate inserts without constraint errors.

---

### AA-07 — `getSettings` Doesn't Handle Missing Profile
**Severity:** Medium
**File:** `src/features/settings/actions.ts:61-69`

```ts
const { data: profile } = await profileQuery.single()
const { data: settings } = await settingsQuery.single()

return {
  theme: (settings?.theme as 'light' | 'dark' | 'system') || 'dark',
  base_currency: settings?.base_currency || 'USD',
  vat_rate: settings?.vat_rate || 16,
  display_name: profile?.display_name || user.email?.split('@')[0] || '',
}
```

If the user has no `profiles` row, `.single()` throws a PostgREST error (PGRST116). The error propagates up as an unhandled exception. The `getSettings` function does not catch this error.

**Fix:** Use `.maybeSingle()` instead of `.single()`, or catch the error and return defaults.

**Test:** Delete the user's profile row from the database, then call `getSettings`. Verify it returns defaults instead of throwing.

---

### AA-08 — Button `asChild` Passes `loading` Prop to Slot
**Severity:** Low
**File:** `src/shared/ui/button.tsx:46-58`

When `asChild` is true, the `loading` prop is passed through `{...props}` to the `Slot` component. `Slot` merges props onto the child. If the child is an `<a>` tag, the `loading` attribute is not a valid HTML attribute and will be silently ignored by the browser but will appear in the DOM.

**Fix:** Destructure and exclude `loading` from `...props` when `asChild` is true:

```ts
const { loading: _loading, ...restProps } = props
if (asChild) {
  return <Slot ...>{children}</Slot>
}
```

**Test:** Render `<Button asChild loading><a>Link</a></Button>`. Verify `loading` is not passed to the `<a>` element.

---

### AA-09 — Expense Action Error Responses Inconsistent
**Severity:** Low
**File:** `src/features/expenses/actions.ts`

`createExpense` returns `{ data, error }`, `deleteExpense` returns `{ error }` (no `data`), `duplicateExpense` returns `{ data, error }`. The inconsistency makes the client-side error handling harder.

**Fix:** Standardize all actions to return `{ data: T | null, error: string | null }`.

**Test:** Write unit tests that assert the return shape of every action.

---

### AA-10 — `updateSettings` Returns `{ success: true }` Instead of `{ data }`
**Severity:** Low
**File:** `src/features/settings/actions.ts:143`

```ts
return { success: true }
```

All other actions return `{ data, error }` or `{ error }`. `updateSettings` returns a different shape. This inconsistency makes the client-side handling unpredictable.

**Fix:** Return `{ data: { updated: true }, error: null }` for consistency.

**Test:** Assert the return type of `updateSettings` matches the pattern used by other actions.

---

## Priority Remediation Order

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | BH-02: Client cookie missing Secure + HttpOnly | Medium |
| 2 | BH-03: SQL injection via ilike interpolation | Low |
| 3 | BH-04: acceptInvite lacks auth check | Low |
| 4 | AA-04: logout doesn't clear org cookie | Low |
| 5 | AA-02: switchOrg bypasses server action | Low |
| 6 | AA-03: /reports and /categories unprotected | Low |
| 7 | BH-05: revokeInvite no auth check | Low |
| 8 | BH-06: listInvites no org validation | Low |
| 9 | EC-03: acceptInvite data migration no error handling | Medium |
| 10 | AA-05: createExpense validates after insert | Low |
| 11 | EC-06: VAT rate type safety | Low |
| 12 | EC-07: Currency code not validated | Low |
| 13 | AA-01: Cookie security model inconsistency | Medium |
| 14 | EC-05: Middleware lets through invalid org | Medium |
| 15 | BH-01: Duplicate use client | Trivial |

---

*Review completed. 29 findings across 10 files. 4 Critical, 9 High, 11 Medium, 5 Low.*
