import {
  CARD_TYPES,
  DEFAULT_EXTRA_TIME_MINUTES,
  DEFAULT_HALF_DURATION_MINUTES,
  DEFAULT_MAX_SUBSTITUTES,
  DEFAULT_PLAYERS_PER_TEAM,
  EVENT_TYPES,
  FIXTURE_RESULTS,
  GOAL_TYPES,
  PERIODS,
  RESULT_TYPES,
  TEAMS,
} from '../../models/sports/football/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { isObjectId } from '../../utils/validation.js';

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

/**
 * Validates match settings/config:
 * { players_per_team, max_substitutes, half_duration_minutes, extra_time_duration_minutes, rolling_subs }
 */
export function parseMatchConfig(body) {
  const playersPerTeam = body.players_per_team != null ? toWholeNumber(body.players_per_team) : DEFAULT_PLAYERS_PER_TEAM;
  if (Number.isNaN(playersPerTeam) || playersPerTeam < 3 || playersPerTeam > 15) {
    throw new HttpError(400, 'Players per team must be between 3 and 15');
  }

  const maxSubstitutes =
    body.max_substitutes != null ? toWholeNumber(body.max_substitutes) : DEFAULT_MAX_SUBSTITUTES;
  if (Number.isNaN(maxSubstitutes) || maxSubstitutes < 0 || maxSubstitutes > 20) {
    throw new HttpError(400, 'Max substitutes must be between 0 and 20');
  }

  const halfDuration =
    body.half_duration_minutes != null ? toWholeNumber(body.half_duration_minutes) : DEFAULT_HALF_DURATION_MINUTES;
  if (Number.isNaN(halfDuration) || halfDuration < 5 || halfDuration > 60) {
    throw new HttpError(400, 'Half duration must be between 5 and 60 minutes');
  }

  const extraTime =
    body.extra_time_duration_minutes != null
      ? toWholeNumber(body.extra_time_duration_minutes)
      : DEFAULT_EXTRA_TIME_MINUTES;
  if (Number.isNaN(extraTime) || extraTime < 0 || extraTime > 30) {
    throw new HttpError(400, 'Extra time half duration must be between 0 and 30 minutes');
  }

  const rollingSubs = body.rolling_subs != null ? Boolean(body.rolling_subs) : true;

  return {
    players_per_team: playersPerTeam,
    max_substitutes: maxSubstitutes,
    half_duration_minutes: halfDuration,
    extra_time_duration_minutes: extraTime,
    rolling_subs: rollingSubs,
  };
}

/**
 * Validates team lineup / slip:
 * { starters: [playerId], bench: [playerId] }
 */
export function parseLineup(body, requiredStarters, maxSubstitutes = DEFAULT_MAX_SUBSTITUTES) {
  const starters = Array.isArray(body.starters) ? body.starters : [];
  const bench = Array.isArray(body.bench) ? body.bench : [];

  if (starters.length !== requiredStarters) {
    throw new HttpError(
      400,
      `Starting lineup must have exactly ${requiredStarters} players (currently selected: ${starters.length})`,
    );
  }

  if (bench.length > maxSubstitutes) {
    throw new HttpError(
      400,
      `Bench cannot exceed ${maxSubstitutes} substitutes (currently selected: ${bench.length})`,
    );
  }

  const allIds = [...starters, ...bench];
  for (const id of allIds) {
    if (!isObjectId(id)) throw new HttpError(400, 'Invalid player ID in lineup');
  }

  const uniqueStarters = new Set(starters.map(String));
  if (uniqueStarters.size !== starters.length) {
    throw new HttpError(400, 'A player cannot be listed twice as a starter');
  }

  const uniqueBench = new Set(bench.map(String));
  if (uniqueBench.size !== bench.length) {
    throw new HttpError(400, 'A player cannot be listed twice on the bench');
  }

  for (const id of uniqueStarters) {
    if (uniqueBench.has(id)) {
      throw new HttpError(400, 'A player cannot be both a starter and on the bench');
    }
  }

  return {
    starters: starters.map(String),
    bench: bench.map(String),
  };
}

/**
 * Validates timer / clock action request:
 * { action: 'start' | 'pause' | 'resume' | 'stoppage' | 'next_period' | 'set_time' }
 */
