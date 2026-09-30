// Cricket labels and small calculations shared by the admin and co-ordinator screens.
// The server decides every rule; these only mirror it for what the screen shows.

export const TEAMS = ['team1', 'team2']
export const PLAYING_XI = 11
export const MAX_SUBSTITUTES = 3
export const BALLS_PER_OVER = 6
export const SUPER_OVER_WICKETS = 2

export const DISMISSAL_LABELS = {
  bowled: 'Bowled',
  caught: 'Caught',
  lbw: 'LBW',
  run_out: 'Run out',
  stumped: 'Stumped',
  hit_wicket: 'Hit wicket',
}

export const FIELDER_DISMISSALS = ['caught', 'run_out', 'stumped']

export const otherTeam = (team) => (team === 'team1' ? 'team2' : 'team1')
export const sameId = (a, b) => a != null && b != null && String(a) === String(b)

export function houseName(tournament, houseId) {
  return tournament?.houses.find((house) => house._id === houseId)?.house_name ?? 'Removed house'
}

export function oversText(balls) {
  return `${Math.floor(balls / BALLS_PER_OVER)}.${balls % BALLS_PER_OVER}`
}

export function runRate(runs, balls) {
  return balls ? ((runs * BALLS_PER_OVER) / balls).toFixed(2) : '0.00'
}

export function strikeRate(runs, balls) {
  return balls ? ((runs * 100) / balls).toFixed(1) : '–'
}

export function nrrText(nrr) {
  return `${nrr > 0 ? '+' : ''}${nrr.toFixed(3)}`
}

export function ballsLeft(innings) {
  return Math.max(0, innings.overs * BALLS_PER_OVER - innings.legal_balls)
}

export function setupComplete(fixture) {
  return Boolean(fixture.overs) && fixture.team1_players.length === PLAYING_XI && fixture.team2_players.length === PLAYING_XI
}

export function inningsTitle(innings) {
  if (innings.super_over > 0) return innings.super_over > 1 ? `Super over ${innings.super_over}` : 'Super over'
  return innings.innings_no === 1 ? '1st innings' : '2nd innings'
}

// id -> player, for the names in scorecards. Substitutes are marked so they show as "sub [Name]".
export function playerIndex(fixture) {
  const players = new Map()
  for (const team of TEAMS) {
    for (const player of fixture[`${team}_players`]) players.set(player._id, player)
    for (const player of fixture[`${team}_substitutes`]) players.set(player._id, { ...player, substitute: true })
  }
  return players
}

export function playerName(players, id) {
  const player = players.get(String(id))
  if (!player) return 'Unknown player'
  return player.substitute ? `sub [${player.name}]` : player.name
}

export function dismissalText(dismissal, players) {
  const bowler = dismissal.bowler ? playerName(players, dismissal.bowler) : ''
  const fielder = dismissal.fielder ? playerName(players, dismissal.fielder) : ''
  switch (dismissal.kind) {
    case 'bowled':
      return `b ${bowler}`
    case 'caught':
      return sameId(dismissal.fielder, dismissal.bowler) ? `c & b ${bowler}` : `c ${fielder || '?'} b ${bowler}`
    case 'lbw':
      return `lbw b ${bowler}`
    case 'stumped':
      return `st ${fielder || '?'} b ${bowler}`
    case 'hit_wicket':
      return `hit wicket b ${bowler}`
    default:
      return fielder ? `run out (${fielder})` : 'run out'
  }
}

// Wickets that can happen on a delivery, as the server allows them.
export function allowedDismissals(kind, freeHit) {
  if (freeHit) return ['run_out']
  if (kind === 'run') return Object.keys(DISMISSAL_LABELS)
  if (kind === 'wide') return ['stumped', 'hit_wicket', 'run_out']
  return ['run_out']
}

// "86/3 (11.4)" for a team's innings in the match itself, or '' if they have not batted.
export function teamScore(fixture, team) {
  const innings = fixture.innings.find((item) => item.super_over === 0 && item.batting_team === team)
  return innings ? `${innings.runs}/${innings.wickets} (${oversText(innings.legal_balls)})` : ''
}

export function superOverScores(fixture, team) {
  return fixture.innings
    .filter((item) => item.super_over > 0 && item.batting_team === team)
    .map((item) => `${item.runs}/${item.wickets}`)
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

export function resultText(fixture, names) {
  if (fixture.status === 'scheduled') return 'Not started yet'
  if (fixture.status === 'live') return 'In progress'
  if (fixture.result === 'tie') return 'Match tied'
  if (fixture.result === 'no_result') return 'No result'
  const winner = names[fixture.result]
  if (fixture.result_type === 'abandoned') return `${winner} awarded the match`
  const { by, value } = fixture.margin ?? {}
  if (by === 'runs') return `${winner} won by ${plural(value, 'run')}`
  if (by === 'wickets') return `${winner} won by ${plural(value, 'wicket')}`
  return `${winner} won the super over`
}

// Scores are level after a full pair of innings and the referee has not settled it yet.
export function isTied(fixture, innings) {
  const last = innings.at(-1)
  if (!last || last.innings_no % 2 === 1 || last.status !== 'completed' || fixture.tie_accepted) return false
  return innings.at(-2).runs === last.runs
}

// The innings that starts next, as the server plans it: first innings from the toss, the chase,
// or a super over where the side that batted second bats first.
export function nextInnings(fixture, innings) {
  const last = innings.at(-1)
  if (!last) {
    const { winner, decision } = fixture.toss
    return { innings_no: 1, super_over: 0, batting_team: decision === 'bat' ? winner : otherTeam(winner), target: null }
  }
  if (last.status !== 'completed') return null
  if (last.innings_no % 2 === 1) {
    return {
      innings_no: last.innings_no + 1,
      super_over: last.super_over,
      batting_team: otherTeam(last.batting_team),
      target: last.runs + 1,
    }
  }
  if (!isTied(fixture, innings)) return null
  return { innings_no: last.innings_no + 1, super_over: last.super_over + 1, batting_team: last.batting_team, target: null }
}

export function completeText(innings) {
  if (innings.complete_reason === 'target') return 'Target reached'
  if (innings.complete_reason === 'all_out') {
    return innings.super_over > 0 ? `${SUPER_OVER_WICKETS} wickets down` : 'All out'
  }
  return innings.super_over > 0 ? 'Over done' : 'Overs done'
}
