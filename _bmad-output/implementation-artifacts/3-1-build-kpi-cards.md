# Story 3.1: Build KPI Cards

Status: ready-for-dev

## Story

As a user,
I want to see key spending metrics on my dashboard,
so that I can quickly understand my financial health.

## Acceptance Criteria

1. KPI cards: Total Monthly Spend, Transaction Count, Average Transaction Size
2. KPIs calculated from current month's expenses (in base currency)
3. Loading skeleton state while fetching
4. Numbers formatted with currency symbol and locale
5. Responsive grid layout (4 columns desktop, 2 tablet, 1 mobile)

## Tasks / Subtasks

- [ ] Task 1: Create KPI cards component (AC: #1, #4)
  - [ ] Create `src/widgets/dashboard/kpi-cards.tsx`
  - [ ] Display Total Monthly Spend
  - [ ] Display Transaction Count
  - [ ] Display Average Transaction Size
  - [ ] Format numbers with currency symbol
- [ ] Task 2: Add loading skeleton (AC: #3)
  - [ ] Create skeleton placeholder
  - [ ] Show while data is loading
- [ ] Task 3: Fetch and calculate KPIs (AC: #2)
  - [ ] Query current month's expenses
  - [ ] Calculate total spend
  - [ ] Calculate transaction count
  - [ ] Calculate average
- [ ] Task 4: Responsive grid layout (AC: #5)
  - [ ] 4 columns on desktop
  - [ ] 2 columns on tablet
  - [ ] 1 column on mobile

## Dev Notes

### Architecture Context

**AD-5 — TanStack Query for server state:**
- Use TanStack Query for data fetching

**Design Tokens (from template):**
- Primary: #4edea3
- Surface: #171f33
- On-surface: #dae2fd
- Glass card effect available

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created KPI cards with Total Spend, Transactions, Avg Expense, Net Spend
- Added loading skeletons
- Added comparison with last month
- Responsive grid layout

### File List

- src/widgets/dashboard/kpi-cards.tsx