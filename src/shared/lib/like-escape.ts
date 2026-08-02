/**
 * Escapes PostgreSQL ILIKE/LIKE metacharacters so user-supplied search input
 * cannot widen a match (e.g. "100%" matching everything). Postgres's default
 * LIKE escape character is a backslash.
 */
export function escapeLikePattern(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}
