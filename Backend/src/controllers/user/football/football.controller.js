import { FootballFixture } from '../../../models/sports/football/FootballFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/football/fixture.service.js';
import { computeStandings } from '../../../services/football/standings.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404, isObjectId } from '../../../utils/validation.js';

export async function listFixtures(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const fixtures = await FootballFixture.find({ tournament: tournament._id })
    .populate('referees', 'name username roll_number')
    .sort({ scheduled_at: 1, created_at: -1 });

  res.json({ fixtures });
}

export async function getFixture(req, res) {
  const fixture = isObjectId(req.params.id) ? await loadFixtureDetail(req.params.id) : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  const tournament = await Tournament.findById(fixture.tournament, 'tournament_name houses');
  res.json({ fixture, tournament });
}

export async function getStandings(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const standings = await computeStandings(tournament);
  res.json({ standings });
}
