import { HttpError } from '../../utils/httpError.js';
import { loadFixtureDetail, recomputeFixture } from './fixture.service.js';
import { computeElapsedSeconds, computeRosterState } from './rules.js';

const BREAKS = ['half_time', 'extra_time_half_time'];

// Stops the clock, keeping the time played so far.
function pauseClock(clock, now) {
  if (!clock.is_running) return;
  clock.elapsed_seconds = computeElapsedSeconds(clock, now);
  clock.is_running = false;
  clock.resumed_at = null;
}

function ensureKickedOff(fixture, message) {
  if (fixture.status !== 'live' || fixture.clock.period === 'not_started') throw new HttpError(409, message);
}

// Checks that the players named in an event belong to that house's lineup and, for a new event,
// that they can take part right now: the scorer is on the pitch, nobody sent off gets a card or
// comes back, and a substitution swaps a player on the pitch for one on the bench.
function checkEventPlayers(fixture, event, { isNew }) {
  const lineup = fixture[`${event.team}_lineup`] ?? {};
  const inLineup = new Set([...(lineup.starters ?? []), ...(lineup.bench ?? [])].map(String));
  const named = [event.player, event.assist_player, event.player_out, event.player_in].filter(Boolean);
  if (named.some((id) => !inLineup.has(String(id)))) {
    throw new HttpError(400, "Pick players from that house's lineup");
  }
  if (!isNew) return;

  const roster = computeRosterState(lineup.starters, lineup.bench, fixture.events, event.team, {
    rollingSubs: fixture.config?.rolling_subs ?? true,
  });
  const onPitch = new Set(roster.on_pitch);
  const sentOff = new Set(roster.sent_off);

  if (event.type === 'goal' && event.player && !onPitch.has(String(event.player))) {
    throw new HttpError(400, 'The scorer must be on the pitch');
  }
  if (event.type === 'goal' && event.assist_player && !onPitch.has(String(event.assist_player))) {
    throw new HttpError(400, 'The player who assisted must be on the pitch');
  }
  if ((event.type === 'yellow_card' || event.type === 'red_card') && sentOff.has(String(event.player))) {
    throw new HttpError(400, 'That player has already been sent off');
  }
  if (event.type === 'substitution') {
    if (!onPitch.has(String(event.player_out))) throw new HttpError(400, 'The player coming off must be on the pitch');
    if (!roster.bench.includes(String(event.player_in))) {
      throw new HttpError(
        400,
        sentOff.has(String(event.player_in))
          ? 'A player who was sent off cannot come back on'
          : 'The player coming on must be on the bench',
      );
    }
  }
}

/**
 * Handles match clock and period state transitions.
 */
