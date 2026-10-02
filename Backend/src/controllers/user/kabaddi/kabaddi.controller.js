import { TABLE_POINTS } from '../../../models/sports/kabaddi/constants.js';
import { KabaddiFixture } from '../../../models/sports/kabaddi/KabaddiFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import { fixtureStreamHandler } from '../../../services/fixtureStream.js';
import { fixtureResponse } from '../../../services/kabaddi/fixture.service.js';
import { computeStandings } from '../../../services/kabaddi/standings.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404, isObjectId } from '../../../utils/validation.js';

// The fixture list query, shared with the home page's live refresh (controllers/user/live.controller.js).
export const fixtureListQuery = (filter) =>
  KabaddiFixture.find(filter)
    .select('-events')
    .populate('referees', 'name username roll_number')
    .sort({ scheduled_at: 1, created_at: -1 });

export async function listFixtures(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const fixtures = await fixtureListQuery({ tournament: tournament._id });
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

// GET /api/kabaddi/fixtures/:id/stream — the same payload as getFixture, pushed live over SSE.
export const streamFixture = fixtureStreamHandler('kabaddi', (id) => fixtureResponse(id));
