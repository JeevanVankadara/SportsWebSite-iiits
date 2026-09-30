import { CricketFixture } from '../../../models/sports/cricket/CricketFixture.js';
import { TABLE_POINTS } from '../../../models/sports/cricket/constants.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/cricket/fixture.service.js';
import { computeStandings } from '../../../services/cricket/standings.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404, isObjectId } from '../../../utils/validation.js';

// GET /api/cricket/tournaments/:tournamentId/fixtures
export async function listFixtures(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const fixtures = await CricketFixture.find({ tournament: tournament._id })
    .sort({ scheduled_at: 1, created_at: 1 })
    .populate('referees', 'name username');
  res.json({ fixtures });
}

// GET /api/cricket/fixtures/:id — the fixture with its squads and every innings' scorecard.
export async function getFixture(req, res) {
  const detail = isObjectId(req.params.id) ? await loadFixtureDetail(req.params.id) : null;
  if (!detail?.fixture) throw new HttpError(404, 'Fixture not found');
  res.json(detail);
}

// GET /api/cricket/tournaments/:tournamentId/standings
export async function getStandings(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  res.json({ standings: await computeStandings(tournament), table_points: TABLE_POINTS });
}
