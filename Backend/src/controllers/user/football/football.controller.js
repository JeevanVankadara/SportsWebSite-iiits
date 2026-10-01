import { FootballFixture } from '../../../models/sports/football/FootballFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import { fixtureStreamHandler } from '../../../services/fixtureStream.js';
import { loadFixtureDetail } from '../../../services/football/fixture.service.js';
import { computeStandings } from '../../../services/football/standings.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404, isObjectId } from '../../../utils/validation.js';

// The fixture list query, shared with the home page's live refresh (controllers/user/live.controller.js).
export const fixtureListQuery = (filter) =>
  FootballFixture.find(filter).populate('referees', 'name username roll_number').sort({ scheduled_at: 1, created_at: -1 });

export async function listFixtures(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const fixtures = await fixtureListQuery({ tournament: tournament._id });

  res.json({ fixtures });
}

async function publicFixture(fixtureId) {
  const fixture = isObjectId(fixtureId) ? await loadFixtureDetail(fixtureId) : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  const tournament = await Tournament.findById(fixture.tournament, 'tournament_name houses');
  return { fixture, tournament };
}

export async function getFixture(req, res) {
  res.json(await publicFixture(req.params.id));
}

// GET /api/football/fixtures/:id/stream — the same payload as getFixture, pushed live over SSE.
export const streamFixture = fixtureStreamHandler('football', publicFixture);

export async function getStandings(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const standings = await computeStandings(tournament);
  res.json({ standings });
}
