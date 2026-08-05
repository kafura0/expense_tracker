# Ledgerly — Project Answers

## Part 1: Security & Architecture

### 1. Explain how Supabase Row Level Security protects your data. If RLS were disabled on your expenses table, what could go wrong, and how could an attacker exploit it?

Supabase Row Level Security (RLS) ensures that sensitive user data is only accessible to authorized users. Its policies ensure that only authenticated users can access CRUD capabilities: rows that belong to them are only accessed by checking `auth.uid()` against the row's `user_id`, so each user's data is isolated. Even if someone bypasses the frontend and calls the API directly, RLS policies are still enforced at the database level.

**If RLS were disabled on the expenses table:**

- Any authenticated user could read **every** expense row in the table — not just their own.
- An attacker could `SELECT * FROM expenses` via the Supabase REST API and see all users' financial data: amounts, categories, notes, tax info.
- They could `UPDATE` or `DELETE` other users' expenses, causing data loss or manipulation.
- They could `INSERT` fake expenses into any org, polluting another organization's books.
- The anon key (which is public) would give full read/write access to the entire table with no restrictions.

**How an attacker would exploit it:**

```bash
# Using the public anon key — no auth needed if RLS is off
curl "https://your-project.supabase.co/rest/v1/expenses?select=*" \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <any-valid-jwt>"
```

This returns every expense from every user. With RLS enabled, the same request returns only the rows where the JWT's `sub` (user ID) matches `expenses.user_id`.

---

### 2. Where did you store your Supabase keys, and why? What is the difference between the anon key and the service role key, and which one did you use where?

The Supabase keys are stored in `.env.local` (gitignored) and on Vercel as encrypted environment variables.

| Key | Visibility | Purpose |
|-----|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Identifies the project endpoint — doesn't grant access without a key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (safe to expose) | Used by all client-side components. RLS policies on the database prevent users from accessing each other's data |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret — never exposed to client | Used only in server actions and API routes. Bypasses RLS entirely. Used for admin operations like creating users, managing orgs, and running RPC functions |

**Where each was used:**

- **Anon key** — Every `createClient()` call in browser components (`expense-table.tsx`, `expense-form.tsx`, dashboard widgets, etc.)
- **Service role key** — Server actions only: `signup-actions.ts` (admin user creation), `onboarding/actions.ts` (org creation via RPC), `invite/repository.ts` (invite management), and the seed script

---

### 3. Walk through, step by step, what happens from the moment a user clicks Sign in to when they land on a protected page. Where does the session live between requests?

**Step 1** — User submits email and password on the login form (`src/app/login/page.tsx`).

**Step 2** — The form calls the `login()` server action, which calls `supabase.auth.signInWithPassword()`.

**Step 3** — Supabase Auth validates credentials and returns an access token (JWT) and refresh token. It automatically sets httpOnly cookies (`sb-<project-ref>-auth-token`) on the current domain. These cookies are sent with every subsequent request to the same domain.

**Step 4** — The server action redirects to `/dashboard` via `router.push()`.

**Step 5** — Next.js middleware intercepts the request. It checks if the route is protected, verifies the session cookie by calling `supabase.auth.getUser()`, and if the user is authenticated, allows the request through. If the user has no org membership and the route requires one, it redirects to `/request-access`.

**Step 6** — The dashboard layout fetches the user's profile and org memberships. The `OrgProvider` reads the `ledgerly_active_org` cookie to determine which organization to display. Dashboard widgets then query expenses filtered by `org_id`, and RLS ensures only authorized data is returned.

**Where the session lives:** The session lives in **httpOnly cookies** set by Supabase Auth on the browser. These are:
- Not accessible via JavaScript (XSS-safe)
- Sent automatically with every request to the same origin
- Refreshed automatically by Supabase when the access token expires
- Scoped to the Supabase project ref

---

### 4. Your app depends on an external exchange-rate API. What happens if that API is slow, returns an error, or rate-limits you?

The exchange rate service (`src/entities/exchange-rate/service.ts`) uses a **cache-first with stale fallback** strategy:

1. **Cache check** — On each request, it checks if cached rates exist and whether they're stale (expired via `expires_at`).
2. **Cache hit (not stale)** — Returns cached rates immediately without hitting the API. Zero latency.
3. **Cache stale or missing** — Fetches fresh rates from the Frankfurter API with a **5-second timeout** (`AbortController`). If successful, upserts to cache and returns fresh data.
4. **API failure** — If the API call fails (network error, timeout, rate-limit), falls back to the **most recent cached rates** regardless of staleness. The user still gets usable data.
5. **No cache at all** — If the API fails AND there are zero cached rates (first-time user), throws `"No exchange rates available"`.

**`convertAmount()` fallback behavior:**

