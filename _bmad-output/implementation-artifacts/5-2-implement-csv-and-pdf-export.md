# Story 5.2: Implement CSV and PDF Export

Status: ready-for-dev

## Story

As a user,
I want to export my expenses as CSV or PDF,
so that I can share or archive my financial records.

## Acceptance Criteria

1. CSV export: Date, Amount, Currency, Category, Notes, Tax columns
2. PDF export: professional financial statement format with header, user name, date range
3. Export respects active filters
4. Downloads triggered immediately
5. Page numbers on multi-page PDF
6. UTF-8 encoding

## Tasks / Subtasks

- [ ] Task 1: Create CSV export utility (AC: #1, #6)
  - [ ] Create `src/shared/lib/csv-export.ts`
  - [ ] Generate CSV from expenses
- [ ] Task 2: Create PDF export utility (AC: #2, #5)
  - [ ] Create `src/shared/lib/pdf-export.ts`
  - [ ] Generate PDF with header, table, page numbers
- [ ] Task 3: Create export feature (AC: #3, #4)
  - [ ] Create `src/features/expenses/export-button.tsx`
  - [ ] Respect active filters
  - [ ] Trigger download

## Dev Notes

### Dependencies

- jsPDF for PDF generation
- Existing expense data from TanStack Query

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created CSV export utility
- Created PDF export utility with jsPDF
- Created export button component
- Supports filtered exports

### File List

- src/shared/lib/csv-export.ts
- src/shared/lib/pdf-export.ts
- src/features/expenses/export-button.tsx