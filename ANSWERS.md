1. Explain how Supabase Row Level Security protects your data. If RLS were disabled on your expenses table, what could go wrong, and how could an attacker exploit it?

Supabase Row Level Security (RLS) ensures that sensitive user data is only accessible to authorized users. Its policies ensure that only authenitcated users can access CRUD capabilites: such that rows that belong to them are only accessed by checking auth.uid() against the row's user_id, so each user's data is isolated. Even if someone bypasses the frontend and calls the API directly, RLS policies are still enforced by the database. 

2. Where did you store your Supabase keys, and why? What is the difference between the anon key and the service role key, and which one did you use where?

The Supabase keys are stored in `.env.local` (gitignored) and on Vercel as encrypted environment variables. There are two keys:

- NEXT_PUBLIC_SUPABASE_ANON_KEY(public):This key is safe to expose to the browser because RLS policies on the database prevent users from accessing each other's data. Every client component that calls Supabase directly uses this key 

-SUPABASE_SERVICE_ROLE_KEY(secret): Never exposed to the client. Used only server-side.

- NEXT_PUBLIC_SUPABASE_URL: is also public because it only identifies the project endpoint — it doesn't grant access without the key.


3. Walk through, step by step, what happens from the moment a user clicks Sign in to when they land on a protected page. Where does the session live between requests?

Step 1 — User submits email and password on the login form.

Step 2 — The form communicates with Supabase Auth.

Step 3 — SupabseAuth validates credentials and returns an access token (JWT) and refresh token. It automatically stores a httpOnly cookie in the browser These cookies are set on the current domain and sent with every subsequent request.

Step 4 - user is redirected to their dashboard; accessin gonly heir data.

Step 5 — The middleware checks if the route is protected, if the user is now authenticated, returns a valid user, and the middleware allows the request.

Step 6 — The dashboard page fetches data from Supabase (expenses, categories, settings) using the browser client, which sends the session cookies with each request. RLS ensures only the user's own data is returned.

4. Your app depends on an external exchange-rate API. What happens if that API is slow, returns an error, or rate-limits you? Describe how you handled it, or how you would if you had more time.

The exchange rate service (`src/entities/exchange-rate/service.ts`) uses a **cache-first with stale fallback** strategy:

- Timeout protection such that if the API is slow, the request is aborted before it blocks the user.

- If the API call fails (error, timeout, or rate-limit), the service catches the error and falls back to the most recent cached rates 

- If the API fails AND there are zero cached rates (first-time user), the function throws "No exchange rates available", which comes as an error to the user.

What I would improve with more time:
-  Add 1-2 retries before falling back to stale cache.
- Use a cron job to pre-warm the cache every hour, so the first user request each hour never hits the API.
- Show cached rates immediately while fetching fresh ones in the background, rather than blocking on the stale check.

5. Name one thing an AI tool generated for you that you changed or rejected, and explain why.

The AI initially generated the registration flow using the client-side Supabase `signUp()` method, which relies on Supabase sending a verification email to the user. This broke in practice because the Supabase project had no SMTP provider configured, so verification emails were never delivered and users could never complete registration.

I changed this to a server action that uses the service role key to create users with `email_confirm: true` via the GoTrue admin API. This bypasses email verification entirely — the user is created as already confirmed and immediately signed in. The reason for this change was practical: setting up a production-grade SMTP provider (like SendGrid or Resend) is a separate infrastructure concern, and for a demo/MVP app, auto-confirming users is the correct trade-off to avoid a broken onboarding flow. The AI's original approach was technically correct for a production app with email configured, but it didn't account for the reality that no email infrastructure was in place.

Part 3: Debug and code review

The snippet below is meant to fetch expenses and display them. It has several problems. Identify each issue,
explain why it is a problem, and provide a corrected version. Add this to your ANSWERS.md.

function Expenses() {
const [expenses, setExpenses] = useState([]);
const [total, setTotal] = useState(0);

useEffect(() =&gt; {
const load = async () =&gt; {
const { data } = await supabase.from(&#39;expenses&#39;).select(&#39;*&#39;);
setExpenses(data);
setTotal(total + data.length);
};
load();
}, [total]);
return (
&lt;div&gt;
{expenses.map(e =&gt; &lt;p&gt;{e.title}: {e.amount}&lt;/p&gt;)}
&lt;/div&gt;
);
}

Issues identified:

1. Infinite loop caused by useEffect dependency on `total`
   `setTotal(total + data.length)` changes `total`. This triggers the effect again, which changes `total` again, creating an infinite loop of API calls.

2. Missing `key` prop on list items
   React requires a unique `key` prop on each element in a mapped list. Without it, React cannot efficiently reconcile the DOM when the list changes and will throw a warning.

3. No error handling on the Supabase query
   If the query fails (network error, RLS denial, etc.), `data` will be `null` and `setExpenses(data)` will crash when trying to map over `null`. The destructured `error` is also ignored.

4. `supabase` is not imported this will throw a ReferenceError at runtime.

Corrected version:

```tsx
'use client'

// Import React hooks and the Supabase browser client
import { useState, useEffect } from 'react'
import { createClient } from '@/shared/lib/supabase/client'

// Define a type for the expense rows we expect from the database
interface Expense {
  id: string
  title: string
  amount: number
}

export function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize the Supabase browser client once
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      // Query the expenses table and destructure both data and error
      const { data, error } = await supabase
        .from('expenses')
        .select('*')

      // If the query failed or returned null, set an error message
      if (error || !data) {
        setError(error?.message ?? 'Failed to load expenses')
        setLoading(false)
        return
      }

      // Store the fetched expenses in state
      setExpenses(data)

      // Derive total from the fetched data instead of using a
      // separate state variable, which avoids the infinite loop
      // caused by the original code using `total` as a useEffect dependency
      setLoading(false)
    }

    load()
    // Empty dependency array: run once on mount, not on every state change
  }, [])

  // Show a loading state while the query is in flight
  if (loading) {
    return <div>Loading expenses...</div>
  }

  // Show an error message if the query failed
  if (error) {
    return <div className="text-red-600">{error}</div>
  }

  return (
    <div>
      {/* Derived value: total computed from the expenses array */}
      <p>Total expenses: {expenses.length}</p>

      {/* Each list item has a unique key from the database id */}
      {expenses.map((e) => (
        <p key={e.id}>
          {e.title}: {e.amount}
        </p>
      ))}
    </div>
  )
}
```

Summary of fixes:
- Removed `total` from the useEffect dependency array to break the infinite loop.
- Imported and created the Supabase browser client.
- Added error handling for the Supabase query.
- Added null checks for the returned `data`.
- Derived `expenses.length` directly in the render instead of maintaining a separate `total` state.
- Added a `key` prop (`e.id`) to the mapped list items.
- Added loading and error states for better UX.
- Added TypeScript types for the expense data.