```typescript
export function convertAmount(amount, fromCurrency, toCurrency, rates) {
  if (fromCurrency === toCurrency) return amount
  const inBase = amount / (rates[fromCurrency] || 1)  // fallback: 1
  return inBase * (rates[toCurrency] || 1)             // fallback: 1
}
```

- If `fromCurrency` is missing from the rates dict, it defaults to `1` — treating it as equal to the base currency. This is a **safe fallback** for same-currency conversions but could produce incorrect conversions if a rate is genuinely missing.
- If `toCurrency` is missing, same fallback — treats it as `1`.
- The `|| 1` guard prevents `NaN` / `Infinity` from propagating through the UI, which would crash the expense form's conversion display.

**What I would improve with more time:**
- Add 1-2 retries with exponential backoff before falling back to stale cache.
- Use a cron job (Vercel cron or Supabase Edge Function) to pre-warm the cache every hour, so the first user request each hour never hits the API.
- Show cached rates immediately while fetching fresh ones in the background, rather than blocking.

---

### 5. Name one thing an AI tool generated for you that you changed or rejected, and explain why.

The AI initially generated the registration flow using the client-side Supabase `signUp()` method, which relies on Supabase sending a verification email to the user. This broke in practice because the Supabase project had no SMTP provider configured, so verification emails were never delivered and users could never complete registration.

I changed this to a server action that uses the service role key to create users with `email_confirm: true` via the GoTrue admin API. This bypasses email verification entirely — the user is created as already confirmed and immediately signed in. The reason for this change was practical: setting up a production-grade SMTP provider (like SendGrid or Resend) is a separate infrastructure concern, and for a demo/MVP app, auto-confirming users is the correct trade-off to avoid a broken onboarding flow. The AI's original approach was technically correct for a production app with email configured, but it didn't account for the reality that no email infrastructure was in place.

---

## Part 2: Debug and Code Review

The snippet below is meant to fetch expenses and display them. It has several problems.

```tsx
function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('expenses').select('*');
      setExpenses(data);
      setTotal(total + data.length);
    };
    load();
  }, [total]);
  return (
    <div>
      {expenses.map(e => <p>{e.title}: {e.amount}</p>)}
    </div>
  );
}
```

### Issues identified:

1. **Infinite loop** — `setTotal(total + data.length)` changes `total`, which is in the `useEffect` dependency array. This re-triggers the effect, which calls `setTotal` again, creating an infinite loop of API calls.

2. **Missing `key` prop** — React requires a unique `key` on each element in a mapped list. Without it, React cannot efficiently reconcile the DOM.

3. **No error handling** — If the query fails, `data` will be `null` and `setExpenses(null)` will crash when mapping over `null`. The `error` from destructuring is ignored.

4. **`supabase` is not imported** — This will throw a `ReferenceError` at runtime.

5. **No loading state** — The component renders an empty list while data is loading, with no visual feedback.

### Corrected version:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'

