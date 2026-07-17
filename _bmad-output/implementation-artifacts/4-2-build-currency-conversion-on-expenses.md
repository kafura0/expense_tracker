# Story 4.2: Build Currency Conversion on Expenses

Status: ready-for-dev

## Story

As a user,
I want expenses in foreign currencies to be converted to my base currency,
so that I can see my total spending in a currency I understand.

## Acceptance Criteria

1. Currency selector on expense create/edit shows all supported currencies
2. Stored amount: original currency amount + cents
3. Converted amount: base currency equivalent calculated at creation
4. Dashboard summaries use base currency
5. Display original amount alongside converted amount
6. Precision: 2 decimal places for display, integer cents for storage

## Tasks / Subtasks

- [ ] Task 1: Add converted amount fields to expense (AC: #2, #3)
  - [ ] Create migration for converted_amount_cents, converted_currency, exchange_rate_used
- [ ] Task 2: Update expense form with conversion (AC: #1, #5)
  - [ ] Show converted amount when currency changes
  - [ ] Fetch rates from API
- [ ] Task 3: Update repository to store conversion (AC: #2, #3)
  - [ ] Calculate and store converted amount on create
- [ ] Task 4: Update dashboard to use base currency (AC: #4)
  - [ ] Sum converted_amount_cents instead of amount_cents

## Dev Notes

### Architecture Context

**Storage:**
- amount_cents: original amount in minor units
- converted_amount_cents: base currency equivalent
- exchange_rate_used: rate at time of conversion

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Added converted amount fields to expense schema
- Updated expense form to show converted amount
- Fetches and displays exchange rates
- Stores conversion data on expense creation

### File List

- src/entities/expense/schema.ts
- src/features/expenses/expense-form.tsx