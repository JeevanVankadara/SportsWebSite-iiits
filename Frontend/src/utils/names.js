/**
 * Formats a player's display name for scorecards, match centres, and public views:
 * First name + first letter of the last name (e.g. "SIDDESHWER A", "Hari A").
 * Single names (e.g. "Rahul") remain as-is.
 */
export function formatPlayerName(val) {
  if (!val) return ''
  const name = typeof val === 'object' ? val.name : val
  if (!name || typeof name !== 'string') return ''
  const trimmed = name.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('sub [') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(5, -1).trim()
    return `sub [${formatPlayerName(inner)}]`
  }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const last = parts[parts.length - 1]
  const lastInitial = last[0] ? last[0].toUpperCase() : ''
  return lastInitial ? `${first} ${lastInitial}` : first
}
