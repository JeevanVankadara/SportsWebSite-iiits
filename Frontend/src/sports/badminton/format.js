import { formatPlayerName } from '../../utils/names.js'

// Badminton labels and the scoring rule, shared by the admin and co-ordinator screens.
// The server checks every result; the rule here only gives instant feedback while typing.

export const MATCH_TYPE_LABELS = { singles: 'Singles', doubles: 'Doubles' }
export const SETS_OPTIONS = [3, 1]
export const POINTS_OPTIONS = [21, 15, 11]
export const MAX_MATCHES = 9

// The usual team-event order: singles, singles, doubles, singles, doubles, best of 3 to 21.
export const DEFAULT_ORDER = ['singles', 'singles', 'doubles', 'singles', 'doubles'].map((type) => ({
  type,
  sets_count: 3,
  points_to_win: 21,
}))

// Players each house puts on court.
export function playersPerSide(type) {
  return type === 'doubles' ? 2 : 1
}

// Sets needed to win a match: 1 of 1, or 2 of 3.
export function setsToWin(setsCount) {
  return Math.floor(setsCount / 2) + 1
}

export function houseName(tournament, houseId) {
  return tournament?.houses.find((house) => house._id === houseId)?.house_name ?? 'Removed house'
}

export function formatLabel(match) {
  return `${match.sets_count === 1 ? '1 set' : 'Best of 3'} · to ${match.points_to_win}`
}

export function ruleHint(match) {
  const deuce = match.point_cap - 1
  return `Sets to ${match.points_to_win}: win by 2 points; at ${deuce}-${deuce} the next point wins.`
}

// 'team1' or 'team2' once the score finishes the set, otherwise null.
export function setWinner(team1Points, team2Points, pointsToWin, pointCap) {
  const high = Math.max(team1Points, team2Points)
  const finished = high === pointCap || (high >= pointsToWin && Math.abs(team1Points - team2Points) >= 2)
  if (!finished) return null
  return team1Points > team2Points ? 'team1' : 'team2'
}

export function playerNames(players) {
  return players.map((player) => formatPlayerName(player.name)).join(' & ')
}

export function fixtureResultText(fixture, team1, team2) {
  if (fixture.status === 'scheduled') return 'Not started yet'
  if (fixture.status === 'live') return 'In progress'
  if (fixture.result === 'draw') return 'Fixture drawn'
  return `${fixture.result === 'team1' ? team1 : team2} won the fixture`
}
