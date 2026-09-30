import {
  BALL_KINDS,
  DECISION_RESULTS,
  DISMISSALS,
  MAX_OVERS,
  MAX_SUBSTITUTES,
  MIN_OVERS,
  NO_BALL_RUNS_AS,
  PLAYING_XI,
  TEAMS,
  TOSS_DECISIONS,
} from '../../models/sports/cricket/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { isObjectId } from '../../utils/validation.js';

const RUN_LIMITS = { run: [0, 6], wide: [0, 6], no_ball: [0, 6], bye: [1, 6], leg_bye: [1, 6] };
const FIELDER_DISMISSALS = ['caught', 'run_out', 'stumped'];
const SLOTS = ['striker', 'non_striker'];

function toWholeNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return Number.NaN;
}

function requireNote(value) {
  const note = typeof value === 'string' ? value.trim() : '';
  if (!note) throw new HttpError(400, 'Add a note explaining the decision');
  if (note.length > 500) throw new HttpError(400, 'Note must be 500 characters or fewer');
  return note;
}

function requireId(value, message) {
  if (!isObjectId(value)) throw new HttpError(400, message);
  return value;
}

function idList(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isObjectId)) throw new HttpError(400, `${label} must be a list of player ids`);
  return value;
}

// body: { overs, powerplay_overs, team1: { players, substitutes }, team2: { … } }
// Squads may be saved part-filled; the toss needs a full playing XI on both sides.
export function parseSetup(body) {
  const overs = toWholeNumber(body.overs);
  if (!Number.isInteger(overs) || overs < MIN_OVERS || overs > MAX_OVERS) {
    throw new HttpError(400, `Overs per innings must be between ${MIN_OVERS} and ${MAX_OVERS}`);
  }
  const powerplayOvers = body.powerplay_overs == null || body.powerplay_overs === '' ? 0 : toWholeNumber(body.powerplay_overs);
  if (!Number.isInteger(powerplayOvers) || powerplayOvers < 0 || powerplayOvers > overs) {
    throw new HttpError(400, `Powerplay overs must be between 0 and ${overs}`);
  }

  const squads = {};
  for (const team of TEAMS) {
    const players = idList(body[team]?.players, 'Players');
    const substitutes = idList(body[team]?.substitutes, 'Substitutes');
    if (players.length > PLAYING_XI) throw new HttpError(400, `A playing XI has exactly ${PLAYING_XI} players`);
    if (substitutes.length > MAX_SUBSTITUTES) throw new HttpError(400, `A house can name at most ${MAX_SUBSTITUTES} substitutes`);
    squads[team] = { players, substitutes };
  }
  return { overs, powerplay_overs: powerplayOvers, squads };
}

export function parseToss(body) {
  if (!TEAMS.includes(body.winner)) throw new HttpError(400, 'Choose which house won the toss');
  if (!TOSS_DECISIONS.includes(body.decision)) throw new HttpError(400, 'Choose whether they bat or bowl first');
  return { winner: body.winner, decision: body.decision };
}

// body: { striker, non_striker, bowler }
export function parseOpeners(body) {
  const striker = requireId(body.striker, 'Pick the batter on strike');
  const nonStriker = requireId(body.non_striker, 'Pick the non-striker');
  const bowler = requireId(body.bowler, 'Pick the bowler');
  if (striker === nonStriker) throw new HttpError(400, 'Pick two different opening batters');
  return { striker, non_striker: nonStriker, bowler };
}

// expected_balls is the ball count the referee's screen showed, so a double tap or two referees
// scoring the same ball can never record it twice.
export function parseExpected(body) {
  const expected = toWholeNumber(body.expected_balls);
  if (!Number.isInteger(expected) || expected < 0) throw new HttpError(400, 'Send the ball count shown on your screen');
  return expected;
}

// body: { expected_balls, kind, runs, nb_runs_as, wicket: { kind, player_out, fielder } | null }
// player_out is only needed for a run out; any other dismissal is the striker.
export function parseBall(body) {
  const expected = parseExpected(body);
  if (!BALL_KINDS.includes(body.kind)) throw new HttpError(400, 'Choose what happened on the ball');

  const runs = toWholeNumber(body.runs ?? 0);
  const [min, max] = RUN_LIMITS[body.kind];
  if (!Number.isInteger(runs) || runs < min || runs > max) {
    throw new HttpError(400, `Runs must be between ${min} and ${max}`);
  }

  let nbRunsAs = 'bat';
  if (body.kind === 'no_ball' && runs > 0 && body.nb_runs_as !== undefined) {
    if (!NO_BALL_RUNS_AS.includes(body.nb_runs_as)) throw new HttpError(400, 'No-ball runs are off the bat, byes or leg byes');
    nbRunsAs = body.nb_runs_as;
  }

  let wicket = null;
  if (body.wicket != null) {
    const kind = body.wicket.kind;
    if (!DISMISSALS.includes(kind)) throw new HttpError(400, 'Choose how the batter got out');
    const fielder = body.wicket.fielder;
    if (fielder != null && fielder !== '' && !isObjectId(fielder)) throw new HttpError(400, 'Invalid fielder');
    wicket = {
      kind,
      player_out: kind === 'run_out' ? requireId(body.wicket.player_out, 'Choose which batter was run out') : null,
      fielder: FIELDER_DISMISSALS.includes(kind) && fielder ? fielder : null,
    };
  }

  return { expected_balls: expected, kind: body.kind, runs, nb_runs_as: nbRunsAs, wicket };
}

// body: { player, slot } — slot is optional; without it the empty end is filled.
export function parseBatter(body) {
  const player = requireId(body.player, 'Pick the new batter');
  if (body.slot !== undefined && !SLOTS.includes(body.slot)) throw new HttpError(400, 'Choose the striker or non-striker end');
  return { player, slot: body.slot };
}

export function parseBowler(body) {
  return { player: requireId(body.player, 'Pick the bowler') };
}

// body: { result_type: 'normal' } removes a decision; { result_type: 'abandoned', result, note } sets one.
export function validateFixtureDecision(body) {
  if (body.result_type === 'normal') return { result_type: 'normal' };
  if (body.result_type !== 'abandoned') throw new HttpError(400, 'Result type must be normal or abandoned');
  if (!DECISION_RESULTS.includes(body.result)) {
    throw new HttpError(400, 'Choose who gets the match: team 1, team 2 or no result');
  }
  return { result_type: 'abandoned', result: body.result, note: requireNote(body.note) };
}
