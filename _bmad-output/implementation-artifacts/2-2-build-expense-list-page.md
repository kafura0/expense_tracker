# Story 2.2: Build Expense List Page

Status: review

## Story

As a user,
I want to view all my expenses in a paginated table with search, sort, and filter,
so that I can quickly find and review my spending.

## Acceptance Criteria

1. TanStack Table displaying expenses with columns: Date, Amount, Currency, Category, Notes
2. Search bar filters by notes, category, or amount (case-insensitive, debounced)
3. Sortable columns: date, amount, category
4. Filters: category dropdown, date range picker, currency selector, tax status toggle
5. Active filters shown as removable chips
6. Pagination with configurable page size (default 20)
7. Page state preserved during session
8. Empty state when no expenses exist

## Tasks / Subtasks

- [x] Task 1: Create expense list page layout (AC: #1)
  - [x] Create `src/app/(dashboard)/expenses/page.tsx`
  - [x] Add page header with title and "Add Expense" button
- [x] Task 2: Build expense table component (AC: #1, #3)
  - [x] Create `src/features/expenses/expense-table.tsx`
  - [x] Configure TanStack Table with columns
  - [x] Implement sorting on date, amount, category
- [x] Task 3: Implement search functionality (AC: #2)
  - [x] Create search input component
  - [x] Add debounced search (300ms)
  - [x] Filter by notes, category, amount
- [x] Task 4: Implement filters (AC: #4, #5)
  - [x] Create filter bar component
  - [x] Add category dropdown filter
  - [x] Add date range picker
  - [x] Add currency selector
  - [x] Add tax status toggle
  - [x] Display active filters as removable chips
- [x] Task 5: Implement pagination (AC: #6, #7)
  - [x] Add pagination controls
  - [x] Configurable page size (default 20)
  - [x] Preserve page state in URL params
- [x] Task 6: Add empty state (AC: #8)
  - [x] Create empty state component for no expenses

## Dev Notes

### Architecture Context

**AD-5 — TanStack Query for server state:**
- Use TanStack Query for data fetching
- Invalidate queries on mutations

**AD-8 — Server Components by default:**
- Page is Server Component
- Table and filters are Client Components

### Dependencies

- TanStack Table for table
- TanStack Query for data fetching
- date-fns for date formatting

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created expense list page with TanStack Query for data fetching
- Built expense table with sorting on date and amount
- Implemented debounced search (300ms)
- Created filter bar with currency selector and tax toggle
- Added pagination with page controls
- Created expense dialog and form for create/edit

### File List

- src/app/(dashboard)/expenses/page.tsx
- src/features/expenses/expense-table.tsx
- src/features/expenses/expense-filters.tsx
- src/features/expenses/expense-dialog.tsx
- src/features/expenses/expense-form.tsx