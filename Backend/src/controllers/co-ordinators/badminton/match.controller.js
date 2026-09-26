import {
  abandonMatch,
  changeScore,
  editSetScore,
  finishMatch,
  startMatch,
  startNextSet,
} from '../../../services/badminton/scoring.service.js';
import { parseAbandonDecision, parseScoreChange, parseSetScore } from '../../../services/badminton/validators.js';
import { openRefereeMatch, openRefereeSet, refereeDetail } from './access.js';

// Every action answers with the whole fixture, so the referee's screen always shows the saved state.

// POST /api/coordinator/badminton/matches/:id/start
export async function start(req, res) {
  const { match, fixture } = await openRefereeMatch(req.params.id, req.player);
  await startMatch(fixture, match);
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/badminton/matches/:id/score — body: { team, change: 1 | -1, expected }
export async function score(req, res) {
  const { match, fixture } = await openRefereeMatch(req.params.id, req.player);
  await changeScore(match, parseScoreChange(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/badminton/matches/:id/next-set
export async function nextSet(req, res) {
  const { match, fixture } = await openRefereeMatch(req.params.id, req.player);
  await startNextSet(match);
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/badminton/matches/:id/finish
export async function finish(req, res) {
  const { match, fixture } = await openRefereeMatch(req.params.id, req.player);
  await finishMatch(fixture, match);
  res.json(await refereeDetail(fixture._id));
}

// POST /api/coordinator/badminton/matches/:id/abandon — body: { winner: 'team1' | 'team2' | 'draw', note }
export async function abandon(req, res) {
  const { match, fixture } = await openRefereeMatch(req.params.id, req.player);
  await abandonMatch(fixture, match, parseAbandonDecision(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}

// PUT /api/coordinator/badminton/sets/:id — body: { team1_points, team2_points }
export async function editSet(req, res) {
  const { set, fixture } = await openRefereeSet(req.params.id, req.player);
  await editSetScore(fixture, set, parseSetScore(req.body ?? {}));
  res.json(await refereeDetail(fixture._id));
}
