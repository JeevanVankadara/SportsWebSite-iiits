import { CricketBall } from '../../models/sports/cricket/CricketBall.js';
import { CricketInnings } from '../../models/sports/cricket/CricketInnings.js';
import { BALLS_PER_OVER, MAX_UNDO } from '../../models/sports/cricket/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { recomputeFixture } from './fixture.service.js';
import {
  completeReason,
  dismissalProblem,
  isLegal,
  matchOutcome,
  nextCrease,
  planNextInnings,
  setupComplete,
} from './rules.js';
import { buildScorecard } from './scorecard.js';

// Live scoring by the referee. Every change rebuilds the innings from its balls, and an innings
// that is over stays open until the referee taps End innings, so the last balls can still be undone.

const STALE = 'The score was changed on another device. The latest score is now shown.';

const includes = (ids, id) => ids.some((item) => String(item) === String(id));

function ensureLive(innings) {
  if (innings.status !== 'live') throw new HttpError(409, 'This innings is already over');
}

function ensureInPlay(innings) {
  ensureLive(innings);
  if (completeReason(innings)) throw new HttpError(409, 'The innings is over. Tap End innings to go on.');
}

async function rebuild(innings) {
  const balls = await CricketBall.find({ innings: innings._id }).sort({ seq: 1 });
  innings.set(buildScorecard(balls, innings));
  innings.complete_reason = completeReason(innings);
  await innings.save();
}

// Opens the next innings: the first innings from the toss, the chase, or a super over after a tie.
export async function startInnings(fixture, { striker, non_striker: nonStriker, bowler }) {
  if (!setupComplete(fixture)) throw new HttpError(409, 'Finish the setup first: the overs and 11 players for each house');
  if (!fixture.toss?.winner) throw new HttpError(409, 'Record the toss first');

  const innings = await CricketInnings.find({ fixture: fixture._id }).sort({ innings_no: 1 });
  if (innings.some((item) => item.status === 'live')) throw new HttpError(409, 'An innings is already being played');
  const last = innings.at(-1);
  if (last && last.innings_no % 2 === 0 && !matchOutcome(innings, fixture.tie_accepted).tied) {
    throw new HttpError(409, 'A super over is only played when the scores are level');
  }

  const plan = planNextInnings(fixture, innings);
  const bowlingTeam = plan.batting_team === 'team1' ? 'team2' : 'team1';
  const batters = fixture[`${plan.batting_team}_players`];
  if (!includes(batters, striker) || !includes(batters, nonStriker)) {
    throw new HttpError(400, "The opening batters must be in the batting side's playing XI");
  }
  if (!includes(fixture[`${bowlingTeam}_players`], bowler)) {
    throw new HttpError(400, "The bowler must be in the fielding side's playing XI");
  }

  const created = await CricketInnings.create({
    ...plan,
    fixture: fixture._id,
    tournament: fixture.tournament,
    bowling_team: bowlingTeam,
    striker,
    non_striker: nonStriker,
    bowler,
    started_at: new Date(),
  });
  await rebuild(created);
  await recomputeFixture(fixture);
}

// Records one delivery (see parseBall).
export async function recordBall(fixture, innings, ball) {
  ensureInPlay(innings);
  if (ball.expected_balls !== innings.ball_count) throw new HttpError(409, STALE);
  if (!innings.striker || !innings.non_striker) throw new HttpError(409, 'Pick the new batter first');
  if (!innings.bowler) throw new HttpError(409, 'Pick the bowler for this over first');

  const wicket = ball.wicket && {
    ...ball.wicket,
    player_out: ball.wicket.kind === 'run_out' ? ball.wicket.player_out : innings.striker,
  };
  const problem = dismissalProblem({ ...ball, wicket }, innings);
  if (problem) throw new HttpError(400, problem);
  if (wicket?.fielder) {
    const fielders = [...fixture[`${innings.bowling_team}_players`], ...fixture[`${innings.bowling_team}_substitutes`]];
    if (!includes(fielders, wicket.fielder)) throw new HttpError(400, 'The fielder must be from the fielding side');
  }

  const delivery = { kind: ball.kind, runs: ball.runs, nb_runs_as: ball.nb_runs_as, wicket };
  try {
    await CricketBall.create({
      ...delivery,
      innings: innings._id,
      fixture: fixture._id,
      seq: innings.ball_count + 1,
      over: Math.floor(innings.legal_balls / BALLS_PER_OVER),
      striker: innings.striker,
      non_striker: innings.non_striker,
      bowler: innings.bowler,
      free_hit: innings.free_hit,
    });
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, STALE);
    throw err;
  }

  const legalBalls = innings.legal_balls + (isLegal(ball.kind) ? 1 : 0);
  const overComplete = isLegal(ball.kind) && legalBalls % BALLS_PER_OVER === 0;
  innings.set(nextCrease(innings, delivery, overComplete));
  innings.undo_left = Math.min(MAX_UNDO, innings.undo_left + 1);
  await rebuild(innings);
  await recomputeFixture(fixture);
}

