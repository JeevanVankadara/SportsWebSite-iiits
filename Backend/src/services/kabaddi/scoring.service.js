import { PLAYING_PERIODS } from '../../models/sports/kabaddi/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { recomputeFixture } from './fixture.service.js';
import { computeElapsedSeconds, fixtureConfig, otherTeam, replayMatch } from './rules.js';

function pauseClock(clock, now) {
  if (!clock.is_running) return;
  clock.elapsed_seconds = computeElapsedSeconds(clock, now);
  clock.is_running = false;
  clock.resumed_at = null;
}

function ensureStarted(fixture, message) {
  if (fixture.status !== 'live' || fixture.clock.period === 'not_started') throw new HttpError(409, message);
}

/**
 * Starts, pauses and resumes the clock, and moves between halves.
 */
export async function controlClock(fixture, { action, remaining_seconds }) {
  if (fixture.status === 'completed') throw new HttpError(409, 'This match is over');

  const now = new Date();
  const clock = fixture.clock;
  const halfSeconds = fixtureConfig(fixture).half_duration_minutes * 60;

  if (action === 'start') {
    if (clock.period !== 'not_started') throw new HttpError(409, 'The match has already started');
    if (!fixture.lineup_locked_at) throw new HttpError(409, 'Submit both lineups before starting the match');
    if (!fixture.first_raid) throw new HttpError(409, 'Pick the house that raids first');
    clock.period = 'first_half';
    clock.elapsed_seconds = 0;
    clock.is_running = true;
    clock.resumed_at = now;
    fixture.status = 'live';
  } else {
    ensureStarted(fixture, 'Start the match first');

    if (action === 'pause') {
      pauseClock(clock, now);
    } else if (action === 'resume') {
      if (clock.period === 'half_time') throw new HttpError(409, 'It is half time. Start the second half instead.');
      if (!clock.is_running) {
        clock.is_running = true;
        clock.resumed_at = now;
      }
    } else if (action === 'next_period') {
      pauseClock(clock, now);
      if (clock.period === 'first_half') {
        clock.period = 'half_time';
      } else if (clock.period === 'half_time') {
        clock.period = 'second_half';
        clock.elapsed_seconds = 0;
        clock.is_running = true;
        clock.resumed_at = now;
      } else {
        throw new HttpError(409, 'Use Finish match to end the second half');
      }
    } else if (action === 'set_time') {
      clock.elapsed_seconds = Math.max(0, halfSeconds - remaining_seconds);
      if (clock.is_running) clock.resumed_at = now;
    }
  }

  await recomputeFixture(fixture);
}

/**
 * Ends the match. The score decides the result.
 */
export async function finishMatch(fixture) {
  ensureStarted(fixture, 'The match has not started yet');
  pauseClock(fixture.clock, new Date());
  fixture.clock.period = 'completed';
  fixture.status = 'completed';
  fixture.completed_at = new Date();
  await recomputeFixture(fixture);
}

// Checks a new event against the match as it stands: raiders and substitutes going off must be
// on court, touched and tackling players must be defenders on court, and so on.
function checkAgainstState(fixture, event) {
  const state = replayMatch(fixture);
  const config = fixtureConfig(fixture);
  const own = state.sides[event.team];
  const opponents = state.sides[otherTeam(event.team)];
  const onCourt = (side, id) => side.on_court.includes(id);

  if (event.type === 'raid' || event.type === 'tackle' || event.type === 'line_out') {
    if (!onCourt(own, event.raider)) throw new HttpError(400, 'The raider must be on court');
  }
  if (event.type === 'raid') {
    if (event.bonus && !config.bonus_enabled) throw new HttpError(400, 'Bonus points are off for this match');
    if (event.touched.some((id) => !onCourt(opponents, id))) {
      throw new HttpError(400, 'Defenders out must be defenders on court');
    }
  }
  if (event.type === 'tackle') {
    if (!onCourt(opponents, event.tackler)) throw new HttpError(400, 'The tackler must be a defender on court');
    if (event.assists.some((id) => !onCourt(opponents, id))) {
      throw new HttpError(400, 'Assists must be defenders on court');
    }
  }
  if (event.type === 'substitution') {
    if (!onCourt(own, event.player_out)) throw new HttpError(400, 'The player going off must be on court');
    if (!own.bench.includes(event.player_in)) {
      throw new HttpError(
        400,
        own.subbed_off.includes(event.player_in)
          ? 'A player who was substituted off cannot come back'
          : 'The player coming on must be an unused substitute',
      );
    }
  }
  if (event.type === 'correction' && state.score[event.team] + event.points < 0) {
    throw new HttpError(400, 'A correction cannot make a score negative');
  }
}

/**
 * Records a raid, tackle, line out, technical point, correction or substitution.
 * The admin can still add technical points and corrections after the match is over.
 */
export async function addMatchEvent(fixture, event, { admin = false } = {}) {
  const { period } = fixture.clock;
  const scoreOnly = event.type === 'technical' || event.type === 'correction';

  if (fixture.status === 'completed') {
    if (!admin || !scoreOnly) throw new HttpError(409, 'This match is over');
  } else {
    ensureStarted(fixture, 'Start the match before recording anything');
    const allowedAtBreak = scoreOnly || event.type === 'substitution';
    if (!PLAYING_PERIODS.includes(period) && !allowedAtBreak) {
      throw new HttpError(409, 'Raids, tackles and line outs can be recorded only while a half is being played');
    }
  }

  checkAgainstState(fixture, event);

  const half = period === 'half_time' ? 'first_half' : period;
  fixture.events.push({ ...event, half });
  await recomputeFixture(fixture);
}

/**
 * Removes the latest event, as if it never happened.
 */
export async function undoLastEvent(fixture) {
  if (fixture.events.length === 0) throw new HttpError(409, 'There is nothing to undo');
  fixture.events.pop();
  await recomputeFixture(fixture);
}

/**
 * Admin only: removes any event. Everything after it is replayed without it.
 */
export async function deleteMatchEvent(fixture, eventId) {
  if (!fixture.events.id(eventId)) throw new HttpError(404, 'Event not found');
  fixture.events.pull({ _id: eventId });
  await recomputeFixture(fixture);
}
