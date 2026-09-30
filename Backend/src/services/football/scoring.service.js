import { HttpError } from '../../utils/httpError.js';
import { loadFixtureDetail, recomputeFixture } from './fixture.service.js';
import { computeElapsedSeconds } from './rules.js';

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

  if (action === 'start') {
    if (!fixture.lineup_locked_at) {
      throw new HttpError(409, 'Submit both team slips before starting the match');
    }

    if (fixture.clock.period === 'not_started') {
      fixture.clock.period = 'first_half';
      fixture.clock.elapsed_seconds = 0;
    }

    fixture.clock.is_running = true;
    fixture.clock.resumed_at = now;
    fixture.status = 'live';
  } else if (action === 'pause') {
    if (fixture.clock.is_running) {
      fixture.clock.elapsed_seconds = computeElapsedSeconds(fixture.clock, now);
      fixture.clock.is_running = false;
      fixture.clock.resumed_at = null;
    }
  } else if (action === 'resume') {
    if (!fixture.clock.is_running) {
      fixture.clock.is_running = true;
      fixture.clock.resumed_at = now;
    }
  } else if (action === 'stoppage') {
    fixture.clock.stoppage_time_minutes = stoppage_time_minutes;
  } else if (action === 'next_period') {
    // Pause clock first
    if (fixture.clock.is_running) {
      fixture.clock.elapsed_seconds = computeElapsedSeconds(fixture.clock, now);
      fixture.clock.is_running = false;
      fixture.clock.resumed_at = null;
    }
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
    }
  } else if (action === 'set_time') {
    fixture.clock.elapsed_seconds = elapsed_seconds ?? 0;
    if (fixture.clock.is_running) {
      fixture.clock.resumed_at = now;
    }
  } else if (action === 'reset') {
    fixture.clock.is_running = false;
    fixture.clock.resumed_at = null;
    fixture.clock.elapsed_seconds = 0;
    fixture.clock.stoppage_time_minutes = 0;
    fixture.clock.period = 'not_started';
    fixture.status = 'scheduled';
  }

  await recomputeFixture(fixture);
  return loadFixtureDetail(fixture._id);
}

/**
 * Marks the match as completed / full time.
 */
export async function finishMatch(fixture) {
  if (fixture.clock.is_running) {
    fixture.clock.elapsed_seconds = computeElapsedSeconds(fixture.clock, new Date());
    fixture.clock.is_running = false;
    fixture.clock.resumed_at = null;
  }

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

  event.set(eventData);
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
