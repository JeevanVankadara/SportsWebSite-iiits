import { Player } from '../../../models/Player.js';
import { BadmintonFixture } from '../../../models/sports/badminton/BadmintonFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import {
  applyFixtureDecision,
  deleteFixtures,
  findBadmintonGame,
  loadFixtureDetail,
} from '../../../services/badminton/fixture.service.js';
import { validateFixtureDecision } from '../../../services/badminton/validators.js';
import { publishFixture } from '../../../services/liveBus.js';
import { HttpError } from '../../../utils/httpError.js';
import { ensureAllExist, findByIdOr404, isObjectId, optionalDate, optionalIdList } from '../../../utils/validation.js';
import { parseStage } from '../../../models/fixtureStage.js';
import { ensureNoGuests } from '../../../services/guestPlayer.service.js';

const TEAM_LABELS = { team1: 'Team 1', team2: 'Team 2' };

function requireHouse(tournament, value, label) {
  if (!isObjectId(value) || !tournament.houses.id(value)) {
    throw new HttpError(400, `${label} must be one of this tournament's houses`);
  }
  return value;
}

// Copies the teams, referees and date sent in the body onto the fixture.
// Teams are required for a new fixture and can only change until play starts.
async function applyDetails(fixture, tournament, body) {
  for (const team of ['team1', 'team2']) {
    if (!fixture.isNew && body[team] === undefined) continue;
    const houseId = requireHouse(tournament, body[team], TEAM_LABELS[team]);
    if (!fixture.isNew && !fixture[team].equals(houseId) && fixture.status !== 'scheduled') {
      throw new HttpError(409, 'Teams cannot change after the fixture has started');
    }
    fixture[team] = houseId;
  }

  const referees = optionalIdList(body.referees, 'Referees');
  if (referees) {
    await ensureAllExist(Player, referees, 'referees');
    await ensureNoGuests(referees);
    fixture.referees = referees;
  }

  const scheduledAt = optionalDate(body.scheduled_at, 'Date and time');
  if (scheduledAt !== undefined) fixture.scheduled_at = scheduledAt;

  const stage = parseStage(body.stage);
  if (stage !== undefined) fixture.stage = stage;
}

// POST /api/badminton/tournaments/:tournamentId/fixtures
// body: { team1, team2, referees: [playerId], scheduled_at }
// The admin only declares the fixture. The referee sets the match order, sets and points at the start.
export async function createFixture(req, res) {
  const body = req.body ?? {};
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const badminton = await findBadmintonGame();
  if (!badminton || !tournament.games.some((id) => id.equals(badminton._id))) {
    throw new HttpError(409, "Badminton is not one of this tournament's sports. Add it from Edit tournament first.");
  }

  const fixture = new BadmintonFixture({ tournament: tournament._id });
  await applyDetails(fixture, tournament, body);
  await fixture.save();

  res.status(201).json(await loadFixtureDetail(fixture._id));
}

// PATCH /api/badminton/fixtures/:id — any of the fields accepted by createFixture.
export async function updateFixture(req, res) {
  const body = req.body ?? {};
  const fixture = await findByIdOr404(BadmintonFixture, req.params.id, 'Fixture not found');
  const tournament = await Tournament.findById(fixture.tournament);
  await applyDetails(fixture, tournament, body);
  await fixture.save();

  publishFixture('badminton', fixture._id);
  res.json(await loadFixtureDetail(fixture._id));
}

// DELETE /api/badminton/fixtures/:id — removes the fixture with its matches and sets.
export async function deleteFixture(req, res) {
  const fixture = await findByIdOr404(BadmintonFixture, req.params.id, 'Fixture not found');
  await deleteFixtures({ _id: fixture._id });
  publishFixture('badminton', fixture._id);
  res.status(204).end();
}

// PUT /api/badminton/fixtures/:id/decision
// body: { result_type: 'abandoned', result: 'team1' | 'team2' | 'draw', note } or { result_type: 'normal' } to remove it.
export async function setFixtureDecision(req, res) {
  const fixture = await findByIdOr404(BadmintonFixture, req.params.id, 'Fixture not found');
  await applyFixtureDecision(fixture, validateFixtureDecision(req.body ?? {}));
  publishFixture('badminton', fixture._id);
  res.json(await loadFixtureDetail(fixture._id));
}
