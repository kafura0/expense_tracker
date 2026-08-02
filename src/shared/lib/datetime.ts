/**
 * datetime.ts
 *
 * Date/time helpers for Ledgerly forms.
 *
 * `<input type="datetime-local">` expects a local-time value in the form
 * `YYYY-MM-DDTHH:mm`, while the API stores ISO 8601 strings (UTC, with
 * offset). These helpers convert between the two so values are entered and
 * displayed in the user's local time instead of being shifted by the timezone.
 */

export function toLocalDateTimeLocal(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
