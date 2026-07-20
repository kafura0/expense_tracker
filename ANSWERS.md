1. Explain how Supabase Row Level Security protects your data. If RLS were disabled on your expenses table, what could go wrong, and how could an attacker exploit it?

Supabase Row Level Security (RLS) acts as the database gatekeeper, ensuring that sensitive user data is only accessible to authorized users. It enforces policies for SELECT, INSERT, UPDATE, and DELETE, so authenticated users can access CRUD capabilites: such that rows that belong to them are on accessed by checking auth.uid() against the row's user_id.

This follows the principle of least privilege and keeps each user's data isolated. Even if someone bypasses the frontend and calls the API directly, RLS policies are still enforced by the database. Good security practices also include never exposing the service role key on the client, using the anon key only from the frontend, reviewing security logs regularly, and keeping RLS enabled on all tables containing sensitive data.


2. Where did you store your Supabase keys, and why? What is the difference between the anon key and
the service role key, and which one did you use where?


3. Walk through, step by step, what happens from the moment a user clicks Sign in to when they land on
a protected page. Where does the session live between requests?



4. Your app depends on an external exchange-rate API. What happens if that API is slow, returns an error,
or rate-limits you? Describe how you handled it, or how you would if you had more time.



5. Name one thing an AI tool generated for you that you changed or rejected, and explain why.