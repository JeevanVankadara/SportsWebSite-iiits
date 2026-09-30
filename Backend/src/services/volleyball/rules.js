// Volleyball rules. Pure functions, no database calls.
//
// Scoring works exactly like badminton: a set is won at points_to_win with a 2-point lead, or at
// point_cap. The court state (who is on and who is on the bench) is not stored: it is rebuilt by
// replaying the substitution events over the starters, so undoing an event puts everything back.
import { SETS_TO_WIN } from '../../models/sports/volleyball/constants.js';

export const otherTeam = (team) => (team === 'team1' ? 'team2' : 'team1');

// Works for ObjectIds, populated players ({ _id }) and plain strings.
export const idOf = (value) => (value?._id ? String(value._id) : value ? String(value) : null);
const idsOf = (values = []) => values.map(idOf).filter(Boolean);

// Sets a house needs to win the match (best of 3 -> 2).
export function setsToWin() {
  return SETS_TO_WIN;
}

// 'team1' or 'team2' once the score finishes the set, otherwise null.
// A set ends when a side reaches the target with a 2-point lead, or reaches the cap.
export function setWinner(team1Points, team2Points, pointsToWin, pointCap) {
  const high = Math.max(team1Points, team2Points);
  const finished = high >= pointCap || (high >= pointsToWin && Math.abs(team1Points - team2Points) >= 2);
  if (!finished) return null;
  return team1Points > team2Points ? 'team1' : 'team2';
}

// Returns why a set score is impossible (e.g. 30-10 in a set to 25 capped at 27), or null if it can
// happen. Unfinished scores such as 15-12 are possible; whether they are allowed is up to the caller.
export function invalidSetScore(team1Points, team2Points, pointsToWin, pointCap) {
  const points = [team1Points, team2Points];
  if (!points.every((value) => Number.isInteger(value) && value >= 0)) {
    return 'Points must be whole numbers, 0 or more';
  }
  if (points.some((value) => value > pointCap)) return `No side can score more than ${pointCap} points`;

  const high = Math.max(...points);
  const low = Math.min(...points);
  const finished = high >= pointCap || (high >= pointsToWin && high - low >= 2);
  if (!finished) return null;

  const possible =
    (high === pointsToWin && low <= pointsToWin - 2) || // e.g. 25-18
    (high > pointsToWin && high < pointCap && high - low === 2) || // deuce below the cap, e.g. 26-24
    (high === pointCap && low >= pointCap - 2); // cap reached, e.g. 27-25 or 27-26
  return possible ? null : `${team1Points}-${team2Points} is not a possible final score in a set to ${pointsToWin}`;
}

// Who has won the match if the set in play ends with setWinnerTeam winning it, or null.
export function matchWinnerIfSetEnds(fixture, setWinnerTeam) {
  const needed = setsToWin();
  const team1 = fixture.team1_sets_won + (setWinnerTeam === 'team1' ? 1 : 0);
  const team2 = fixture.team2_sets_won + (setWinnerTeam === 'team2' ? 1 : 0);
  if (team1 >= needed) return 'team1';
  if (team2 >= needed) return 'team2';
  return null;
}

export function determineWinner(team1SetsWon, team2SetsWon) {
  if (team1SetsWon > team2SetsWon) return 'team1';
  if (team2SetsWon > team1SetsWon) return 'team2';
  return 'draw';
}

function startingSide(lineup) {
  return {
    on_court: idsOf(lineup?.starters),
    bench: idsOf(lineup?.bench),
    subbed_off: [],
  };
}

/**
 * Replays every substitution of a fixture.
 * Returns { sides, timeline }:
 *  - sides: per house { on_court, bench, subbed_off }
 *  - timeline: per event { set_no, player_out, player_in } — the running substitution log
 * Substitutions are free: a player can go off and come back on later, so a player who is subbed off
 * simply returns to the bench pool.
 */
export function replayMatch(fixture) {
  const sides = { team1: startingSide(fixture.team1_lineup), team2: startingSide(fixture.team2_lineup) };
  const timeline = [];

  for (const event of fixture.events ?? []) {
    if (event.type !== 'substitution') continue;
    const side = sides[event.team];
    const outgoing = idOf(event.player_out);
    const incoming = idOf(event.player_in);
    const index = side.on_court.indexOf(outgoing);
    const benchIndex = side.bench.indexOf(incoming);
    if (index !== -1 && benchIndex !== -1) {
      side.on_court[index] = incoming;
      side.bench.splice(benchIndex, 1);
      side.bench.push(outgoing);
      if (!side.subbed_off.includes(outgoing)) side.subbed_off.push(outgoing);
    }
    timeline.push({ set_no: event.set_no ?? null, player_out: outgoing, player_in: incoming });
  }

  return { sides, timeline };
}

// Totals across every set of the fixture: sets won and points scored by each house. Used for the
// live score, the result and the points table. Cut-short sets of an abandoned match count too.
export function scoreSummary(fixture) {
  let team1Sets = 0;
  let team2Sets = 0;
  let team1Points = 0;
  let team2Points = 0;
  for (const set of fixture.sets ?? []) {
    if (set.winner === 'team1') team1Sets += 1;
    else if (set.winner === 'team2') team2Sets += 1;
    team1Points += set.team1_points ?? 0;
    team2Points += set.team2_points ?? 0;
  }
  return { team1Sets, team2Sets, team1Points, team2Points };
}
