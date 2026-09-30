import { BALLS_PER_OVER, BOWLER_DISMISSALS } from '../../models/sports/cricket/constants.js';
import { ballLabel, ballValue } from './rules.js';

function rowFor(map, id, create) {
  const key = String(id);
  if (!map.has(key)) map.set(key, create(id));
  return map.get(key);
}

const newBatter = (player) => ({ player, runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting', dismissal: null });
const newBowler = (player) => ({ player, balls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, no_balls: 0 });

// Rebuilds the whole scorecard of an innings from its balls (in seq order) and who is at the crease now.
export function buildScorecard(balls, innings) {
  const batting = new Map();
  const bowling = new Map();
  const overs = new Map();
  const extras = { wides: 0, no_balls: 0, byes: 0, leg_byes: 0, total: 0 };
  const powerplay = { runs: 0, wickets: 0 };
  const fallOfWickets = [];
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;

  for (const ball of balls) {
    const value = ballValue(ball);
    const striker = rowFor(batting, ball.striker, newBatter);
    rowFor(batting, ball.non_striker, newBatter);
    const bowler = rowFor(bowling, ball.bowler, newBowler);
    const inPowerplay = ball.over < innings.powerplay_overs;

    runs += value.total;
    if (value.legal) legalBalls += 1;
    for (const key of ['wides', 'no_balls', 'byes', 'leg_byes']) {
      extras[key] += value[key];
      extras.total += value[key];
    }
    if (inPowerplay) powerplay.runs += value.total;

    striker.runs += value.bat;
    if (value.faced) striker.balls += 1;
    if (value.bat === 4) striker.fours += 1;
    if (value.bat === 6) striker.sixes += 1;

    bowler.runs += value.bowler;
    if (value.legal) bowler.balls += 1;
    if (ball.kind === 'wide') bowler.wides += 1;
    if (ball.kind === 'no_ball') bowler.no_balls += 1;

    const over = rowFor(overs, ball.over, () => ({ bowlers: new Set(), runs: 0, legal: 0 }));
    over.bowlers.add(String(ball.bowler));
    over.runs += value.bowler;
    if (value.legal) over.legal += 1;

    if (ball.wicket) {
      wickets += 1;
      const credited = BOWLER_DISMISSALS.includes(ball.wicket.kind);
      const out = rowFor(batting, ball.wicket.player_out, newBatter);
      out.status = 'out';
      out.dismissal = { kind: ball.wicket.kind, bowler: credited ? ball.bowler : null, fielder: ball.wicket.fielder ?? null };
      if (credited) bowler.wickets += 1;
      if (inPowerplay) powerplay.wickets += 1;
      fallOfWickets.push({ wicket_no: wickets, runs, balls: legalBalls, player: ball.wicket.player_out });
    }
  }

  for (const over of overs.values()) {
    if (over.legal === BALLS_PER_OVER && over.bowlers.size === 1 && over.runs === 0) {
      bowling.get([...over.bowlers][0]).maidens += 1;
    }
  }

  const atCrease = [innings.striker, innings.non_striker].filter(Boolean);
  for (const id of atCrease) rowFor(batting, id, newBatter);
  if (innings.bowler) rowFor(bowling, innings.bowler, newBowler);
  const creaseIds = new Set(atCrease.map(String));
  for (const row of batting.values()) {
    if (row.status === 'out') continue;
    row.status = innings.status === 'live' && creaseIds.has(String(row.player)) ? 'batting' : 'not_out';
  }

  const last = balls.at(-1);
  const completedOvers = Math.floor(legalBalls / BALLS_PER_OVER);
  const lastOfPreviousOver = completedOvers > 0 ? balls.findLast((ball) => ball.over === completedOvers - 1) : null;

  return {
    ball_count: balls.length,
    runs,
    wickets,
    legal_balls: legalBalls,
    extras,
    powerplay,
    batting: [...batting.values()],
    bowling: [...bowling.values()],
    fall_of_wickets: fallOfWickets,
    this_over: last ? balls.filter((ball) => ball.over === last.over).map(ballLabel) : [],
    this_over_no: last ? last.over + 1 : 1,
    previous_bowler: lastOfPreviousOver?.bowler ?? null,
  };
}
