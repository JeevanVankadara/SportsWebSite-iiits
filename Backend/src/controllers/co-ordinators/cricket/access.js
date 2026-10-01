import { CricketFixture } from '../../../models/sports/cricket/CricketFixture.js';
import { CricketInnings } from '../../../models/sports/cricket/CricketInnings.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/cricket/fixture.service.js';
import { publishFixture } from '../../../services/liveBus.js';
import { HttpError } from '../../../utils/httpError.js';
import { isObjectId } from '../../../utils/validation.js';

// A co-ordinator may only see and run fixtures they referee. Anyone else gets "not found".
export async function refereeFixture(fixtureId, player) {
  const fixture = isObjectId(fixtureId) ? await CricketFixture.findOne({ _id: fixtureId, referees: player._id }) : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  return fixture;
}

export function ensureOpen(fixture) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'This fixture is over. Only the admin can change it now.');
  }
}

export async function openRefereeFixture(fixtureId, player) {
  const fixture = await refereeFixture(fixtureId, player);
  ensureOpen(fixture);
  return fixture;
}

export async function openRefereeInnings(inningsId, player) {
  const innings = isObjectId(inningsId) ? await CricketInnings.findById(inningsId) : null;
  if (!innings) throw new HttpError(404, 'Innings not found');
  const fixture = await openRefereeFixture(String(innings.fixture), player);
  return { innings, fixture };
}

// Every referee action answers with this, so the screen always shows the saved state.
// It also publishes the change to live viewers; read-only callers pass { publish: false }
// so just opening the page does not push an update.
export async function refereeDetail(fixtureId, { publish = true } = {}) {
  const { fixture, innings } = await loadFixtureDetail(fixtureId);
  const tournament = await Tournament.findById(fixture.tournament, 'tournament_name houses');
  if (publish) publishFixture('cricket', fixture._id);
  return { fixture, innings, tournament };
}