// Takes back the last ball and puts the batters, bowler and free hit back as they were before it.
export async function undoBall(fixture, innings, expected) {
  ensureLive(innings);
  if (expected !== innings.ball_count) throw new HttpError(409, STALE);
  if (innings.ball_count === 0) throw new HttpError(409, 'There is no ball to undo');
  if (innings.undo_left <= 0) throw new HttpError(409, `Only the last ${MAX_UNDO} balls can be undone`);

  const ball = await CricketBall.findOneAndDelete({ innings: innings._id, seq: innings.ball_count });
  if (!ball) throw new HttpError(409, STALE);

  innings.set({
    striker: ball.striker,
    non_striker: ball.non_striker,
    bowler: ball.bowler,
    free_hit: ball.free_hit,
    undo_left: innings.undo_left - 1,
  });
  await rebuild(innings);
  await recomputeFixture(fixture);
}

// Sends in a batter: into the empty end, or in place of a batter who has not been part of any ball yet
// (to fix a wrong pick).
export async function setBatter(fixture, innings, { player, slot }) {
  ensureInPlay(innings);
  if (!includes(fixture[`${innings.batting_team}_players`], player)) {
    throw new HttpError(400, "Pick a batter from the batting side's playing XI");
  }

  const balls = await CricketBall.find({ innings: innings._id }, 'striker non_striker');
  const batted = new Set(balls.flatMap((ball) => [String(ball.striker), String(ball.non_striker)]));
  if (batted.has(String(player)) || includes([innings.striker, innings.non_striker].filter(Boolean), player)) {
    throw new HttpError(409, 'This player has already batted');
  }

  const end = slot ?? (innings.striker ? 'non_striker' : 'striker');
  if (innings[end] && batted.has(String(innings[end]))) {
    throw new HttpError(409, 'That batter has already been part of a ball. Use Undo to change it.');
  }
  innings[end] = player;
  await rebuild(innings);
}

// Any bowler of the fielding XI except the one who bowled the previous over.
export async function setBowler(fixture, innings, { player }) {
  ensureInPlay(innings);
  if (!includes(fixture[`${innings.bowling_team}_players`], player)) {
    throw new HttpError(400, "Pick a bowler from the fielding side's playing XI");
  }
  if (innings.previous_bowler && String(innings.previous_bowler) === String(player)) {
    throw new HttpError(409, 'This bowler bowled the last over and cannot bowl two overs in a row');
  }
  innings.bowler = player;
  await rebuild(innings);
}

export async function swapStrike(innings) {
  ensureInPlay(innings);
  innings.set({ striker: innings.non_striker, non_striker: innings.striker });
  await innings.save();
}

export async function endInnings(fixture, innings) {
  ensureLive(innings);
  if (!completeReason(innings)) throw new HttpError(409, 'The innings is not over yet');
  innings.set({ status: 'completed', ended_at: new Date(), undo_left: 0 });
  await rebuild(innings);
  await recomputeFixture(fixture);
}

// The scores are level and the referee finishes the match as a tie instead of another super over.
export async function acceptTie(fixture) {
  const innings = await CricketInnings.find({ fixture: fixture._id }).sort({ innings_no: 1 });
  if (!matchOutcome(innings, false).tied) throw new HttpError(409, 'The scores are not level');
  fixture.tie_accepted = true;
  await recomputeFixture(fixture);
}
