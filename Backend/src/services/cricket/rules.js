// Cricket scoring rules. Pure functions: no database, so the same rules can be mirrored on screen.
import {
  BALLS_PER_OVER,
  PLAYING_XI,
  SUPER_OVER_OVERS,
  SUPER_OVER_WICKETS,
} from '../../models/sports/cricket/constants.js';

const DISMISSAL_LABELS = {
  bowled: 'bowled',
  caught: 'caught',
  lbw: 'lbw',
  run_out: 'run out',
  stumped: 'stumped',
  hit_wicket: 'out hit wicket',
};

// Deliveries each dismissal can happen on. Run out can happen on any ball, including a free hit.
const DISMISSED_ON = {
  bowled: ['run'],
  caught: ['run'],
  lbw: ['run'],
  stumped: ['run', 'wide'],
  hit_wicket: ['run', 'wide'],
};

const same = (a, b) => a != null && b != null && String(a) === String(b);

export function otherTeam(team) {
  return team === 'team1' ? 'team2' : 'team1';
}

export function isLegal(kind) {
  return kind !== 'wide' && kind !== 'no_ball';
}

export function oversText(balls) {
  return `${Math.floor(balls / BALLS_PER_OVER)}.${balls % BALLS_PER_OVER}`;
}

export function setupComplete(fixture) {
  return (
    Boolean(fixture.overs) &&
    fixture.team1_players.length === PLAYING_XI &&
    fixture.team2_players.length === PLAYING_XI
  );
}

// What one delivery adds to the team, the batter and the bowler. `runs` never includes the
// 1-run wide or no-ball penalty, so a plain wide is exactly 1.
export function ballValue({ kind, runs, nb_runs_as: nbRunsAs = 'bat' }) {
  const value = {
    total: runs,
    bat: 0,
    bowler: 0,
    wides: 0,
    no_balls: 0,
    byes: 0,
    leg_byes: 0,
    legal: isLegal(kind),
    faced: kind !== 'wide',
  };
  if (kind === 'run') {
    value.bat = runs;
    value.bowler = runs;
  } else if (kind === 'wide') {
    value.total = runs + 1;
    value.wides = runs + 1;
    value.bowler = runs + 1;
  } else if (kind === 'no_ball') {
    value.total = runs + 1;
    value.no_balls = 1;
    if (nbRunsAs === 'bat') {
      value.bat = runs;
      value.bowler = runs + 1;
    } else {
      value[nbRunsAs === 'bye' ? 'byes' : 'leg_byes'] = runs;
      value.bowler = 1;
    }
  } else if (kind === 'bye') {
    value.byes = runs;
  } else if (kind === 'leg_bye') {
    value.leg_byes = runs;
  }
  return value;
}

// Short label for the "this over" chips: 4, wd, wd+2, nb+4, nb+2b, 1lb, W.
export function ballLabel({ kind, runs, nb_runs_as: nbRunsAs, wicket }) {
  let label = String(runs);
  if (kind === 'wide') label = runs ? `wd+${runs}` : 'wd';
  if (kind === 'bye') label = `${runs}b`;
  if (kind === 'leg_bye') label = `${runs}lb`;
  if (kind === 'no_ball') {
    const suffix = { bat: '', bye: 'b', leg_bye: 'lb' }[nbRunsAs] ?? '';
    label = runs ? `nb+${runs}${suffix}` : 'nb';
  }
  if (!wicket) return label;
  return kind === 'run' && runs === 0 ? 'W' : `${label} W`;
}

// Why a wicket cannot have happened on this ball, or null if it can.
export function dismissalProblem({ kind, runs, wicket }, crease) {
  if (!wicket) return null;
  const onStrike = same(wicket.player_out, crease.striker);

  if (wicket.kind === 'run_out') {
    return onStrike || same(wicket.player_out, crease.non_striker) ? null : 'Only a batter at the crease can be run out';
  }
  if (crease.free_hit) return 'On a free hit the batter can only be run out';
  if (!onStrike) return `Only the striker can be ${DISMISSAL_LABELS[wicket.kind]}`;
  if (!DISMISSED_ON[wicket.kind].includes(kind)) {
    if (kind === 'wide') return 'Off a wide the batter can only be stumped, run out or out hit wicket';
    return 'Off a no-ball, bye or leg bye the batter can only be run out';
  }
  if (runs > 0) return `No runs count when the batter is ${DISMISSAL_LABELS[wicket.kind]}`;
  return null;
}

