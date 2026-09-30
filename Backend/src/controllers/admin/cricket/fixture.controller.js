import { Player } from '../../../models/Player.js';
import { CricketFixture } from '../../../models/sports/cricket/CricketFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import {
  applyFixtureDecision,
  deleteFixtures,
  findCricketGame,
  loadFixtureDetail,
} from '../../../services/cricket/fixture.service.js';
import { validateFixtureDecision } from '../../../services/cricket/validators.js';
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
      throw new HttpError(409, 'Teams cannot change after the fixture has started');
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

// POST /api/cricket/tournaments/:tournamentId/fixtures — body: { team1, team2, referees, scheduled_at }
// The admin only declares the fixture; the referee sets the overs, squads and toss.
export async function createFixture(req, res) {
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const cricket = await findCricketGame();
  if (!cricket || !tournament.games.some((id) => id.equals(cricket._id))) {
    throw new HttpError(409, "Cricket is not one of this tournament's sports. Add it from Edit tournament first.");
  }

  const fixture = new CricketFixture({ tournament: tournament._id });
  await applyDetails(fixture, tournament, req.body ?? {});
  await fixture.save();
  res.status(201).json(await loadFixtureDetail(fixture._id));
}

// PATCH /api/cricket/fixtures/:id
export async function updateFixture(req, res) {
  const fixture = await findByIdOr404(CricketFixture, req.params.id, 'Fixture not found');
  const tournament = await Tournament.findById(fixture.tournament);
  await applyDetails(fixture, tournament, req.body ?? {});
  await fixture.save();
  res.json(await loadFixtureDetail(fixture._id));
}

// DELETE /api/cricket/fixtures/:id — removes the fixture with its innings and balls.
export async function deleteFixture(req, res) {
  const fixture = await findByIdOr404(CricketFixture, req.params.id, 'Fixture not found');
  await deleteFixtures({ _id: fixture._id });
  res.status(204).end();
}

// PUT /api/cricket/fixtures/:id/decision
// body: { result_type: 'abandoned', result: 'team1' | 'team2' | 'no_result', note } or { result_type: 'normal' }
export async function setFixtureDecision(req, res) {
  const fixture = await findByIdOr404(CricketFixture, req.params.id, 'Fixture not found');
  await applyFixtureDecision(fixture, validateFixtureDecision(req.body ?? {}));
  res.json(await loadFixtureDetail(fixture._id));
}
