// Date helpers shared by the admin and co-ordinator screens.
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

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

// Fixture times are real moments, so they are shown in the viewer's own time zone.
export function formatDateTime(value) {
  return value ? dateTimeFormat.format(new Date(value)) : ''
}

// ISO time -> "2026-09-27T16:30" in local time, the format <input type="datetime-local"> expects.
export function toDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
