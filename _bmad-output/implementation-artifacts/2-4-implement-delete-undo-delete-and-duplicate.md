# Story 2.4: Implement Delete, Undo Delete, and Duplicate

Status: review

## Story

As a user,
I want to delete expenses with confirmation, undo deletion, and duplicate expenses,
so that I have full control over my expense data.

## Acceptance Criteria

1. Delete with confirmation dialog
2. Soft delete (is_deleted flag + deleted_at timestamp)
3. Toast notification with Undo button for 30 seconds
4. Undo restores expense to original position
5. Duplicate creates new expense with same fields (date defaults to today)
6. User can modify duplicated expense before saving

## Tasks / Subtasks

- [x] Task 1: Implement delete with confirmation (AC: #1, #2)
  - [x] Create confirmation dialog component
  - [x] Call deleteExpense Server Action
  - [x] Update expense entity for soft delete
- [x] Task 2: Implement undo delete (AC: #3, #4)
  - [x] Create toast with Undo button
  - [x] Implement undo restore action
  - [x] 30-second timeout for undo
- [x] Task 3: Implement duplicate (AC: #5, #6)
  - [x] Create duplicate action
  - [x] Pre-populate form with duplicated data
  - [x] Default date to today
- [x] Task 4: Add actions to expense table (AC: #1, #5)
  - [x] Add action column to table
  - [x] Edit, Delete, Duplicate buttons

## Dev Notes

### Architecture Context

**AD-1 — Server Actions as mutation boundary:**
- Delete and duplicate use Server Actions

**Soft Delete Pattern:**
- Set is_deleted = true
- Set deleted_at = now()
- Queries filter by is_deleted = false

### Undo Pattern

1. User clicks Delete
2. Confirmation dialog appears
3. On confirm: soft delete + show toast with Undo
4. Toast lasts 30 seconds
5. If Undo clicked: restore expense

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Implemented delete with confirmation dialog
- Added undo delete functionality with 30-second timeout
- Created duplicate action that preserves all fields except date
- Updated expense table with action menu (Edit, Duplicate, Delete)
- Added toast notifications for all operations

### File List

- src/features/expenses/expense-table.tsx
- src/app/(dashboard)/expenses/page.tsx