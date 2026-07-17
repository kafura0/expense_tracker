# Story 4.3: Implement VAT/Tax Engine

Status: ready-for-dev

## Story

As a user,
I want configurable VAT/tax applied to my expenses,
so that I can track tax-eligible spending accurately.

## Acceptance Criteria

1. VAT engine: pure function calculateVAT(amount, rate) returns { tax, total }
2. Tax shown alongside expense amount when tax_applicable = true
3. Total tax summary on dashboard
4. VAT rate configured in Settings (default 16%)
5. Rate changes apply to new expenses only
6. Historical expenses retain original rate

## Tasks / Subtasks

- [ ] Task 1: Create VAT utility function (AC: #1)
  - [ ] Create `src/shared/lib/vat.ts`
  - [ ] calculateVAT function
- [ ] Task 2: Update expense form with tax toggle (AC: #2)
  - [ ] Add is_taxable toggle
  - [ ] Show tax amount when enabled
- [ ] Task 3: Store tax rate on expense (AC: #5, #6)
  - [ ] Create migration for tax_rate_used on expenses
- [ ] Task 4: Update dashboard tax summary (AC: #3)
  - [ ] Use tax_amount_cents from expenses

## Dev Notes

### Architecture Context

**VAT Calculation:**
- tax = amount * (rate / 100)
- total = amount + tax
- Store as integer cents

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created VAT utility function
- Updated expense form with tax toggle
- Shows tax amount when enabled
- Stores tax rate and amount on expense

### File List

- src/shared/lib/vat.ts
- src/features/expenses/expense-form.tsx