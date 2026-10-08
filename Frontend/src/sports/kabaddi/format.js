import { formatPlayerName } from '../../utils/names.js'

// Kabaddi labels, helpers and formatters shared by the admin and co-ordinator screens.

export const TEAMS = ['team1', 'team2']
export const otherTeam = (team) => (team === 'team1' ? 'team2' : 'team1')

export const PERIOD_LABELS = {
  not_started: 'Not started',
  first_half: '1st half',
  half_time: 'Half time',
  second_half: '2nd half',
  completed: 'Full time',
}

export const EVENT_LABELS = {
  raid: 'Raid',
  tackle: 'Tackle',
  line_out: 'Line out',
  technical: 'Technical',
  correction: 'Correction',
  substitution: 'Sub',
  score_change: 'Score changed',
}

// The one badge an event shows in a timeline. A super raid or super tackle replaces the plain
// Raid/Tackle badge (in red) instead of being shown as a second badge.
export function eventBadge(event, entry) {
  if (entry?.super_raid) return { label: 'Super raid', tone: 'super' }
  if (entry?.super_tackle) return { label: 'Super tackle', tone: 'super' }
  // Counter-based scoring stores tackles as raid events; label their outcome in the log.
  if (event.type === 'raid' && event.defending_points > 0 && event.tackler && !event.is_self_out) {
    return { label: 'Tackle', tone: 'tackle' }
  }
  return { label: EVENT_LABELS[event.type] ?? event.type, tone: event.type }
}

// Same defaults as the server (models/sports/kabaddi/constants.js).
export const DEFAULT_CONFIG = {
  players_on_court: 7,
  max_substitutes: 5,
  half_duration_minutes: 20,
  all_out_points: 2,
  bonus_enabled: true,
  super_tackle_enabled: true,
  super_tackle_threshold: 3,
  super_tackle_points: 2,
  super_raid_min_points: 3,
  do_or_die_enabled: false,
  do_or_die_after_empty_raids: 2,
}

export const configOf = (fixture) => ({ ...DEFAULT_CONFIG, ...(fixture?.config ?? {}) })

export function houseName(tournament, houseId) {
  return tournament?.houses?.find((house) => house._id === houseId)?.house_name ?? 'Removed house'
}

export function fixtureResultText(fixture, team1, team2) {
  const score = `${fixture.team1_score} – ${fixture.team2_score}`
  if (fixture.status === 'scheduled') return 'Not started'
  if (fixture.status === 'live') return `${PERIOD_LABELS[fixture.clock?.period] ?? 'Live'} · ${score}`
  if (fixture.result_type === 'abandoned') {
    if (fixture.result === 'draw') return `Abandoned at ${score}, declared a draw`
    return `Abandoned at ${score}, awarded to ${fixture.result === 'team1' ? team1 : team2}`
  }
  if (fixture.result === 'draw') return `Tied ${score}`
  const winner = fixture.result === 'team1' ? team1 : team2
  return `${winner} won by ${Math.abs(fixture.team1_score - fixture.team2_score)} points (${score})`
}

// Seconds left in the current half; the kabaddi clock counts down.
export function remainingSeconds(fixture, nowMs = Date.now()) {
  const clock = fixture.clock ?? {}
  let elapsed = clock.elapsed_seconds || 0
  if (clock.is_running && clock.resumed_at) {
    elapsed += Math.max(0, Math.floor((nowMs - new Date(clock.resumed_at).getTime()) / 1000))
  }
  return Math.max(0, configOf(fixture).half_duration_minutes * 60 - elapsed)
}

export function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Map of player id -> player, from both lineups (every player in an event is in a lineup).
export function lineupPlayers(fixture) {
  const players = new Map()
  for (const team of TEAMS) {
    const lineup = fixture[`${team}_lineup`] ?? {}
    for (const player of [...(lineup.starters ?? []), ...(lineup.bench ?? [])]) {
      if (player?._id) {
        players.set(player._id, player)
        players.set(String(player._id), player)
      }
    }
  }
  return players
}

// One line describing an event, e.g. "Ravi touched Kiran, Arun + bonus · Sai stepped out".
export function describeEvent(event, players) {
  const name = (id) => formatPlayerName(players.get(id)?.name ?? players.get(String(id))?.name ?? 'Unknown')
  const names = (ids = []) => ids.map(name).join(', ')

  switch (event.type) {
    case 'raid': {
      const rName = name(event.raider)
      if (event.points != null || event.defending_points != null) {
        const parts = []
        if (event.points > 0) parts.push(`${event.points} pt${event.points > 1 ? 's' : ''}`)
        if (event.bonus) parts.push('bonus')

        const raidDesc = parts.length ? `${rName} scored ${parts.join(' + ')}` : `${rName} empty raid`

        if (event.defending_points > 0) {
          const tacklerDesc = event.is_self_out
            ? `raider self-out (+${event.defending_points})`
            : `tackled by ${name(event.tackler)} (+${event.defending_points})`
          return parts.length ? `${raidDesc} · ${tacklerDesc}` : `${rName} ${tacklerDesc}`
        }
        return raidDesc
      }

      // touched lists every defender who went out; stepped_out marks the ones who crossed the line.
      const stepped = new Set((event.stepped_out ?? []).map(String))
      const touched = (event.touched ?? []).filter((id) => !stepped.has(String(id)))
      const lineOuts = (event.touched ?? []).filter((id) => stepped.has(String(id)))
      const parts = []
      if (touched.length) parts.push(`touched ${names(touched)}`)
      if (event.bonus) parts.push(touched.length ? '+ bonus' : 'bonus')
      const raid = parts.length ? parts.join(' ') : lineOuts.length ? 'came back' : 'empty raid'
      return `${rName} ${raid}${lineOuts.length ? ` · ${names(lineOuts)} stepped out` : ''}`
    }
    case 'tackle':
      return `${name(event.raider)} tackled by ${name(event.tackler)}${event.assists?.length ? ` (with ${names(event.assists)})` : ''}`
    case 'line_out':
      return `${name(event.raider)} stepped out while raiding`
    case 'substitution':
      return `${name(event.player_out)} off, ${name(event.player_in)} on`
    default:
      if (event.type === 'score_change') {
        const mat = `On mat: ${event.team1_on_mat ?? '—'} vs ${event.team2_on_mat ?? '—'}`
        const desc = `Score changed to ${event.team1_score}–${event.team2_score} (${mat})`
        return event.note ? `${desc} · ${event.note}` : desc
      }
      if (event.type === 'correction') {
        const pts = event.points != null ? (event.points > 0 ? `+${event.points}` : `${event.points}`) : ''
        const prefix = pts ? `Score correction (${pts})` : 'Score correction'
        return event.note ? `${prefix} · ${event.note}` : prefix
      }
      return event.note || ''
  }
}