interface Expense {
  id: string
  title: string
  amount: number
}

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')

      if (error || !data) {
        setError(error?.message ?? 'Failed to load expenses')
        setLoading(false)
        return
      }

      setExpenses(data)
      setLoading(false)
    }

    load()
  }, []) // Empty array: run once on mount

  if (loading) return <div>Loading expenses...</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div>
      <p>Total expenses: {expenses.length}</p>
      {expenses.map((e) => (
        <p key={e.id}>{e.title}: {e.amount}</p>
      ))}
    </div>
  )
}
```

### Summary of fixes:
- Removed `total` from the `useEffect` dependency array to break the infinite loop.
- Imported and created the Supabase browser client.
- Added error handling for the Supabase query.
- Added null checks for the returned `data`.
- Derived `expenses.length` directly in render instead of maintaining a separate `total` state.
- Added a `key` prop (`e.id`) to the mapped list items.
- Added loading and error states for better UX.
- Added TypeScript types for the expense data.

---

## Bonus Questions

### 1. Explain the purpose of each Supabase migration

| Migration | Purpose |
|-----------|---------|
| **001_initial_schema** | Creates the foundational tables: `profiles`, `categories`, `expenses`, `settings`, `exchange_rates`. Sets up indexes, foreign keys, and basic RLS policies for single-user expense tracking. This is the MVP schema. |
| **002_tenancy_and_security** | Introduces multi-tenancy: adds `organizations`, `org_members`, `plans`, `subscriptions`, `client_requests`, and `audit_logs` tables. Adds `org_id` to existing tables (`expenses`, `categories`, `settings`, `profiles`). Rewrites all RLS policies to enforce org-scoped access. Adds `create_org_for_user()` and `assign_user_to_org()` RPC functions. This is the biggest migration — it transforms a single-user app into a multi-tenant SaaS. |
| **002_performance_optimization** | Adds composite and partial indexes for common query patterns: `user_id + date`, `user_id + category`, `user_id + currency`, filtered indexes for `is_deleted = false` and `tax_applicable = true`. Adds materialized view for dashboard aggregations. This is a pure performance migration with no schema changes. |
| **003_onboarding** | Adds `onboarding_completed` boolean to `profiles` table. Marks existing users as onboarded. Creates an index for quick onboarding checks. This supports the onboarding wizard flow — new users see the wizard until they complete it. |
| **004_messages_table** | Creates the `messages` table for user-to-admin support tickets and admin-to-user announcements. Adds RLS policies so users see only their own messages and admins see all. Supports the in-app messaging feature. |
| **005_invites_and_solo_support** | Creates the `invites` table for email-based org invitations with token auth and 7-day expiry. Adds `is_solo_user()` and `is_row_owner()` helper functions. Rewrites all RLS policies with a 4-policy pattern (super admin, org manager, org client, solo user) to support users who have no organization. This enables the three-user-model: super admin, org members, and solo users. |

---

### 2. Have we used `WITH CHECK` on the expenses table? Yes or no, and why.

**No.** We use `FOR ALL USING (...)` without a separate `WITH CHECK` clause.

In PostgreSQL, when you write `FOR ALL USING (expr)` without `WITH CHECK`, the `USING` expression is applied as **both** the read filter (SELECT) and the write filter (INSERT/UPDATE/DELETE). This means:

- A user can only **read** rows where `is_org_member(org_id)` is true.
- A user can only **insert/update/delete** rows where `is_org_member(org_id)` is true.

This is sufficient for our use case because the check is the same for reads and writes — "does this user belong to this org?" If we needed different rules for reads vs. writes (e.g., "anyone in the org can read, but only managers can write"), we would use separate `SELECT`, `INSERT`, `UPDATE` policies with `WITH CHECK` on the write policies.

The reason we didn't use `WITH CHECK` explicitly:

1. **Simplicity** — `FOR ALL USING (...)` is cleaner and covers both directions.
2. **Same rule for reads and writes** — Our security model is org-scoped: if you're in the org, you can read AND write. No distinction between read and write permissions at the RLS level (that's handled at the application level via role checks).
3. **PostgreSQL behavior** — When `WITH CHECK` is omitted, PostgreSQL defaults to using the `USING` expression for writes, so there's no security gap.

---

### 3. Discuss the `convertAmount()` fallback and related behavior

```typescript
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount
  const inBase = amount / (rates[fromCurrency] || 1)
  return inBase * (rates[toCurrency] || 1)
}
```

**How it works:**

The `rates` dictionary maps currency codes to their exchange rate against a base currency (e.g., USD). For example: `{ "KES": 153.5, "EUR": 0.92, "GBP": 0.79 }`.

To convert KES → EUR:
1. Divide by KES rate: `amount / 153.5` → converts to base (USD)
2. Multiply by EUR rate: `result * 0.92` → converts to EUR

**The `|| 1` fallback:**

- If `rates[fromCurrency]` is `undefined` or `0`, it defaults to `1`. This means "1 unit of this currency = 1 unit of the base currency."
- If `rates[toCurrency]` is `undefined` or `0`, same fallback.

**Why this matters:**

- **Prevents crashes** — Without the fallback, `amount / undefined` = `NaN`, which would propagate through the UI and break formatting (`Intl.NumberFormat` can't format `NaN`).
- **Safe default** — Defaulting to `1` means "treat this currency as equal to the base currency." For a missing rate, this is better than showing `NaN` or `Infinity`.
- **Not always correct** — If a rate is genuinely missing (e.g., the API didn't return KES), the conversion will be wrong. The user sees a plausible but incorrect number instead of an error.

**Where it's called:**

- `expense-form.tsx` — Shows real-time conversion in the form as the user types an amount
- Dashboard widgets — May use it for multi-currency summaries

**Improvements with more time:**

- Return `{ value: number, isApproximate: boolean }` so the UI can show "≈ $X.XX (estimated)" when using fallback rates.
- Log missing rates to Sentry/audit so we know which currencies need better coverage.
- Use a 1:1 fallback only for same-currency, and show an explicit "rate unavailable" message for genuinely missing cross-currency rates.

---

### Test Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| **Super Admin** | `admin@ledgerly.app` | `Admin@123456789!` | Full admin dashboard, all orgs, all data |
| **Org Admin** | `orgadmin@ledgerly.app` | `OrgAdmin@123!` | Org dashboard, manage members, full CRUD on Carter Enterprises |
| **Manager** | `manager@ledgerly.app` | `Manager@123!` | View/manage expenses in Carter Enterprises |
| **Client** | `client@ledgerly.app` | `Client@123!` | View-only in Carter Enterprises |
| **Solo** | `solo@ledgerly.app` | `Solo@123!` | Personal expenses only, no org sidebar |
