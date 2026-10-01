import { BadmintonFixture } from '../../../models/sports/badminton/BadmintonFixture.js';
import { TEAMS } from '../../../models/sports/badminton/constants.js';
import { applyFixtureDecision, saveMatchOrder } from '../../../services/badminton/fixture.service.js';
import { saveSlip } from '../../../services/badminton/lineup.service.js';
import { parsePlan, parseSlip, validateFixtureDecision } from '../../../services/badminton/validators.js';
import { createGuest } from '../../../services/guestPlayer.service.js';
import { HttpError } from '../../../utils/httpError.js';
import { ensureOpen, refereeDetail, refereeFixture } from './access.js';

// GET /api/coordinator/badminton/fixtures — the badminton fixtures the signed-in player referees.
export async function listMyFixtures(req, res) {
  const fixtures = await BadmintonFixture.find({ referees: req.player._id })
    .sort({ scheduled_at: 1, created_at: 1 })
    .populate('tournament', 'tournament_name houses')
    .populate('referees', 'name username');
  res.json({ fixtures });
}

// GET /api/coordinator/badminton/fixtures/:id
export async function getMyFixture(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  res.json(await refereeDetail(fixture._id, { publish: false }));
}

// PUT /api/coordinator/badminton/fixtures/:id/order — body: { plan: [{ type, sets_count, points_to_win }] }
export async function setMatchOrder(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);
  await saveMatchOrder(fixture, parsePlan(req.body?.plan));
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/badminton/fixtures/:id/slips/:team
// body: { lineup: [{ match, players: [playerId] }], submit: true | false }
export async function setSlip(req, res) {
  const { team } = req.params;
  if (!TEAMS.includes(team)) throw new HttpError(404, 'Slip not found');
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);
  await saveSlip(fixture, team, parseSlip(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/badminton/fixtures/:id/decision — abandon the whole fixture.
// body: { result_type: 'abandoned', result: 'team1' | 'team2' | 'draw', note }
export async function decideFixture(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);
  const decision = validateFixtureDecision(req.body ?? {});
  if (decision.result_type !== 'abandoned') throw new HttpError(400, 'Choose who gets the fixture and add a note');
  await applyFixtureDecision(fixture, decision);
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/badminton/fixtures/:id/guests — body: { name }
// Adds a player who has no account, for this match only (services/guestPlayer.service.js).
export async function addGuest(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  ensureOpen(fixture);
  res.status(201).json({ player: await createGuest('badminton', fixture, req.body?.name) });
}
