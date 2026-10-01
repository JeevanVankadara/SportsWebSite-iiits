import { FootballFixture } from '../../../models/sports/football/FootballFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/football/fixture.service.js';
import { publishFixture } from '../../../services/liveBus.js';
import { HttpError } from '../../../utils/httpError.js';
import { isObjectId } from '../../../utils/validation.js';

export async function refereeFixture(fixtureId, player) {
  const fixture = isObjectId(fixtureId)
    ? await FootballFixture.findOne({ _id: fixtureId, referees: player._id })
    : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  return fixture;
}

export function ensureOpen(fixture) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'This match is over. Only the admin can change it now.');
  }
}

// Publishes by default: every referee action answers with this. Read-only callers pass
// { publish: false } so just opening the page does not push an update to viewers.
export async function refereeDetail(fixtureId, { publish = true } = {}) {
  const fixture = await loadFixtureDetail(fixtureId);
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  const tournament = await Tournament.findById(fixture.tournament, 'tournament_name houses');
  if (publish) publishFixture('football', fixture._id);
  return { fixture, tournament };
}
