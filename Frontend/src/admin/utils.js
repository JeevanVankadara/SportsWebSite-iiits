// Dates come from <input type="date"> and are stored as midnight UTC, so they are shown in UTC
// to keep the same calendar day for everyone.
const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDateRange(start, end) {
  if (start && end) return dateFormat.formatRange(new Date(start), new Date(end))
  if (start) return `From ${dateFormat.format(new Date(start))}`
  if (end) return `Until ${dateFormat.format(new Date(end))}`
  return ''
}

// "2026-09-26T00:00:00.000Z" -> "2026-09-26", the format <input type="date"> expects.
export function toDateInput(value) {
  return value ? value.slice(0, 10) : ''
}
