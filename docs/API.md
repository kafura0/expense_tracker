# Ledgerly API Documentation

## Overview

Ledgerly uses Next.js Server Actions for internal data mutations and API routes for external integrations. This document describes the available endpoints and their usage.

## Server Actions

Server Actions are functions that run on the server and can be called directly from client components. They handle all data mutations (create, update, delete).

### Expense Actions

**File:** `src/features/expenses/actions.ts`

#### `createExpense(expense: ExpenseInsert)`

Creates a new expense record.

**Parameters:**
```typescript
{
  amount_cents: number      // Amount in cents (e.g., 5000 = $50.00)
  currency: string          // ISO 4217 currency code (USD, EUR, GBP, KES, CAD, AUD, JPY)
  category_id: string       // UUID of the category
  date: string              // ISO 8601 date string
  notes?: string            // Optional notes (max 500 characters)
  tax_applicable: boolean   // Whether VAT/tax applies
}
```

**Returns:**
```typescript
{
  data: Expense | null      // Created expense or null on error
  error: string | null      // Error message or null on success
}
```

**Example:**
```typescript
const { data, error } = await createExpense({
  amount_cents: 4500,
  currency: 'USD',
  category_id: 'cat-123',
  date: '2024-01-15T10:30:00Z',
  notes: 'Client lunch',
  tax_applicable: true,
})
```

#### `updateExpense(id: string, expense: ExpenseUpdate)`

Updates an existing expense.

**Parameters:**
- `id` — UUID of the expense to update
- `expense` — Partial expense object with fields to update

**Returns:** Same as `createExpense`

#### `deleteExpense(id: string)`

Soft-deletes an expense (marks as deleted without removing data).

**Parameters:**
- `id` — UUID of the expense to delete

**Returns:**
```typescript
{
  error: string | null
}
```

#### `restoreExpense(id: string)`

Restores a soft-deleted expense.

**Parameters:**
- `id` — UUID of the expense to restore

**Returns:** Same as `createExpense`

#### `duplicateExpense(id: string)`

Creates a copy of an existing expense with today's date.

**Parameters:**
- `id` — UUID of the expense to duplicate

**Returns:** Same as `createExpense`

### Auth Actions

**File:** `src/features/auth/actions.ts`

#### `login(formData: Authenticates a user with email and password.

**Parameters:**
- FormData with `email` and `password` fields

**Returns:**
```typescript
{
  error?: string    // Error message if login fails
  success?: boolean // True if login succeeds
}
```

#### `logout()`

Signs out the current user and redirects to login page.

#### `resetPassword(formData: FormData)`

Sends a password reset email.

**Parameters:**
- FormData with `email` field

**Returns:**
```typescript
{
  error?: string
  success?: string  // Success message
}
```

### Settings Actions

**File:** `src/features/settings/actions.ts`

Handles user settings updates (base currency, VAT rate, theme).

## API Routes

### Exchange Rates

**Endpoint:** `GET /api/rates`

Fetches current exchange rates from the Frankfurter API.

**Query Parameters:**
- `base` (required) — Base currency code (e.g., `USD`, `EUR`, `KES`)

**Headers:**
- `Cookie` — Supabase session cookie (required)

**Response (200):**
```json
{
  "base": "USD",
  "rates": {
    "EUR": 0.85,
    "GBP": 0.73,
    "KES": 150.5,
    "CAD": 1.25,
    "AUD": 1.35,
    "JPY": 110.25
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

**Error Responses:**

- `401` — Authentication required
- `400` — Invalid base currency
- `500` — Failed to fetch rates

**Supported Currencies:**
USD, EUR, GBP, KES, CAD, AUD, JPY

**Rate Limiting:**
- 60 requests per minute per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Rate Limits

All endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Auth (login, register) | 5 requests | 1 minute |
| API routes | 60 requests | 1 minute |
| General | 100 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1705312800
```

When rate limited, response includes:
```json
{
  "error": "Too many requests. Please try again later."
}
```

## Security

### Authentication

All protected endpoints require a valid Supabase session cookie. The session is automatically refreshed by the middleware.

### Authorization

Row-Level Security (RLS) ensures users can only access their own data. Even if RLS is bypassed at the application level, the database enforces isolation.

### Input Validation

All inputs are validated using Zod schemas:
- Amounts must be positive integers (cents)
- Currency codes must be from the supported list
- Dates must be valid ISO 8601 strings
- Strings are sanitized to prevent XSS

## Error Handling

All errors follow a consistent format:

```typescript
{
  error: string  // Human-readable error message
  data: null     // Always null on error
}
```

**Common Error Messages:**
- "Invalid email or password" — Login failed
- "Expense not found" — Invalid expense ID
- "Failed to create expense" — Database error
- "Too many requests" — Rate limit exceeded