// Who is where after a ball. Batters cross on odd runs, the out batter's end is left empty for
// the new batter, ends change after the over, and the bowler is cleared so the next one can be picked.
export function nextCrease(before, ball, overComplete) {
  let striker = before.striker;
  let nonStriker = before.non_striker;
  if (ball.runs % 2 === 1) [striker, nonStriker] = [nonStriker, striker];

  if (ball.wicket) {
    if (same(striker, ball.wicket.player_out)) striker = null;
    else if (same(nonStriker, ball.wicket.player_out)) nonStriker = null;
  }
  if (overComplete) [striker, nonStriker] = [nonStriker, striker];

  return {
    striker,
    non_striker: nonStriker,
    bowler: overComplete ? null : before.bowler,
    free_hit: ball.kind === 'no_ball' || (ball.kind === 'wide' && Boolean(before.free_hit)),
  };
}

// Why the innings cannot go on, or null while it can.
export function completeReason({ runs, wickets, legal_balls: legalBalls, overs, max_wickets: maxWickets, target }) {
  if (target != null && runs >= target) return 'target';
  if (wickets >= maxWickets) return 'all_out';
  if (legalBalls >= overs * BALLS_PER_OVER) return 'overs';
  return null;
}

// Balls an innings counts for net run rate: all out means the full quota was faced.
export function nrrBalls(innings) {
  return innings.wickets >= innings.max_wickets ? innings.overs * BALLS_PER_OVER : innings.legal_balls;
}

// The winner of a pair of innings (the match or one super over), or null when the scores are level.
function pairWinner(first, second) {
  if (second.runs > first.runs) return second.batting_team;
  if (first.runs > second.runs) return first.batting_team;
  return null;
}

// The result so far from the innings in playing order.
// { result, margin } once decided; { result: null, tied: true } when level and waiting for the referee
// to start a super over or accept the tie; { result: null } while play goes on.
export function matchOutcome(innings, tieAccepted) {
  for (let first = 0; first < innings.length; first += 2) {
    const pair = innings.slice(first, first + 2);
    if (pair.length < 2 || pair.some((item) => item.status !== 'completed')) return { result: null };

    const [one, two] = pair;
    const winner = pairWinner(one, two);
    if (!winner) continue;
    if (one.super_over > 0) return { result: winner, margin: { by: 'super_over', value: one.super_over } };
    if (winner === two.batting_team) {
      return { result: winner, margin: { by: 'wickets', value: two.max_wickets - two.wickets } };
    }
    return { result: winner, margin: { by: 'runs', value: one.runs - two.runs } };
  }
  if (innings.length === 0) return { result: null };
  return tieAccepted ? { result: 'tie', margin: null } : { result: null, tied: true };
}

// The innings that comes next: the first innings from the toss, the chase, or a super over,
// where the side that batted second bats first.
export function planNextInnings(fixture, innings) {
  const last = innings.at(-1);
  if (!last) {
    const { winner, decision } = fixture.toss;
    return {
      innings_no: 1,
      super_over: 0,
      batting_team: decision === 'bat' ? winner : otherTeam(winner),
      overs: fixture.overs,
      max_wickets: PLAYING_XI - 1,
      powerplay_overs: fixture.powerplay_overs,
      target: null,
    };
  }

  if (last.innings_no % 2 === 1) {
    return {
      innings_no: last.innings_no + 1,
      super_over: last.super_over,
      batting_team: otherTeam(last.batting_team),
      overs: last.overs,
      max_wickets: last.max_wickets,
      powerplay_overs: last.super_over > 0 ? 0 : fixture.powerplay_overs,
      target: last.runs + 1,
    };
  }

  return {
    innings_no: last.innings_no + 1,
    super_over: last.super_over + 1,
    batting_team: last.batting_team,
    overs: SUPER_OVER_OVERS,
    max_wickets: SUPER_OVER_WICKETS,
    powerplay_overs: 0,
    target: null,
  };
}
