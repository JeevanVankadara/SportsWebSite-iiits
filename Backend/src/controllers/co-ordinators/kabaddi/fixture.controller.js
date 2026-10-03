import { KabaddiFixture } from '../../../models/sports/kabaddi/KabaddiFixture.js';
import {
  fixtureResponse,
  saveLineup,
  saveMatchConfig,
  setFirstRaid,
  setFixtureDecision,
} from '../../../services/kabaddi/fixture.service.js';
import { addMatchEvent, controlClock, finishMatch, undoLastEvent } from '../../../services/kabaddi/scoring.service.js';
import {
  parseClockAction,
  parseFirstRaid,
  parseLineup,
  parseMatchConfig,
  parseMatchEvent,
  validateFixtureDecision,
} from '../../../services/kabaddi/validators.js';
import { createGuest } from '../../../services/guestPlayer.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { isObjectId } from '../../../utils/validation.js';

// A referee can run only the fixtures they are assigned to, and only until the match is over.
async function openFixture(req) {
  const fixture = isObjectId(req.params.id)
    ? await KabaddiFixture.findOne({ _id: req.params.id, referees: req.player._id })
    : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
  if (fixture.status === 'completed') {
    throw new HttpError(409, 'This match is over. Only the admin can change it now.');
  }
  return fixture;
}

export async function myFixtures(req, res) {
  const fixtures = await KabaddiFixture.find({
    referees: req.player._id,
    status: { $in: ['live', 'scheduled'] },
  })
    .select('-events')
    .populate('tournament', 'tournament_name houses')
    .sort({ scheduled_at: 1, created_at: -1 });
  res.json({ fixtures });
}

export async function getFixture(req, res) {
  const fixture = isObjectId(req.params.id)
    ? await KabaddiFixture.exists({ _id: req.params.id, referees: req.player._id })
    : null;
  if (!fixture) throw new HttpError(404, 'Fixture not found');
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

  const lineup = parseLineup(req.body ?? {}, fixture.config.players_on_court, fixture.config.max_substitutes);
  await saveLineup(fixture, team, lineup);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function saveFirstRaid(req, res) {
  const fixture = await openFixture(req);
  await setFirstRaid(fixture, parseFirstRaid(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function decideFixture(req, res) {
  const fixture = await openFixture(req);
  // Referees can only abandon a match; changing a decision afterwards is up to the admin.
  const decision = validateFixtureDecision(req.body ?? {});
  if (decision.result_type !== 'abandoned') throw new HttpError(400, 'Choose who gets the match and add a note');
  await setFixtureDecision(fixture, decision);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function clockControl(req, res) {
  const fixture = await openFixture(req);
  await controlClock(fixture, parseClockAction(req.body ?? {}));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function endMatch(req, res) {
  const fixture = await openFixture(req);
  await finishMatch(fixture);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function createEvent(req, res) {
  const fixture = await openFixture(req);
  await addMatchEvent(fixture, parseMatchEvent(req.body ?? {}, { allowCorrection: true }));
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

export async function undoEvent(req, res) {
  const fixture = await openFixture(req);
  await undoLastEvent(fixture);
  res.json(await fixtureResponse(fixture._id, { publish: true }));
}

// POST /api/coordinator/kabaddi/fixtures/:id/guests — body: { name }
// Adds a player who has no account, for this match only (services/guestPlayer.service.js).
export async function addGuest(req, res) {
  const fixture = await openFixture(req);
  res.status(201).json({ player: await createGuest('kabaddi', fixture, req.body?.name) });
}
