import { addDays, addMonths, addYears } from 'date-fns'
import type { RecurringFrequency } from './schema'

/**
 * Advance a due date by one frequency period.
 *
 * Weekly/monthly/yearly are calendar-aware (date-fns addMonths/addYears),
 * so monthly on Jan 31 rolls to Feb 28 (or 29), not to Feb 31.
 */
export function advanceDueDate(due: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case 'weekly':
      return addDays(due, 7)
    case 'monthly':
      return addMonths(due, 1)
    case 'yearly':
      return addYears(due, 1)
  }
}

/**
 * Compute the materialization schedule for a template whose `next_due_date`
 * may be behind schedule. Returns the missed due dates (inclusive of today)
 * that need an expense row, plus the next due date strictly after today.
 *
 * Example: monthly template due Jan 1, today Mar 20 →
 *   missed: [Jan 1, Feb 1, Mar 1], next: Apr 1.
 */
export function buildMissedSchedule(
  nextDue: Date,
  frequency: RecurringFrequency,
  today: Date
): { missed: Date[]; next: Date } {
  const missed: Date[] = []
  let cursor = new Date(nextDue)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  while (cursor.getTime() <= startOfToday.getTime()) {
    missed.push(cursor)
    cursor = advanceDueDate(cursor, frequency)
  }

  return { missed, next: cursor }
}
