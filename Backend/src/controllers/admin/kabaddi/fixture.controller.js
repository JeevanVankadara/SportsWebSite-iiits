import { Player } from '../../../models/Player.js';
import { KabaddiFixture } from '../../../models/sports/kabaddi/KabaddiFixture.js';
import { Tournament } from '../../../models/Tournament.js';
import {
  deleteFixtures,
  findKabaddiGame,
  fixtureResponse,
  saveLineup,
  saveMatchConfig,
  setFirstRaid,
  setFixtureDecision as applyFixtureDecision,
} from '../../../services/kabaddi/fixture.service.js';
import {
  addMatchEvent,
  controlClock,
  deleteMatchEvent,
  finishMatch,
  undoLastEvent,
} from '../../../services/kabaddi/scoring.service.js';
import {
  parseClockAction,
  parseFirstRaid,
  parseLineup,
  parseMatchConfig,
  parseMatchEvent,
  validateFixtureDecision,
} from '../../../services/kabaddi/validators.js';
import { HttpError } from '../../../utils/httpError.js';
import { ensureAllExist, findByIdOr404, isObjectId, optionalDate, optionalIdList } from '../../../utils/validation.js';

// The admin can do everything a referee can, at any time, plus corrections and deleting any event.

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

const loadFixture = (req) => findByIdOr404(KabaddiFixture, req.params.id, 'Fixture not found');

export async function createFixture(req, res) {
  const body = req.body ?? {};
  const tournament = await findByIdOr404(Tournament, req.params.tournamentId, 'Tournament not found');
  const kabaddi = await findKabaddiGame();
  if (!kabaddi || !tournament.games.some((id) => id.equals(kabaddi._id))) {
    throw new HttpError(409, "Kabaddi is not one of this tournament's sports. Add it from Edit tournament first.");
  }

  const fixture = new KabaddiFixture({ tournament: tournament._id });
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

export async function saveConfig(req, res) {
  const fixture = await loadFixture(req);
  await saveMatchConfig(fixture, parseMatchConfig(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id));
}

export async function saveTeamLineup(req, res) {
  const fixture = await loadFixture(req);
  const { team } = req.params;
  if (team !== 'team1' && team !== 'team2') throw new HttpError(400, 'Team must be team1 or team2');

  const lineup = parseLineup(req.body ?? {}, fixture.config.players_on_court, fixture.config.max_substitutes);
  await saveLineup(fixture, team, lineup);
  res.json(await fixtureResponse(fixture._id));
}

export async function saveFirstRaid(req, res) {
  const fixture = await loadFixture(req);
  await setFirstRaid(fixture, parseFirstRaid(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id));
}

export async function clockControl(req, res) {
  const fixture = await loadFixture(req);
  await controlClock(fixture, parseClockAction(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id));
}

export async function endMatch(req, res) {
  const fixture = await loadFixture(req);
  await finishMatch(fixture);
  res.json(await fixtureResponse(fixture._id));
}

export async function createEvent(req, res) {
  const fixture = await loadFixture(req);
  await addMatchEvent(fixture, parseMatchEvent(req.body ?? {}, { allowCorrection: true }), { admin: true });
  res.json(await fixtureResponse(fixture._id));
}

export async function undoEvent(req, res) {
  const fixture = await loadFixture(req);
  await undoLastEvent(fixture);
  res.json(await fixtureResponse(fixture._id));
}

export async function removeEvent(req, res) {
  const fixture = await loadFixture(req);
  await deleteMatchEvent(fixture, req.params.eventId);
  res.json(await fixtureResponse(fixture._id));
}
