import { BadmintonFixture } from '../../../models/sports/badminton/BadmintonFixture.js';
import { BadmintonMatch } from '../../../models/sports/badminton/BadmintonMatch.js';
import { clearMatchResult, loadFixtureDetail, recordMatchResult } from '../../../services/badminton/fixture.service.js';
import { validateMatchResult } from '../../../services/badminton/validators.js';
import { HttpError } from '../../../utils/httpError.js';
import { findByIdOr404 } from '../../../utils/validation.js';

// PUT /api/badminton/matches/:id/result — enter or correct a match result.
// body: { result_type, sets: [{ team1_points, team2_points }], winner, note } (see validateMatchResult)
export async function saveMatchResult(req, res) {
  const match = await findByIdOr404(BadmintonMatch, req.params.id, 'Match not found');
  if (match.status === 'not_played') {
    throw new HttpError(409, 'This match was not needed because the fixture was already decided. Correct an earlier match first.');
  }

  // Matches are played in the order on the slips.
  const earlier = await BadmintonMatch.findOne({
    fixture: match.fixture,
    match_no: { $lt: match.match_no },
    status: { $ne: 'completed' },
  }).sort({ match_no: 1 });
  if (earlier) {
    throw new HttpError(409, `Enter the result of match ${earlier.match_no} first. Matches are played in order.`);
  }

  const result = validateMatchResult(match, req.body ?? {});
  const fixture = await BadmintonFixture.findById(match.fixture);
  await recordMatchResult(match, fixture, result);
  res.json(await loadFixtureDetail(fixture._id));
}

// DELETE /api/badminton/matches/:id/result — takes the match back to "not played yet".
export async function removeMatchResult(req, res) {
  const match = await findByIdOr404(BadmintonMatch, req.params.id, 'Match not found');
  if (match.status !== 'completed') throw new HttpError(409, 'This match has no result to clear');

  const later = await BadmintonMatch.findOne({
    fixture: match.fixture,
    match_no: { $gt: match.match_no },
    status: 'completed',
  }).sort({ match_no: -1 });
  if (later) {
    throw new HttpError(409, `Clear match ${later.match_no} first, so the matches stay in order.`);
  }

  const fixture = await BadmintonFixture.findById(match.fixture);
  await clearMatchResult(match, fixture);
  res.json(await loadFixtureDetail(fixture._id));
}
