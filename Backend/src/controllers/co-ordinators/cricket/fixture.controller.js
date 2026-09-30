import { CricketFixture } from '../../../models/sports/cricket/CricketFixture.js';
import { applyFixtureDecision } from '../../../services/cricket/fixture.service.js';
import { acceptTie, startInnings } from '../../../services/cricket/scoring.service.js';
import { saveSetup, saveToss } from '../../../services/cricket/setup.service.js';
import { parseOpeners, parseSetup, parseToss, validateFixtureDecision } from '../../../services/cricket/validators.js';
import { HttpError } from '../../../utils/httpError.js';
import { openRefereeFixture, refereeDetail, refereeFixture } from './access.js';

// GET /api/coordinator/cricket/fixtures
export async function listMyFixtures(req, res) {
  const fixtures = await CricketFixture.find({ referees: req.player._id })
    .sort({ scheduled_at: 1, created_at: 1 })
    .populate('tournament', 'tournament_name houses')
    .populate('referees', 'name username');
  res.json({ fixtures });
}

// GET /api/coordinator/cricket/fixtures/:id
export async function getMyFixture(req, res) {
  const fixture = await refereeFixture(req.params.id, req.player);
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/cricket/fixtures/:id/setup
// body: { overs, powerplay_overs, team1: { players, substitutes }, team2: { players, substitutes } }
export async function setSetup(req, res) {
  const fixture = await openRefereeFixture(req.params.id, req.player);
  await saveSetup(fixture, parseSetup(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/cricket/fixtures/:id/toss — body: { winner, decision: 'bat' | 'bowl' }
export async function setToss(req, res) {
  const fixture = await openRefereeFixture(req.params.id, req.player);
  await saveToss(fixture, parseToss(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/cricket/fixtures/:id/innings — body: { striker, non_striker, bowler }
export async function beginInnings(req, res) {
  const fixture = await openRefereeFixture(req.params.id, req.player);
  await startInnings(fixture, parseOpeners(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/cricket/fixtures/:id/accept-tie
export async function finishAsTie(req, res) {
  const fixture = await openRefereeFixture(req.params.id, req.player);
  await acceptTie(fixture);
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/cricket/fixtures/:id/decision — body: { result_type: 'abandoned', result, note }
export async function decideFixture(req, res) {
  const fixture = await openRefereeFixture(req.params.id, req.player);
  const decision = validateFixtureDecision(req.body ?? {});
  if (decision.result_type !== 'abandoned') throw new HttpError(400, 'Choose who gets the match and add a note');
  await applyFixtureDecision(fixture, decision);
  res.json(await refereeDetail(fixture._id));
}
