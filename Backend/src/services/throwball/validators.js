import {
  DEFAULT_CONFIG,
  FIXTURE_RESULTS,
  PLAYERS_ON_COURT_MIN,
  PLAYERS_ON_COURT_MAX,
  MAX_SUBSTITUTES_MIN,
  MAX_SUBSTITUTES_MAX,
  MATCH_SETS_MIN,
  MATCH_SETS_MAX,
  POINT_CAP_MAX_OVER,
  POINTS_TO_WIN_MAX,
  POINTS_TO_WIN_MIN,
  RESULT_TYPES,
  TEAMS,
} from '../../models/sports/throwball/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { isObjectId } from '../../utils/validation.js';

function toWholeNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value);
  return Number.NaN;
}

function requireNote(value, message = 'Add a note explaining the decision') {
  const note = typeof value === 'string' ? value.trim() : '';
  if (!note) throw new HttpError(400, message);
  if (note.length > 500) throw new HttpError(400, 'Note must be 500 characters or fewer');
  return note;
}

function playerId(value, message) {
  if (!value || !isObjectId(String(value))) throw new HttpError(400, message);
  return String(value);
}

function playerIdList(value, label) {
  if (value == null) return [];
  if (!Array.isArray(value) || !value.every((id) => isObjectId(String(id)))) {
    throw new HttpError(400, `${label} must be a list of players`);
  }
  const ids = value.map(String);
  if (new Set(ids).size !== ids.length) throw new HttpError(400, `${label} lists a player twice`);
  return ids;
}

// The scoring rules. body: { points_to_win, point_cap }
export function parseMatchConfig(body = {}) {
  const pointsToWin = body.points_to_win == null ? DEFAULT_CONFIG.points_to_win : toWholeNumber(body.points_to_win);
  if (!Number.isInteger(pointsToWin) || pointsToWin < POINTS_TO_WIN_MIN || pointsToWin > POINTS_TO_WIN_MAX) {
    throw new HttpError(400, `Points to win a set must be between ${POINTS_TO_WIN_MIN} and ${POINTS_TO_WIN_MAX}`);
  }

  const pointCap = body.point_cap == null ? Math.max(pointsToWin, DEFAULT_CONFIG.point_cap) : toWholeNumber(body.point_cap);
  if (!Number.isInteger(pointCap) || pointCap < pointsToWin || pointCap > pointsToWin + POINT_CAP_MAX_OVER) {
    throw new HttpError(400, `The point cap must be between ${pointsToWin} and ${pointsToWin + POINT_CAP_MAX_OVER}`);
  }
  
  const playersOnCourt = body.players_on_court == null ? DEFAULT_CONFIG.players_on_court : toWholeNumber(body.players_on_court);
  if (!Number.isInteger(playersOnCourt) || playersOnCourt < PLAYERS_ON_COURT_MIN || playersOnCourt > PLAYERS_ON_COURT_MAX) {
    throw new HttpError(400, `Players on court must be between ${PLAYERS_ON_COURT_MIN} and ${PLAYERS_ON_COURT_MAX}`);
  }
  
  const maxSubstitutes = body.max_substitutes == null ? DEFAULT_CONFIG.max_substitutes : toWholeNumber(body.max_substitutes);
  if (!Number.isInteger(maxSubstitutes) || maxSubstitutes < MAX_SUBSTITUTES_MIN || maxSubstitutes > MAX_SUBSTITUTES_MAX) {
    throw new HttpError(400, `Max substitutes must be between ${MAX_SUBSTITUTES_MIN} and ${MAX_SUBSTITUTES_MAX}`);
  }
  
  const matchSets = body.match_sets == null ? DEFAULT_CONFIG.match_sets : toWholeNumber(body.match_sets);
  if (!Number.isInteger(matchSets) || matchSets < MATCH_SETS_MIN || matchSets > MATCH_SETS_MAX) {
    throw new HttpError(400, `Match sets must be between ${MATCH_SETS_MIN} and ${MATCH_SETS_MAX}`);
  }

  return { points_to_win: pointsToWin, point_cap: pointCap, players_on_court: playersOnCourt, max_substitutes: maxSubstitutes, match_sets: matchSets };
}

// One house's lineup: { starters: [playerId] (5), bench: [playerId] (0-3) }
export function parseLineup(config, body = {}) {
  const starters = playerIdList(body.starters, 'Starting players');
  const bench = playerIdList(body.bench, 'Substitutes');

  if (starters.length !== config.players_on_court) {
    throw new HttpError(400, `Pick exactly ${config.players_on_court} starting players (now ${starters.length})`);
  }
  if (bench.length > config.max_substitutes) {
    throw new HttpError(400, `Pick at most ${config.max_substitutes} substitutes (now ${bench.length})`);
  }
  if (starters.some((id) => bench.includes(id))) {
    throw new HttpError(400, 'A player cannot be both a starter and a substitute');
  }
  return { starters, bench };
}

// A + or - tap. body: { team, change: 1 | -1, expected: { team1_points, team2_points } }
// expected is the score the referee's screen showed, so two referees tapping for the same rally
// cannot count it twice.
export function parseScoreChange(body = {}) {
  if (!TEAMS.includes(body.team)) throw new HttpError(400, 'Choose team 1 or team 2');
  if (body.change !== 1 && body.change !== -1) throw new HttpError(400, 'A tap changes the score by 1 or -1');
  const expected = {
    team1_points: toWholeNumber(body.expected?.team1_points),
    team2_points: toWholeNumber(body.expected?.team2_points),
  };
  if (!Number.isInteger(expected.team1_points) || !Number.isInteger(expected.team2_points)) {
    throw new HttpError(400, 'Send the score shown on your screen');
  }
  return { team: body.team, change: body.change, expected };
}

// A set score typed in by the referee to fix a mistake. body: { team1_points, team2_points }
export function parseSetScore(body = {}) {
  const score = { team1_points: toWholeNumber(body.team1_points), team2_points: toWholeNumber(body.team2_points) };
  if (!Number.isInteger(score.team1_points) || !Number.isInteger(score.team2_points)) {
    throw new HttpError(400, 'Points must be whole numbers, 0 or more');
  }
  return score;
}

// A substitution. body: { team, player_out, player_in }
export function parseSubstitution(body = {}) {
  if (!TEAMS.includes(body.team)) throw new HttpError(400, 'Pick a house');
  const outgoing = playerId(body.player_out, 'Pick the player going off');
  const incoming = playerId(body.player_in, 'Pick the player coming on');
  if (outgoing === incoming) throw new HttpError(400, 'Pick two different players');
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';
  return { type: 'substitution', team: body.team, player_out: outgoing, player_in: incoming, note };
}

// body: { result_type: 'normal' } removes a decision; { result_type: 'abandoned', result, decision_note }
export function validateFixtureDecision(body = {}) {
  const resultType = body.result_type ?? 'normal';
  if (!RESULT_TYPES.includes(resultType)) throw new HttpError(400, 'Result type must be normal or abandoned');
  if (resultType === 'normal') return { result_type: 'normal', result: null, decision_note: '' };

  if (!FIXTURE_RESULTS.includes(body.result)) {
    throw new HttpError(400, 'Pick who gets the abandoned match (either house or a draw)');
  }
  return { result_type: 'abandoned', result: body.result, decision_note: requireNote(body.decision_note ?? body.note) };
}

