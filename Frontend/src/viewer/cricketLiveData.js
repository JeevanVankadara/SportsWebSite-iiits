// Interpret the backend's documented delivery labels, including extras and wickets.
export function deliveryValue(value) {
  const token = String(value).replace(/\s*W\s*$/, '').trim()
  const extra = /^(wd|nb)(?:\+(\d+)(?:lb|b)?)?$/.exec(token)
  if (extra) return { runs: 1 + Number(extra[2] ?? 0), legal: false }
  return { runs: Number.parseInt(token, 10) || 0, legal: true }
}
export function overNumber(inning) {
  return inning.this_over_no ?? Math.floor(Math.max(0, inning.legal_balls - 1) / 6) + 1
}
export function retainObservedOvers(previous, next) {
  if (!next?.detail?.innings) return next
  return { ...next, detail: { ...next.detail, innings: next.detail.innings.map(inning => {
    const prior = previous?.detail?.innings?.find(row => String(row._id) === String(inning._id))
    const number = overNumber(inning)
    const saved = (prior?.observed_overs ?? []).filter(row => row.number < number)
    if (inning.this_over?.length) saved.push({ number, balls: [...inning.this_over], complete: inning.this_over.filter(ball => deliveryValue(ball).legal).length >= 6 })
    return { ...inning, observed_overs: saved.slice(-12) }
  }) } }
}
export function partnership(inning) {
  if (!Array.isArray(inning.fall_of_wickets)) return null
  if (inning.wickets > 0 && !inning.fall_of_wickets.length) return null
  const last = inning.fall_of_wickets.at(-1)
  return { runs: Math.max(0, inning.runs - (last?.runs ?? 0)), balls: Math.max(0, inning.legal_balls - (last?.balls ?? 0)) }
}
