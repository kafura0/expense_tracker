# Addendum: ExpenseOS Technical Decisions

## Database Schema Considerations

### Core Tables
- `profiles` — User profile data (extends Supabase auth.users)
- `categories` — Expense categories (user-created)
- `expenses` — Core expense records
- `settings` — User preferences
- `exchange_rates` — Cached currency rates

### Future-Ready Relationships
- Organizations table (reserved for v2)
- Team memberships (reserved for v2)
- Role-based access (reserved for v2)

## API Design

### Server Actions
- Expense CRUD operations
- Settings updates
- Profile management

### Route Handlers
- Currency exchange rates (GET)
- Export generation (POST)
- Webhook endpoints (future)

## Security Considerations

- Row-Level Security (RLS) on all tables
- Middleware authentication on protected routes
- Input validation with Zod on all mutations
- No secrets exposed to client
- CSRF protection via Supabase

## Performance Targets

- Dashboard load: <2s on 3G
- Expense list: <1s for 1000 records
- Export generation: <5s for <1000 rows
- Exchange rate fetch: <5s with 5s timeout

## Caching Strategy

- Exchange rates: 1 hour cache
- Static assets: CDN cached
- API responses: Stale-while-revalidate where appropriate

## Deployment

- Vercel for hosting
- Supabase for database/auth/storage
- Environment variables for configuration
- Preview deployments for PRs
