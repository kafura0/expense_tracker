# Story 3.2: Build Spending Charts

Status: ready-for-dev

## Story

As a user,
I want to see interactive charts of my spending over time and by category,
so that I can visualize my financial patterns.

## Acceptance Criteria

1. Monthly trend line chart (Recharts) — last 6 months
2. Category donut chart — distribution by category for current month
3. Hover on chart shows exact amounts
4. Clicking category segment filters the recent activity list
5. Charts are keyboard navigable and have screen reader labels
6. Responsive resize handling
7. Empty state when no data

## Tasks / Subtasks

- [ ] Task 1: Create spending trend chart (AC: #1, #3, #6)
  - [ ] Create `src/widgets/dashboard/spending-trend-chart.tsx`
  - [ ] Use Recharts LineChart
  - [ ] Display last 6 months
  - [ ] Add hover tooltips
- [ ] Task 2: Create category breakdown chart (AC: #2, #3, #4)
  - [ ] Create `src/widgets/dashboard/category-chart.tsx`
  - [ ] Use Recharts PieChart (donut)
  - [ ] Display current month by category
  - [ ] Add click handler for filtering
- [ ] Task 3: Add accessibility (AC: #5)
  - [ ] Add aria-labels to charts
  - [ ] Ensure keyboard navigation
- [ ] Task 4: Add empty states (AC: #7)
  - [ ] Show empty state when no data

## Dev Notes

### Architecture Context

**Dependencies:**
- Recharts for charts
- date-fns for date formatting

### Design Tokens

- Primary: #4edea3
- Secondary: #c0c1ff
- Tertiary: #ffb3af
- Primary Container: #10b981

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created spending trend line chart with 6 months
- Created category donut chart
- Added custom tooltips
- Added accessibility labels
- Empty states

### File List

- src/widgets/dashboard/spending-trend-chart.tsx
- src/widgets/dashboard/category-chart.tsx