import { FootballFixture } from '../../../models/sports/football/FootballFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import { loadFixtureDetail } from '../../../services/football/fixture.service.js';
import { computeStandings } from '../../../services/football/standings.service.js';
import { findByIdOr404 } from '../../../utils/validation.js';

export async function listFixtures(req, res) {
  const { tournamentId } = req.params;
  const fixtures = await FootballFixture.find({ tournament: tournamentId })
    .populate('referees', 'name username roll_number')
    .sort({ scheduled_at: 1, created_at: -1 });

  res.json({ fixtures });
}

export async function getFixture(req, res) {
  const fixture = await loadFixtureDetail(req.params.id);
  if (!fixture) {
    return res.status(404).json({ message: 'Fixture not found' });
  }
  const tournament = await Tournament.findById(fixture.tournament, 'tournament_name houses');
  res.json({ fixture, tournament });
}

export async function getStandings(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const standings = await computeStandings(tournament);
  res.json({ standings });
}
