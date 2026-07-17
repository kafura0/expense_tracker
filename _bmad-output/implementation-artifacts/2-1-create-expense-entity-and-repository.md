# Story 2.1: Create Expense Entity & Repository

Status: review

## Story

As a developer,
I want to create the expense entity with Zod schema, repository, and Server Actions,
so that expense data operations are encapsulated and type-safe.

## Acceptance Criteria

1. Zod schema for expense validation: amount (cents), currency, category_id, date, notes (optional), tax_applicable (boolean)
2. TypeScript types derived from Zod schema
3. Entity repository: findAll, findById, create, update, softDelete methods
4. Server Actions: createExpense, updateExpense, deleteExpense
5. RLS verified on all expense queries

## Tasks / Subtasks

- [x] Task 1: Create expense Zod schema (AC: #1, #2)
  - [x] Create `src/entities/expense/schema.ts`
  - [x] Define expenseSchema with amount_cents, currency, category_id, date, notes, tax_applicable
  - [x] Export TypeScript types from schema
- [x] Task 2: Create expense repository (AC: #3)
  - [x] Create `src/entities/expense/repository.ts`
  - [x] Implement findAll with filters and pagination
  - [x] Implement findById
  - [x] Implement create
  - [x] Implement update
  - [x] Implement softDelete
- [x] Task 3: Create expense Server Actions (AC: #4)
  - [x] Create `src/features/expenses/actions.ts`
  - [x] Implement createExpense action
  - [x] Implement updateExpense action
  - [x] Implement deleteExpense action
- [x] Task 4: Create expense types (AC: #2)
  - [x] Create `src/entities/expense/types.ts`
  - [x] Export Expense, ExpenseInsert, ExpenseUpdate types

## Dev Notes

### Architecture Context

**AD-4 — Zod as single validation source:**
- Schema in `entities/expense/schema.ts`
- Both forms and Server Actions import from this source

**AD-10 — Entity repositories encapsulate DB access:**
- Repository in `entities/expense/repository.ts`
- Features call repositories, never supabase.from() directly

**Data Conventions:**
- Amounts: Integer cents
- Dates: ISO 8601 UTC, timestamptz
- IDs: UUID v4

### File Structure

```
src/
├── entities/
│   └── expense/
│       ├── schema.ts
│       ├── repository.ts
│       └── types.ts
├── features/
│   └── expenses/
│       └── actions.ts
```

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created Zod schema with full validation for expenses
- Implemented repository with findAll (filters, pagination, sorting), findById, create, update, softDelete
- Created Server Actions with revalidation for all expense operations
- Added duplicate and restore actions for enhanced functionality

### File List

- src/entities/expense/schema.ts
- src/entities/expense/types.ts
- src/entities/expense/repository.ts
- src/features/expenses/actions.ts