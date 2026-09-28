import { Player } from '../../../models/Player.js';
import { FootballFixture } from '../../../models/sports/football/FootballFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import {
  deleteFixtures,
  findFootballGame,
  loadFixtureDetail,
  setFixtureDecision as applyFixtureDecision,
} from '../../../services/football/fixture.service.js';
import { validateFixtureDecision } from '../../../services/football/validators.js';
import { HttpError } from '../../../utils/httpError.js';
import { ensureAllExist, findByIdOr404, isObjectId, optionalDate, optionalIdList } from '../../../utils/validation.js';

const TEAM_LABELS = { team1: 'Team 1', team2: 'Team 2' };

function requireHouse(tournament, value, label) {
  if (!isObjectId(value) || !tournament.houses.id(value)) {
    throw new HttpError(400, `${label} must be one of this tournament's houses`);
  }
  return value;
}

async function applyDetails(fixture, tournament, body) {
  for (const team of ['team1', 'team2']) {
    if (!fixture.isNew && body[team] === undefined) continue;
    const houseId = requireHouse(tournament, body[team], TEAM_LABELS[team]);
    if (!fixture.isNew && !fixture[team].equals(houseId) && fixture.status !== 'scheduled') {
      throw new HttpError(409, 'Teams cannot change after the match has started');
    }
    fixture[team] = houseId;
  }

  const referees = optionalIdList(body.referees, 'Referees');
  if (referees) {
    await ensureAllExist(Player, referees, 'referees');
    fixture.referees = referees;
  }

  const scheduledAt = optionalDate(body.scheduled_at, 'Date and time');
  if (scheduledAt !== undefined) fixture.scheduled_at = scheduledAt;
}

export async function createFixture(req, res) {
  const body = req.body ?? {};
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const football = await findFootballGame();
  if (!football || !tournament.games.some((id) => id.equals(football._id))) {
    throw new HttpError(409, "Football is not one of this tournament's sports. Add it from Edit tournament first.");
  }

  const fixture = new FootballFixture({ tournament: tournament._id });
  await applyDetails(fixture, tournament, body);
  await fixture.save();

  res.status(201).json({ fixture: await loadFixtureDetail(fixture._id) });
}

export async function updateFixture(req, res) {
  const body = req.body ?? {};
  const fixture = await findByIdOr404(FootballFixture, req.params.id, 'Fixture not found');
  const tournament = await Tournament.findById(fixture.tournament);
  await applyDetails(fixture, tournament, body);
  await fixture.save();

  res.json({ fixture: await loadFixtureDetail(fixture._id) });
}

export async function deleteFixture(req, res) {
  const fixture = await findByIdOr404(FootballFixture, req.params.id, 'Fixture not found');
  await deleteFixtures({ _id: fixture._id });
  res.status(204).end();
}

export async function setFixtureDecision(req, res) {
  const fixture = await findByIdOr404(FootballFixture, req.params.id, 'Fixture not found');
  const decision = validateFixtureDecision(req.body ?? {});
  res.json({ fixture: await applyFixtureDecision(fixture, decision) });
}
