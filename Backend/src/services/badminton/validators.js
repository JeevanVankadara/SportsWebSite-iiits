import {
  FIXTURE_RESULTS,
  MATCH_TYPES,
  MAX_MATCHES_PER_FIXTURE,
  POINTS_TO_WIN_OPTIONS,
  RESULT_TYPES,
  SETS_COUNT_OPTIONS,
  TEAMS,
} from '../../models/sports/badminton/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { isObjectId } from '../../utils/validation.js';
import { invalidSetScore, setsToWin, setWinner } from './rules.js';

const DECISIONS = ['team1', 'team2', 'draw'];

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

// Match order set by the referee: [{ type, sets_count, points_to_win }, ...] in the order they are played.
export function parsePlan(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'Add at least one match to the fixture');
  }
  if (value.length > MAX_MATCHES_PER_FIXTURE) {
    throw new HttpError(400, `A fixture can have at most ${MAX_MATCHES_PER_FIXTURE} matches`);
  }

  return value.map((item, index) => {
    const label = `Match ${index + 1}`;
    const setsCount = Number(item?.sets_count);
    const pointsToWin = Number(item?.points_to_win);
    if (!MATCH_TYPES.includes(item?.type)) throw new HttpError(400, `${label}: choose singles or doubles`);
    if (!SETS_COUNT_OPTIONS.includes(setsCount)) throw new HttpError(400, `${label}: a match has 1 or 3 sets`);
    if (!POINTS_TO_WIN_OPTIONS.includes(pointsToWin)) {
      throw new HttpError(400, `${label}: sets are played to 21, 15 or 11 points`);
    }
    return { type: item.type, sets_count: setsCount, points_to_win: pointsToWin };
  });
}

// Checks a match result against the rules of that match and works out the sets won.
// body: { result_type: 'normal' | 'abandoned', sets: [{ team1_points, team2_points }], winner, note }
// For an abandoned match the referee decides the winner (team1, team2 or draw) and must add a note.
export function validateMatchResult(match, body) {
  const resultType = body.result_type ?? 'normal';
  if (!RESULT_TYPES.includes(resultType)) throw new HttpError(400, 'Result type must be normal or abandoned');
  if (!Array.isArray(body.sets)) throw new HttpError(400, 'Sets must be a list of scores');
  if (body.sets.length > match.sets_count) {
    throw new HttpError(400, `Match ${match.match_no} has only ${match.sets_count} set(s)`);
  }

  const needed = setsToWin(match.sets_count);
  const sets = [];
  let team1SetsWon = 0;
  let team2SetsWon = 0;

  body.sets.forEach((raw, index) => {
    const label = `Set ${index + 1}`;
    if (team1SetsWon === needed || team2SetsWon === needed) {
      throw new HttpError(400, `${label} should not be there: the match was already won`);
    }

    const team1Points = toWholeNumber(raw?.team1_points);
    const team2Points = toWholeNumber(raw?.team2_points);
    const problem = invalidSetScore(team1Points, team2Points, match.points_to_win, match.point_cap);
    if (problem) throw new HttpError(400, `${label}: ${problem}`);

    const winner = setWinner(team1Points, team2Points, match.points_to_win, match.point_cap);
    const isLast = index === body.sets.length - 1;
    if (!winner && !(resultType === 'abandoned' && isLast)) {
      throw new HttpError(
        400,
        `${label}: ${team1Points}-${team2Points} is not a finished set. Only the last set of an abandoned match can be unfinished.`,
      );
    }

    if (winner === 'team1') team1SetsWon += 1;
    if (winner === 'team2') team2SetsWon += 1;
    sets.push({ team1_points: team1Points, team2_points: team2Points, winner });
  });

  if (resultType === 'normal') {
    if (team1SetsWon !== needed && team2SetsWon !== needed) {
      throw new HttpError(400, `A finished match needs a winner: one side must win ${needed} set(s)`);
    }
    return {
      result_type: 'normal',
      sets,
      team1_sets_won: team1SetsWon,
      team2_sets_won: team2SetsWon,
      winner: team1SetsWon === needed ? 'team1' : 'team2',
      note: undefined,
    };
  }

  const decision = parseAbandonDecision(body);
  return {
    result_type: 'abandoned',
    sets,
    team1_sets_won: team1SetsWon,
    team2_sets_won: team2SetsWon,
    winner: decision.winner,
    note: decision.note,
  };
}

// body: { result_type: 'normal' } removes a decision; { result_type: 'abandoned', result, note } sets one.
export function validateFixtureDecision(body) {
  if (body.result_type === 'normal') return { result_type: 'normal' };
  if (body.result_type !== 'abandoned') throw new HttpError(400, 'Result type must be normal or abandoned');
  if (!FIXTURE_RESULTS.includes(body.result)) {
    throw new HttpError(400, 'Choose who gets the fixture: team 1, team 2 or a draw');
  }
  return { result_type: 'abandoned', result: body.result, note: requireNote(body.note) };
}

// The referee's decision on an abandoned match. body: { winner: 'team1' | 'team2' | 'draw', note }
// Returns winner null for a draw.
export function parseAbandonDecision(body) {
  if (!DECISIONS.includes(body.winner)) {
    throw new HttpError(400, 'Choose who gets the match: team 1, team 2 or a draw');
  }
  return { winner: body.winner === 'draw' ? null : body.winner, note: requireNote(body.note) };
}

// One house's slip. body: { lineup: [{ match: matchId, players: [playerId] }], submit: true | false }
export function parseSlip(body) {
  if (!Array.isArray(body.lineup)) throw new HttpError(400, 'The slip must list the players for each match');
  const lineup = body.lineup.map((entry) => {
    if (!isObjectId(entry?.match)) throw new HttpError(400, 'Each line of the slip needs a match');
    if (!Array.isArray(entry.players) || !entry.players.every(isObjectId)) {
      throw new HttpError(400, 'Players must be a list of player ids');
    }
    if (new Set(entry.players).size !== entry.players.length) {
      throw new HttpError(400, 'The same player is listed twice in one match');
    }
    return { match: entry.match, players: entry.players };
  });
  return { lineup, submit: body.submit === true };
}

// A + or - tap. body: { team, change: 1 | -1, expected: { team1_points, team2_points } }
// expected is the score the referee's screen showed, so two referees tapping for the same rally
// cannot count it twice.
export function parseScoreChange(body) {
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
export function parseSetScore(body) {
  const score = { team1_points: toWholeNumber(body.team1_points), team2_points: toWholeNumber(body.team2_points) };
  if (!Number.isInteger(score.team1_points) || !Number.isInteger(score.team2_points)) {
    throw new HttpError(400, 'Points must be whole numbers, 0 or more');
  }
  return score;
}
