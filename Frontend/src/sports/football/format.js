// Football labels, helpers, and formatters shared across admin and coordinator screens.

export const PERIOD_LABELS = {
  not_started: 'Pre-Match',
  first_half: '1st Half',
  half_time: 'Half Time',
  second_half: '2nd Half',
  extra_time_first_half: 'Extra Time 1H',
  extra_time_half_time: 'ET Break',
  extra_time_second_half: 'Extra Time 2H',
  penalties: 'Penalties',
  completed: 'Full Time',
}

export const EVENT_TYPE_LABELS = {
  goal: 'Goal',
  yellow_card: 'Yellow Card',
  red_card: 'Red Card',
  substitution: 'Sub',
}

export const GOAL_TYPE_LABELS = {
  regular: 'Goal',
  penalty: 'Penalty (P)',
  own_goal: 'Own Goal (OG)',
}

export function houseName(tournament, houseId) {
  return tournament?.houses.find((house) => house._id === houseId)?.house_name ?? 'Removed house'
}

export function fixtureResultText(fixture, team1, team2) {
  if (fixture.status === 'scheduled') return 'Not kicked off'
  if (fixture.status === 'live') {
    return `${team1} ${fixture.team1_score} – ${fixture.team2_score} ${team2} (${PERIOD_LABELS[fixture.clock?.period] || 'Live'})`
  }
  if (fixture.result_type === 'abandoned') {
    const score = `${fixture.team1_score} – ${fixture.team2_score}`
    if (fixture.result === 'draw') return `Abandoned at ${score}, declared a draw`
    return `Abandoned at ${score}, awarded to ${fixture.result === 'team1' ? team1 : team2}`
  }
  if (fixture.result === 'draw') return `Draw ${fixture.team1_score} – ${fixture.team2_score}`
  const winner = fixture.result === 'team1' ? team1 : team2
  return `${winner} won ${Math.max(fixture.team1_score, fixture.team2_score)} – ${Math.min(fixture.team1_score, fixture.team2_score)}`
}

/**
 * Calculates current elapsed seconds for the ticking match clock.
 */
export function calculateCurrentSeconds(clock, nowMs = Date.now()) {
  if (!clock) return 0
  let seconds = clock.elapsed_seconds || 0
  if (clock.is_running && clock.resumed_at) {
    const diff = Math.max(0, Math.floor((nowMs - new Date(clock.resumed_at).getTime()) / 1000))
    seconds += diff
  }
  return seconds
}

/**
 * Formats total seconds into MM:SS.
 */
export function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const id = (value) => String(value?._id ?? value ?? '')

// Events in match order: by minute, then in the order they were recorded.
export function sortEvents(events = []) {
  return [...events].sort((a, b) => a.minute - b.minute || new Date(a.created_at) - new Date(b.created_at))
}

// Who is on the pitch, on the bench or sent off for one house right now, from its lineup and the events so far.
// Without rolling substitutions, a player taken off cannot come back on. Players are the lineup's own objects.
export function rosterState(fixture, team) {
  const lineup = fixture[`${team}_lineup`] ?? {}
  const players = new Map([...(lineup.starters ?? []), ...(lineup.bench ?? [])].map((player) => [id(player), player]))
  const onPitch = new Set((lineup.starters ?? []).map(id))
  const bench = new Set((lineup.bench ?? []).map(id))
  const sentOff = new Set()
  const rolling = fixture.config?.rolling_subs ?? true

  for (const event of fixture.events ?? []) {
    if (event.team !== team) continue
    if (event.type === 'substitution') {
      if (onPitch.delete(id(event.player_out)) && rolling) bench.add(id(event.player_out))
      if (bench.delete(id(event.player_in))) onPitch.add(id(event.player_in))
    } else if (event.type === 'red_card' || event.card_type === 'second_yellow') {
      onPitch.delete(id(event.player))
      bench.delete(id(event.player))
      sentOff.add(id(event.player))
    }
  }

  const pick = (ids) => [...ids].map((key) => players.get(key)).filter(Boolean)
  return { onPitch: pick(onPitch), bench: pick(bench), sentOff: pick(sentOff), all: [...players.values()] }
}
