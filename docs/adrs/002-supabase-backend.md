# ADR-002: Supabase for Backend Services

## Status

Accepted

## Context

Ledgerly requires:
- User authentication and session management
- PostgreSQL database with real-time capabilities
- Row-Level Security for multi-tenant data isolation
- File storage for user avatars
- Scalability to 10,000+ users

Building these from scratch would take months and require dedicated backend infrastructure.

## Decision

We will use **Supabase** as our backend-as-a-service (BaaS) provider.

### Components Used

1. **Supabase Auth** — Email/password authentication with session management
2. **Supabase Database** — PostgreSQL with automatic API generation
3. **Row-Level Security (RLS)** — Database-level multi-tenant isolation
4. **Supabase Storage** — File storage for avatars
5. **Supabase SSR** — Server-side rendering integration for Next.js

### Security Model

- RLS policies on all tables: `user_id = auth.uid()`
- Service role key only used server-side for admin operations
- Anon key exposed to client with RLS protection
- Session tokens stored in httpOnly cookies

## Consequences

### Positive

- Rapid development (weeks instead of months)
- Built-in security with RLS
- Automatic API generation from database schema
- Real-time subscriptions available
- Scales automatically with Supabase infrastructure
- Free tier sufficient for development and early users

### Negative

- Vendor lock-in to Supabase ecosystem
- Limited customization of auth flows
- Cold start times for Edge Functions (not used in this project)
- Pricing scales with usage

### Mitigations

- Abstract Supabase client behind repository pattern
- Keep business logic in application layer, not database functions
- Document Supabase-specific patterns for future migration if needed

## Alternatives Considered

1. **Firebase** — Rejected: Less flexible RLS, more expensive at scale
2. **Custom backend** — Rejected: Too much development overhead for MVP
3. **AWS Amplify** — Rejected: More complex setup, steeper learning curve
4. **PocketBase** — Considered but less mature ecosystem

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase + Next.js Guide](https://supabase.com/docs/guides/auth/server-rendering)
