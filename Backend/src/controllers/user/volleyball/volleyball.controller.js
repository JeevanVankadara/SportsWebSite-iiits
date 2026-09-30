import { TABLE_POINTS } from '../../../models/sports/volleyball/constants.js';
import { VolleyballFixture } from '../../../models/sports/volleyball/VolleyballFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import { fixtureResponse } from '../../../services/volleyball/fixture.service.js';
import { computeStandings } from '../../../services/volleyball/standings.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404, isObjectId } from '../../../utils/validation.js';

export async function listFixtures(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const fixtures = await VolleyballFixture.find({ tournament: tournament._id })
    .select('-events')
    .populate('referees', 'name username roll_number')
    .sort({ scheduled_at: 1, created_at: 1 });
  res.json({ fixtures });
}

export async function getFixture(req, res) {
  if (!isObjectId(req.params.id)) throw new HttpError(404, 'Fixture not found');
  res.json(await fixtureResponse(req.params.id));
}

export async function getStandings(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  res.json({ standings: await computeStandings(tournament), table_points: TABLE_POINTS });
}
