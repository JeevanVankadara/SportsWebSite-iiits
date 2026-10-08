import { ThrowballFixture } from '../../../models/sports/throwball/ThrowballFixture.js';
import {
  fixtureResponse,
  saveLineup,
  saveMatchConfig,
  setFixtureDecision,
} from '../../../services/throwball/fixture.service.js';
import {
  addSubstitution,
  changeScore,
  editSetScore,
  finishMatch,
  startMatch,
  startNextSet,
  undoLastEvent,
} from '../../../services/throwball/scoring.service.js';
import {
  parseLineup,
  parseMatchConfig,
  parseScoreChange,
  parseSetScore,
  parseSubstitution,
  validateFixtureDecision,
} from '../../../services/throwball/validators.js';
import { createGuest } from '../../../services/guestPlayer.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { isObjectId } from '../../../utils/validation.js';

// A referee can run only the fixtures they are assigned to, and only until the match is over.
async function openFixture(req) {
  const fixture = isObjectId(req.params.id)
    ? await ThrowballFixture.findOne({ _id: req.params.id, referees: req.player._id })
    : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'This match is over. Only the admin can change it now.');
  }
  return fixture;
}

export async function myFixtures(req, res) {
  const fixtures = await ThrowballFixture.find({
    referees: req.player._id,
    status: { $in: ['live', 'scheduled'] },
  })
    .select('-events')
    .populate('tournament', 'tournament_name houses')
    .sort({ scheduled_at: 1, created_at: -1 });
  res.json({ fixtures });
}

export async function getFixture(req, res) {
  const exists = isObjectId(req.params.id)
    ? await ThrowballFixture.exists({ _id: req.params.id, referees: req.player._id })
    : null;
  if (!exists) throw new HttpError(404, 'Fixture not found');
  res.json(await fixtureResponse(req.params.id));
}

export async function saveConfig(req, res) {
  const fixture = await openFixture(req);
  await saveMatchConfig(fixture, parseMatchConfig(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function saveTeamLineup(req, res) {
  const fixture = await openFixture(req);
  const { team } = req.params;
  if (team !== 'team1' && team !== 'team2') throw new HttpError(400, 'Team must be team1 or team2');
  await saveLineup(fixture, team, parseLineup(fixture.config, req.body ?? {}));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function decideFixture(req, res) {
  const fixture = await openFixture(req);
  const decision = validateFixtureDecision(req.body ?? {});
  if (decision.result_type !== 'abandoned') throw new HttpError(400, 'Choose who gets the match and add a note');
  await setFixtureDecision(fixture, decision);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function start(req, res) {
  const fixture = await openFixture(req);
  await startMatch(fixture);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function score(req, res) {
  const fixture = await openFixture(req);
  await changeScore(fixture, parseScoreChange(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function nextSet(req, res) {
  const fixture = await openFixture(req);
  await startNextSet(fixture);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function finish(req, res) {
  const fixture = await openFixture(req);
  await finishMatch(fixture);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function editSet(req, res) {
  const fixture = await openFixture(req);
  await editSetScore(fixture, req.params.setId, parseSetScore(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function createSubstitution(req, res) {
  const fixture = await openFixture(req);
  await addSubstitution(fixture, parseSubstitution(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function undoEvent(req, res) {
  const fixture = await openFixture(req);
  await undoLastEvent(fixture);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

// POST /api/coordinator/throwball/fixtures/:id/guests — body: { name }
// Adds a player who has no account, for this match only (services/guestPlayer.service.js).
export async function addGuest(req, res) {
  const fixture = await openFixture(req);
  res.status(201).json({ player: await createGuest('throwball', fixture, req.body?.name) });
}
