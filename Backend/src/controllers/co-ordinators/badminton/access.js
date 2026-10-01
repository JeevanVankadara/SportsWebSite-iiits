import { BadmintonFixture } from '../../../models/sports/badminton/BadmintonFixture.js';
import { BadmintonMatch } from '../../../models/sports/badminton/BadmintonMatch.js';
import { BadmintonSet } from '../../../models/sports/badminton/BadmintonSet.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/badminton/fixture.service.js';
import { publishFixture } from '../../../services/liveBus.js';
import { HttpError } from '../../../utils/httpError.js';
import { isObjectId } from '../../../utils/validation.js';

// A co-ordinator may only see and run fixtures they referee. Anyone else gets "not found",
// so other fixtures stay private.
export async function refereeFixture(fixtureId, player) {
  const fixture = isObjectId(fixtureId)
    ? await BadmintonFixture.findOne({ _id: fixtureId, referees: player._id })
    : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  return fixture;
}

// Referees can change anything in a fixture until it is over; after that only the admin can.
export function ensureOpen(fixture) {
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'This fixture is over. Only the admin can change it now.');
  }
}

// The match and its fixture, if the player referees it and the fixture is still going on.
export async function openRefereeMatch(matchId, player) {
  const match = isObjectId(matchId) ? await BadmintonMatch.findById(matchId) : null;
  if (!match) throw new HttpError(404, 'Match not found');
  const fixture = await refereeFixture(String(match.fixture), player);
  ensureOpen(fixture);
  return { match, fixture };
}

// The set and its fixture, if the player referees it and the fixture is still going on.
export async function openRefereeSet(setId, player) {
  const set = isObjectId(setId) ? await BadmintonSet.findById(setId) : null;
  if (!set) throw new HttpError(404, 'Set not found');
  const fixture = await refereeFixture(String(set.fixture), player);
  ensureOpen(fixture);
  return { set, fixture };
}

// What the co-ordinator's fixture page shows: the fixture, its matches with players and sets,
// and the tournament (for the house names).
// Publishes by default: every referee action answers with this. Read-only callers pass
// { publish: false } so just opening the page does not push an update to viewers.
export async function refereeDetail(fixtureId, { publish = true } = {}) {
  const { fixture, matches } = await loadFixtureDetail(fixtureId);
  const tournament = await Tournament.findById(fixture.tournament, 'tournament_name houses');
  if (publish) publishFixture('badminton', fixture._id);
  return { fixture, matches, tournament };
}
