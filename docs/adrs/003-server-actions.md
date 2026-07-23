# ADR-003: Server Actions for Mutations

## Status

Accepted

## Context

Ledgerly needs a secure way to handle data mutations (create, update, delete expenses) without exposing database credentials or business logic to the client.

Options:
1. API Routes (REST endpoints)
2. Server Actions (Next.js 14+)
3. Direct database access from client (rejected for security)

## Decision

We will use **Next.js Server Actions** for all data mutations.

### Implementation Pattern

```typescript
'use server'

import { revalidatePath } from 'next/cache'

export async function createExpense(expense: ExpenseInsert) {
  try {
    const data = await createExpenseRepo(expense)
    revalidatePath('/expenses')
    revalidatePath('/')
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed' }
  }
}
```

### Key Principles

1. **Server-only code** — `'use server'` directive ensures functions run on server
2. **Zod validation** — All inputs validated before processing
3. **Repository pattern** — Business logic in entities, actions are thin wrappers
4. **Revalidation** — `revalidatePath` ensures UI updates after mutations
5. **Error handling** — Consistent `{ data, error }` return type

## Consequences

### Positive

- Type-safe end-to-end (TypeScript infers return types)
- Automatic serialization/deserialization
- Built-in CSRF protection
- Progressive enhancement (works without JavaScript)
- Simplified codebase (no API routes needed for mutations)
- Better developer experience

### Negative

- Less control over HTTP status codes
- Can't use standard REST tools (Postman, curl)
- Tightly coupled to Next.js ecosystem
- Limited streaming capabilities compared to API routes

### Mitigations

- API routes still used for external integrations (exchange rates)
- Comprehensive error handling with consistent response format
- Server Actions only for internal mutations, not public APIs

## Alternatives Considered

1. **API Routes** — Considered but more verbose for internal mutations
2. **tRPC** — Considered but adds complexity for this project size
3. **GraphQL** — Rejected: Overkill for this use case

## References

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Server Actions RFC](https://github.com/reactjs/rfcs/pull/229)
