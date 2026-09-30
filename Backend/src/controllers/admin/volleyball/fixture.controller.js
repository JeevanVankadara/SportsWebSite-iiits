import { Player } from '../../../models/Player.js';
import { VolleyballFixture } from '../../../models/sports/volleyball/VolleyballFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import {
  deleteFixtures,
  findVolleyballGame,
  fixtureResponse,
  setFixtureDecision as applyFixtureDecision,
} from '../../../services/volleyball/fixture.service.js';
import { validateFixtureDecision } from '../../../services/volleyball/validators.js';
import { HttpError } from '../../../utils/httpError.js';
import { ensureAllExist, findByIdOr404, isObjectId, optionalDate, optionalIdList } from '../../../utils/validation.js';

// Like every other sport, the admin only creates, edits and deletes the fixture and sets the final
// decision. The match itself (rules, lineups and scoring) is run by the assigned referee.

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
      throw new HttpError(409, 'Houses cannot change after the match has started');
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

const loadFixture = (req) => findByIdOr404(VolleyballFixture, req.params.id, 'Fixture not found');

export async function createFixture(req, res) {
  const body = req.body ?? {};
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const volleyball = await findVolleyballGame();
  if (!volleyball || !tournament.games.some((id) => id.equals(volleyball._id))) {
    throw new HttpError(409, "Volleyball is not one of this tournament's sports. Add it from Edit tournament first.");
  }

  const fixture = new VolleyballFixture({ tournament: tournament._id });
  await applyDetails(fixture, tournament, body);
  await fixture.save();
  res.status(201).json(await fixtureResponse(fixture._id));
}

export async function updateFixture(req, res) {
  const fixture = await loadFixture(req);
  const tournament = await Tournament.findById(fixture.tournament);
  await applyDetails(fixture, tournament, req.body ?? {});
  await fixture.save();
  res.json(await fixtureResponse(fixture._id));
}

export async function deleteFixture(req, res) {
  const fixture = await loadFixture(req);
  await deleteFixtures({ _id: fixture._id });
  res.status(204).end();
}

export async function setFixtureDecision(req, res) {
  const fixture = await loadFixture(req);
  await applyFixtureDecision(fixture, validateFixtureDecision(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id));
}
