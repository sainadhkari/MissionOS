export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Same as `formatDate` but with time-of-day — used where pipeline events
 * can land seconds apart on the same day (e.g. the AI Collaboration
 * Center's execution timeline) and a date-only stamp would collapse them. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
