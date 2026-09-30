import {
  DEFAULT_CONFIG,
  FIXTURE_RESULTS,
  RESULT_TYPES,
  TEAMS,
} from '../../models/sports/kabaddi/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { isObjectId } from '../../utils/validation.js';

function toWholeNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value);
  return Number.NaN;
}

function wholeNumber(body, key, label, min, max) {
  if (body[key] == null) return DEFAULT_CONFIG[key];
  const value = toWholeNumber(body[key]);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${label} must be between ${min} and ${max}`);
  }
  return value;
}

const flag = (body, key) => (body[key] == null ? DEFAULT_CONFIG[key] : Boolean(body[key]));

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

function requireTeam(team) {
  if (!TEAMS.includes(team)) throw new HttpError(400, 'Pick a house');
  return team;
}

/**
 * Validates the match rules a referee or admin sets before the match starts.
 */
export function parseMatchConfig(body = {}) {
  const config = {
    players_on_court: wholeNumber(body, 'players_on_court', 'Players on court', 3, 12),
    max_substitutes: wholeNumber(body, 'max_substitutes', 'Substitutes', 0, 10),
    half_duration_minutes: wholeNumber(body, 'half_duration_minutes', 'Half length', 1, 60),
    all_out_points: wholeNumber(body, 'all_out_points', 'All-out points', 0, 10),
    bonus_enabled: flag(body, 'bonus_enabled'),
    super_tackle_enabled: flag(body, 'super_tackle_enabled'),
    super_tackle_threshold: wholeNumber(body, 'super_tackle_threshold', 'Super tackle defenders', 1, 12),
    super_tackle_points: wholeNumber(body, 'super_tackle_points', 'Super tackle points', 1, 5),
    super_raid_min_points: wholeNumber(body, 'super_raid_min_points', 'Super raid points', 2, 12),
    do_or_die_enabled: flag(body, 'do_or_die_enabled'),
    do_or_die_after_empty_raids: wholeNumber(body, 'do_or_die_after_empty_raids', 'Empty raids before do-or-die', 1, 10),
  };
  if (config.super_tackle_threshold > config.players_on_court) {
    throw new HttpError(400, 'Super tackle defenders cannot be more than the players on court');
  }
  return config;
}

/**
 * Validates a house's lineup: { starters: [playerId], bench: [playerId] }
 */
export function parseLineup(body = {}, requiredStarters, maxSubstitutes) {
  const starters = playerIdList(body.starters, 'Starting players');
  const bench = playerIdList(body.bench, 'Substitutes');

  if (starters.length !== requiredStarters) {
    throw new HttpError(400, `Pick exactly ${requiredStarters} starting players (now ${starters.length})`);
  }
  if (bench.length > maxSubstitutes) {
    throw new HttpError(400, `Pick at most ${maxSubstitutes} substitutes (now ${bench.length})`);
  }
  if (starters.some((id) => bench.includes(id))) {
    throw new HttpError(400, 'A player cannot be both a starter and a substitute');
  }
  return { starters, bench };
}

export function parseFirstRaid(body = {}) {
  if (!TEAMS.includes(body.first_raid)) throw new HttpError(400, 'Pick the house that raids first');
  return body.first_raid;
}

export function parseClockAction(body = {}) {
  const actions = ['start', 'pause', 'resume', 'next_period', 'set_time'];
  if (!actions.includes(body.action)) throw new HttpError(400, 'Unknown clock action');

  let remainingSeconds = null;
  if (body.action === 'set_time') {
    remainingSeconds = toWholeNumber(body.remaining_seconds);
    if (!Number.isInteger(remainingSeconds) || remainingSeconds < 0 || remainingSeconds > 3600) {
      throw new HttpError(400, 'Time left must be between 0 and 60 minutes');
    }
  }
  return { action: body.action, remaining_seconds: remainingSeconds };
}

/**
 * Validates the shape of a new event. Whether the players can take part right now is checked
 * against the live match state in scoring.service.js.
 * allowCorrection: only the admin can add a plus or minus correction.
 */
export function parseMatchEvent(body = {}, { allowCorrection = false } = {}) {
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';
  const team = requireTeam(body.team);

  switch (body.type) {
    case 'raid':
      return {
        type: 'raid',
        team,
        raider: playerId(body.raider, 'Pick the raider'),
        touched: playerIdList(body.touched, 'Defenders touched'),
        bonus: Boolean(body.bonus),
        note,
      };
    case 'tackle': {
      const tackler = playerId(body.tackler, 'Pick the defender who made the tackle');
      const assists = playerIdList(body.assists, 'Assists');
      if (assists.includes(tackler)) throw new HttpError(400, 'The tackler cannot also be an assist');
      return { type: 'tackle', team, raider: playerId(body.raider, 'Pick the raider'), tackler, assists, note };
    }
    case 'technical': {
      const points = toWholeNumber(body.points);
      if (!Number.isInteger(points) || points < 1 || points > 5) {
        throw new HttpError(400, 'Technical points must be between 1 and 5');
      }
      return { type: 'technical', team, points, note: requireNote(body.note, 'Add the reason for the technical point') };
    }
    case 'correction': {
      if (!allowCorrection) throw new HttpError(403, 'Only the admin can correct the score');
      const points = toWholeNumber(body.points);
      if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 20) {
        throw new HttpError(400, 'A correction must be between -20 and 20 points, and not 0');
      }
      return { type: 'correction', team, points, note: requireNote(body.note, 'Add the reason for the correction') };
    }
    case 'substitution': {
      const outgoing = playerId(body.player_out, 'Pick the player going off');
      const incoming = playerId(body.player_in, 'Pick the player coming on');
      if (outgoing === incoming) throw new HttpError(400, 'Pick two different players');
      return { type: 'substitution', team, player_out: outgoing, player_in: incoming, note };
    }
    default:
      throw new HttpError(400, 'Unknown event type');
  }
}

export function validateFixtureDecision(body = {}) {
  const resultType = body.result_type ?? 'normal';
  if (!RESULT_TYPES.includes(resultType)) throw new HttpError(400, 'Result type must be normal or abandoned');
  if (resultType === 'normal') return { result_type: 'normal', result: null, decision_note: '' };

  if (!FIXTURE_RESULTS.includes(body.result)) {
    throw new HttpError(400, 'Pick who gets the abandoned match (either house or a draw)');
  }
  return { result_type: 'abandoned', result: body.result, decision_note: requireNote(body.decision_note ?? body.note) };
}
