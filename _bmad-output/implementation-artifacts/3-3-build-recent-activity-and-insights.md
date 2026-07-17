# Story 3.3: Build Recent Activity & Insights

Status: ready-for-dev

## Story

As a user,
I want to see my recent transactions and spending insights on the dashboard,
so that I can take action on my latest expenses.

## Acceptance Criteria

1. Recent Activity list: last 10 expenses sorted by date descending
2. Quick actions: edit, delete from activity list
3. Dynamic Insights section: rule-based observations (e.g., "Spent 20% more on dining this month")
4. Tax Summary card: total VAT/tax from taxable expenses
5. Currency Summary card: breakdown by currency with converted totals

## Tasks / Subtasks

- [ ] Task 1: Create recent activity list (AC: #1, #2)
  - [ ] Create `src/widgets/dashboard/recent-activity.tsx`
  - [ ] Display last 10 expenses
  - [ ] Add edit/delete quick actions
- [ ] Task 2: Create insights section (AC: #3)
  - [ ] Create `src/widgets/dashboard/insights.tsx`
  - [ ] Implement rule-based observations
  - [ ] Show spending comparisons
- [ ] Task 3: Create tax summary card (AC: #4)
  - [ ] Create `src/widgets/dashboard/tax-summary.tsx`
  - [ ] Calculate total VAT from taxable expenses
- [ ] Task 4: Create currency summary card (AC: #5)
  - [ ] Create `src/widgets/dashboard/currency-summary.tsx`
  - [ ] Breakdown by currency
  - [ ] Show totals

## Dev Notes

### Architecture Context

**Insights Rules:**
- Compare current month to previous month
- Identify highest spending category
- Calculate percentage changes

### Design Tokens

- Glass card effect for cards
- Primary: #4edea3 for highlights
- Surface container for backgrounds

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created recent activity list with last 10 expenses
- Created insights with rule-based observations
- Created tax summary card
- Created currency summary card

### File List

- src/widgets/dashboard/recent-activity.tsx
- src/widgets/dashboard/insights.tsx
- src/widgets/dashboard/tax-summary.tsx
- src/widgets/dashboard/currency-summary.tsx