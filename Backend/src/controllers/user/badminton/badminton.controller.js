import { BadmintonFixture } from '../../../models/sports/badminton/BadmintonFixture.js';
import { TABLE_POINTS } from '../../../models/sports/badminton/constants.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/badminton/fixture.service.js';
import { computeStandings } from '../../../services/badminton/standings.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404, isObjectId } from '../../../utils/validation.js';

// Public reads: used by the admin dashboard now and by the students' live pages later.

// GET /api/badminton/tournaments/:tournamentId/fixtures
export async function listFixtures(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const fixtures = await BadmintonFixture.find({ tournament: tournament._id })
    .sort({ scheduled_at: 1, created_at: 1 })
    .populate('referees', 'name username');
  res.json({ fixtures });
}

// GET /api/badminton/fixtures/:id — the fixture with every match, its players and set scores.
export async function getFixture(req, res) {
  const detail = isObjectId(req.params.id) ? await loadFixtureDetail(req.params.id) : null;
  if (!detail?.fixture) throw new HttpError(404, 'Fixture not found');
  res.json(detail);
}

// GET /api/badminton/tournaments/:tournamentId/standings
export async function getStandings(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  res.json({ standings: await computeStandings(tournament), table_points: TABLE_POINTS });
}