export async function controlClock(fixture, { action, stoppage_time_minutes, elapsed_seconds, target_period }) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'Cannot modify the clock of a completed match');
  }

  const now = new Date();
  const halfSeconds = (fixture.config?.half_duration_minutes || 25) * 60;
  const extraHalfSeconds = (fixture.config?.extra_time_duration_minutes || 0) * 60;

  if (action !== 'start') ensureKickedOff(fixture, 'Kick off the match first');

  if (action === 'start') {
    if (!fixture.lineup_locked_at) {
      throw new HttpError(409, 'Submit both team slips before starting the match');
    }
    if (fixture.clock.period !== 'not_started') throw new HttpError(409, 'The match has already kicked off');

    if (fixture.clock.period === 'not_started') {
      fixture.clock.period = 'first_half';
      fixture.clock.elapsed_seconds = 0;
    }

    fixture.clock.is_running = true;
    fixture.clock.resumed_at = now;
    fixture.status = 'live';
  } else if (action === 'pause') {
    pauseClock(fixture.clock, now);
  } else if (action === 'resume') {
    if (BREAKS.includes(fixture.clock.period)) {
      throw new HttpError(409, 'It is a break. Start the next half instead.');
    }
    if (!fixture.clock.is_running) {
      fixture.clock.is_running = true;
      fixture.clock.resumed_at = now;
    }
  } else if (action === 'stoppage') {
    fixture.clock.stoppage_time_minutes = stoppage_time_minutes;
  } else if (action === 'next_period') {
    pauseClock(fixture.clock, now);
    fixture.clock.stoppage_time_minutes = 0;

    const currentPeriod = fixture.clock.period;
    let next = target_period;

    if (!next) {
      switch (currentPeriod) {
        case 'not_started':
          next = 'first_half';
          break;
        case 'first_half':
          next = 'half_time';
          fixture.clock.elapsed_seconds = Math.max(fixture.clock.elapsed_seconds, halfSeconds);
          break;
        case 'half_time':
          next = 'second_half';
          fixture.clock.elapsed_seconds = halfSeconds;
          break;
        case 'second_half':
          if (fixture.config?.extra_time_duration_minutes > 0) {
            next = 'extra_time_first_half';
            fixture.clock.elapsed_seconds = halfSeconds * 2;
          } else {
            next = 'completed';
          }
          break;
        case 'extra_time_first_half':
          next = 'extra_time_half_time';
          fixture.clock.elapsed_seconds = halfSeconds * 2 + extraHalfSeconds;
          break;
        case 'extra_time_half_time':
          next = 'extra_time_second_half';
          fixture.clock.elapsed_seconds = halfSeconds * 2 + extraHalfSeconds;
          break;
        case 'extra_time_second_half':
          next = 'completed';
          break;
        default:
          next = 'completed';
      }
    }

    fixture.clock.period = next;
    if (next === 'completed') {
      fixture.status = 'completed';
      fixture.completed_at = now;
    } else if (!BREAKS.includes(next)) {
      // A new half starts straight away.
      fixture.clock.is_running = true;
      fixture.clock.resumed_at = now;
    }
  } else if (action === 'set_time') {
    fixture.clock.elapsed_seconds = elapsed_seconds ?? 0;
    if (fixture.clock.is_running) {
      fixture.clock.resumed_at = now;
    }
  }

  await recomputeFixture(fixture);
  return loadFixtureDetail(fixture._id);
}

/**
 * Marks the match as completed / full time.
 */
export async function finishMatch(fixture) {
  ensureKickedOff(fixture, 'The match has not kicked off yet');
  pauseClock(fixture.clock, new Date());

  fixture.clock.period = 'completed';
  fixture.status = 'completed';
  fixture.completed_at = new Date();

  await recomputeFixture(fixture);
  return loadFixtureDetail(fixture._id);
}

/**
 * Adds an event (goal, card, substitution) to the match.
 */
export async function addMatchEvent(fixture, eventData) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'Cannot add events to a completed match');
  }
  ensureKickedOff(fixture, 'Kick off the match before recording events');
  checkEventPlayers(fixture, eventData, { isNew: true });

  fixture.events.push(eventData);
  await recomputeFixture(fixture);
  return loadFixtureDetail(fixture._id);
}

/**
 * Updates an existing match event.
 */
export async function updateMatchEvent(fixture, eventId, eventData) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'Cannot edit events of a completed match');
  }

  const event = fixture.events.id(eventId);
  if (!event) {
    throw new HttpError(404, 'Event not found');
  }
  checkEventPlayers(fixture, eventData, { isNew: false });

  // Fields the new version does not use (e.g. an assist on what is now a card) are cleared.
  event.set({ player: null, assist_player: null, player_out: null, player_in: null, card_type: null, ...eventData });
  await recomputeFixture(fixture);
  return loadFixtureDetail(fixture._id);
}

/**
 * Deletes a match event (undo / removal).
 */
export async function deleteMatchEvent(fixture, eventId) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'Cannot delete events from a completed match');
  }

  const event = fixture.events.id(eventId);
  if (!event) {
    throw new HttpError(404, 'Event not found');
  }

  fixture.events.pull({ _id: eventId });
  await recomputeFixture(fixture);
  return loadFixtureDetail(fixture._id);
}
