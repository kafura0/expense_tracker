# Story 2.3: Build Create & Edit Expense Forms

Status: review

## Story

As a user,
I want to create and edit expenses with a form that validates my input,
so that I can accurately record my financial transactions.

## Acceptance Criteria

1. Create Expense form: amount, currency, category, date, notes (optional), tax_applicable toggle
2. Edit Expense form pre-populated with existing values
3. Validation: required fields marked, negative amounts rejected
4. Currency selector shows all supported currencies (KES, USD, EUR, GBP, CAD, AUD, JPY)
5. Category selector shows user's categories
6. Success toast on create/edit
7. Form errors displayed inline
8. Keyboard navigable

## Tasks / Subtasks

- [x] Task 1: Create expense form component (AC: #1, #3, #7, #8)
  - [x] Create `src/features/expenses/expense-form.tsx`
  - [x] Use React Hook Form with Zod resolver
  - [x] Form fields: amount, currency, category, date, notes, tax_applicable
  - [x] Inline validation errors
- [x] Task 2: Create expense dialog (AC: #1, #2)
  - [x] Create `src/features/expenses/expense-dialog.tsx`
  - [x] Dialog wrapper for create/edit modes
  - [x] Pre-populate form for edit mode
- [x] Task 3: Implement currency selector (AC: #4)
  - [x] Add currency dropdown with KES, USD, EUR, GBP, CAD, AUD, JPY
- [x] Task 4: Implement category selector (AC: #5)
  - [x] Fetch user's categories
  - [x] Category dropdown component
- [x] Task 5: Add success feedback (AC: #6)
  - [x] Show toast on successful create/edit
  - [x] Close dialog and refresh list

## Dev Notes

### Architecture Context

**AD-4 — Zod as single validation source:**
- Import schema from entities/expense/schema.ts

**AD-1 — Server Actions as mutation boundary:**
- Form submits to Server Actions
- No direct DB calls from client

### Supported Currencies

KES, USD, EUR, GBP, CAD, AUD, JPY

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created expense form with React Hook Form and Zod validation
- Implemented currency selector with all supported currencies
- Created category selector that fetches user's categories
- Added success toast notifications
- Form handles both create and edit modes

### File List

- src/features/expenses/expense-form.tsx
- src/features/expenses/expense-dialog.tsx