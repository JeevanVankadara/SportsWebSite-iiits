import { BadmintonFixture } from '../../../models/sports/badminton/BadmintonFixture.js';
import { TABLE_POINTS } from '../../../models/sports/badminton/constants.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/badminton/fixture.service.js';
import { fixtureStreamHandler } from '../../../services/fixtureStream.js';
import { computeStandings } from '../../../services/badminton/standings.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404, isObjectId } from '../../../utils/validation.js';

// Public reads: used by the admin dashboard now and by the students' live pages later.

// GET /api/badminton/tournaments/:tournamentId/fixtures
// The fixture list query, shared with the home page's live refresh (controllers/user/live.controller.js).
export const fixtureListQuery = (filter) =>
  BadmintonFixture.find(filter).sort({ scheduled_at: 1, created_at: 1 }).populate('referees', 'name username');

export async function listFixtures(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const fixtures = await fixtureListQuery({ tournament: tournament._id });
  res.json({ fixtures });
}

// GET /api/badminton/fixtures/:id — the fixture with every match, its players and set scores.
async function publicFixture(fixtureId) {
  const detail = isObjectId(fixtureId) ? await loadFixtureDetail(fixtureId) : null;
  if (!detail?.fixture) throw new HttpError(404, 'Fixture not found');
  return detail;
}

export async function getFixture(req, res) {
  res.json(await publicFixture(req.params.id));
}

// GET /api/badminton/fixtures/:id/stream — getFixture's payload plus the house names, pushed live
// over SSE. The page loads the tournament separately when polling; a stream has to carry it.
export const streamFixture = fixtureStreamHandler('badminton', async (fixtureId) => {
  const detail = await publicFixture(fixtureId);
  const tournament = await Tournament.findById(detail.fixture.tournament, 'tournament_name houses');
  return { ...detail, tournament };
});

// GET /api/badminton/tournaments/:tournamentId/standings
export async function getStandings(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  res.json({ standings: await computeStandings(tournament), table_points: TABLE_POINTS });
}
