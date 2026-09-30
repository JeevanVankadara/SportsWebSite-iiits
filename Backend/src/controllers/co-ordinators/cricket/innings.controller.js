import {
  endInnings,
  recordBall,
  setBatter,
  setBowler,
  swapStrike,
  undoBall,
} from '../../../services/cricket/scoring.service.js';
import { parseBall, parseBatter, parseBowler, parseExpected } from '../../../services/cricket/validators.js';
import { openRefereeInnings, refereeDetail } from './access.js';

// POST /api/coordinator/cricket/innings/:id/balls
// body: { expected_balls, kind, runs, nb_runs_as, wicket: { kind, player_out, fielder } }
export async function ball(req, res) {
  const { innings, fixture } = await openRefereeInnings(req.params.id, req.player);
  await recordBall(fixture, innings, parseBall(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/cricket/innings/:id/undo — body: { expected_balls }
export async function undo(req, res) {
  const { innings, fixture } = await openRefereeInnings(req.params.id, req.player);
  await undoBall(fixture, innings, parseExpected(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/cricket/innings/:id/batter — body: { player, slot? }
export async function batter(req, res) {
  const { innings, fixture } = await openRefereeInnings(req.params.id, req.player);
  await setBatter(fixture, innings, parseBatter(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/cricket/innings/:id/bowler — body: { player }
export async function bowler(req, res) {
  const { innings, fixture } = await openRefereeInnings(req.params.id, req.player);
  await setBowler(fixture, innings, parseBowler(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/cricket/innings/:id/swap-strike
export async function swap(req, res) {
  const { innings, fixture } = await openRefereeInnings(req.params.id, req.player);
  await swapStrike(innings);
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/cricket/innings/:id/end
export async function end(req, res) {
  const { innings, fixture } = await openRefereeInnings(req.params.id, req.player);
  await endInnings(fixture, innings);
  res.json(await refereeDetail(fixture._id));
}
