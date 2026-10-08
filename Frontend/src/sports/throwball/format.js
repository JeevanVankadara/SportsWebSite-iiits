import { formatPlayerName } from '../../utils/names.js'

// Throwball labels, helpers and formatters shared by the admin, co-ordinator and viewer screens.

export const TEAMS = ['team1', 'team2']
export const otherTeam = (team) => (team === 'team1' ? 'team2' : 'team1')

// Fixed squad shape and best-of-3 format. Mirrors the server (models/sports/throwball/constants.js).


export const DEFAULT_CONFIG = { points_to_win: 15, point_cap: 17, players_on_court: 7, max_substitutes: 5, match_sets: 3 }

export const configOf = (fixture) => ({ ...DEFAULT_CONFIG, ...(fixture?.config ?? {}) })

export function houseName(tournament, houseId) {
  return tournament?.houses?.find((house) => house._id === houseId)?.house_name ?? 'Removed house'
}

export const setsToWin = (matchSets = 3) => Math.floor(matchSets / 2) + 1

// 'team1' or 'team2' once the score finishes the set, otherwise null.
export function setWinner(team1Points, team2Points, pointsToWin, pointCap) {
  const high = Math.max(team1Points, team2Points)
  const finished = high >= pointCap || (high >= pointsToWin && Math.abs(team1Points - team2Points) >= 2)
  if (!finished) return null
  return team1Points > team2Points ? 'team1' : 'team2'
}

// A short line describing the fixture's state, used in cards and headers.
export function fixtureResultText(fixture, team1, team2) {
  const sets = `${fixture.team1_sets_won ?? 0}–${fixture.team2_sets_won ?? 0}`
  if (fixture.status === 'scheduled') return 'Not started'
  if (fixture.status === 'live') {
    const live = (fixture.sets ?? []).find((set) => set.status === 'live')
    if (live) return `Set ${live.set_no} · ${live.team1_points}–${live.team2_points} (sets ${sets})`
    return `Live · ${sets} sets`
  }
  if (fixture.result_type === 'abandoned') {
    if (fixture.result === 'draw') return `Abandoned at ${sets}, declared a draw`
    return `Abandoned, awarded to ${fixture.result === 'team1' ? team1 : team2}`
  }
  if (fixture.result === 'draw') return `Tied ${sets}`
  const winner = fixture.result === 'team1' ? team1 : team2
  return `${winner} won ${sets} in sets`
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

// One line describing a substitution, e.g. "Ravi off, Kiran on".
export function describeSub(event, players) {
  const name = (id) => formatPlayerName(players.get(id)?.name ?? players.get(String(id))?.name ?? 'Unknown')
  return `${name(event.player_out)} off, ${name(event.player_in)} on`
}