export function parseClockAction(body) {
  const allowedActions = ['start', 'pause', 'resume', 'stoppage', 'next_period', 'set_time'];
  if (!allowedActions.includes(body.action)) {
    throw new HttpError(400, `Invalid clock action: ${body.action}`);
  }

  let stoppageMinutes = 0;
  if (body.action === 'stoppage') {
    stoppageMinutes = toWholeNumber(body.stoppage_time_minutes);
    if (Number.isNaN(stoppageMinutes) || stoppageMinutes < 0 || stoppageMinutes > 20) {
      throw new HttpError(400, 'Stoppage time must be between 0 and 20 minutes');
    }
  }

  let elapsedSeconds = null;
  if (body.action === 'set_time') {
    elapsedSeconds = toWholeNumber(body.elapsed_seconds);
    if (Number.isNaN(elapsedSeconds) || elapsedSeconds < 0 || elapsedSeconds > 7200) {
      throw new HttpError(400, 'Elapsed seconds must be between 0 and 7200');
    }
  }

  const targetPeriod = body.target_period || null;
  if (targetPeriod && (!PERIODS.includes(targetPeriod) || targetPeriod === 'not_started')) {
    throw new HttpError(400, `Invalid match period: ${targetPeriod}`);
  }

  return {
    action: body.action,
    stoppage_time_minutes: stoppageMinutes,
    elapsed_seconds: elapsedSeconds,
    target_period: targetPeriod,
  };
}

/**
 * Validates a match event (goal, card, substitution):
 */
export function parseMatchEvent(body) {
  if (!EVENT_TYPES.includes(body.type)) {
    throw new HttpError(400, `Invalid event type: ${body.type}`);
  }
  if (!TEAMS.includes(body.team)) {
    throw new HttpError(400, `Invalid team: ${body.team}`);
  }

  const minute = toWholeNumber(body.minute);
  if (Number.isNaN(minute) || minute < 0 || minute > 180) {
    throw new HttpError(400, 'Minute must be between 0 and 180');
  }

  const period = body.period;
  if (!PERIODS.includes(period)) {
    throw new HttpError(400, `Invalid match period: ${period}`);
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';

  if (body.type === 'goal') {
    const goalType = body.goal_type || 'regular';
    if (!GOAL_TYPES.includes(goalType)) throw new HttpError(400, `Invalid goal type: ${goalType}`);

    if (body.player && !isObjectId(body.player)) {
      throw new HttpError(400, 'Invalid player ID for goal scorer');
    }
    if (body.assist_player && !isObjectId(body.assist_player)) {
      throw new HttpError(400, 'Invalid player ID for assist');
    }
    // An own goal has no assist.
    const assist = goalType === 'own_goal' || !body.assist_player ? null : String(body.assist_player);
    if (assist && body.player && assist === String(body.player)) {
      throw new HttpError(400, 'A player cannot assist their own goal');
    }

    return {
      type: 'goal',
      minute,
      period,
      team: body.team,
      player: body.player ? String(body.player) : null,
      assist_player: assist,
      goal_type: goalType,
      note,
    };
  }

  if (body.type === 'yellow_card' || body.type === 'red_card') {
    if (!body.player || !isObjectId(body.player)) {
      throw new HttpError(400, 'Select the player receiving the card');
    }

    const cardType =
      body.type === 'yellow_card'
        ? body.card_type === 'second_yellow'
          ? 'second_yellow'
          : 'yellow'
        : 'red';

    return {
      type: body.type,
      minute,
      period,
      team: body.team,
      player: String(body.player),
      card_type: cardType,
      note,
    };
  }

  if (body.type === 'substitution') {
    if (!body.player_out || !isObjectId(body.player_out)) {
      throw new HttpError(400, 'Select the player coming OFF');
    }
    if (!body.player_in || !isObjectId(body.player_in)) {
      throw new HttpError(400, 'Select the player coming ON');
    }
    if (String(body.player_out) === String(body.player_in)) {
      throw new HttpError(400, 'A player cannot be subbed for themselves');
    }

    return {
      type: 'substitution',
      minute,
      period,
      team: body.team,
      player_out: String(body.player_out),
      player_in: String(body.player_in),
      note,
    };
  }

  throw new HttpError(400, 'Unknown event configuration');
}

/**
 * Validates a fixture decision (e.g. abandoned):
 */
export function validateFixtureDecision(body) {
  const resultType = body.result_type ?? 'normal';
  if (!RESULT_TYPES.includes(resultType)) throw new HttpError(400, 'Result type must be normal or abandoned');

  if (resultType === 'normal') {
    return { result_type: 'normal', result: null, decision_note: '' };
  }

  if (!FIXTURE_RESULTS.includes(body.result)) {
    throw new HttpError(400, 'Pick the winner of the abandoned fixture (team1, team2 or draw)');
  }

  return {
    result_type: 'abandoned',
    result: body.result,
    decision_note: requireNote(body.decision_note ?? body.note),
  };
}
