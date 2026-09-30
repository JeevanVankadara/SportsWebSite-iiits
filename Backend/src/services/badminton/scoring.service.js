import { BadmintonFixture } from '../../models/sports/badminton/BadmintonFixture.js';
import { BadmintonMatch } from '../../models/sports/badminton/BadmintonMatch.js';
import { BadmintonSet } from '../../models/sports/badminton/BadmintonSet.js';
import { HttpError } from '../../utils/httpError.js';
import { recomputeFixture } from './fixture.service.js';
import { refreshPlayerStats } from './playerStats.service.js';
import { invalidSetScore, playersPerSide, setsToWin, setWinner } from './rules.js';
import { validateMatchResult } from './validators.js';

// Live scoring by the referee, court-side. The set in play keeps no stored winner: whether it is won
// is worked out from its score, and it is only closed when the referee taps Next set or Finish match.

const STALE_SCORE = 'The score was changed on another device. The latest score is now shown.';

const playersOf = (match) => [...match.team1_players, ...match.team2_players];

function winnerOf(set, match) {
  return setWinner(set.team1_points, set.team2_points, match.points_to_win, match.point_cap);
}

// Who has won the match if the set in play ends as it stands, or null.
function matchWinnerIfSetEnds(match, setWinnerTeam) {
  const needed = setsToWin(match.sets_count);
  const team1 = match.team1_sets_won + (setWinnerTeam === 'team1' ? 1 : 0);
  const team2 = match.team2_sets_won + (setWinnerTeam === 'team2' ? 1 : 0);
  if (team1 >= needed) return 'team1';
  if (team2 >= needed) return 'team2';
  return null;
}

async function setInPlay(match) {
  if (match.status !== 'live') throw new HttpError(409, `Match ${match.match_no} is not being played right now`);
  const set = await BadmintonSet.findOne({ match: match._id, status: 'live' });
  if (!set) throw new HttpError(409, 'There is no set in play');
  return set;
}

async function firstUnfinishedBefore(match) {
  return BadmintonMatch.findOne({
    fixture: match.fixture,
    match_no: { $lt: match.match_no },
    status: { $ne: 'completed' },
  }).sort({ match_no: 1 });
}

// Starts the next match in slip order and opens set 1.
export async function startMatch(fixture, match) {
  if (!fixture.lineup_locked_at) throw new HttpError(409, "Submit both houses' slips before play starts");
  if (match.status === 'not_played') throw new HttpError(409, 'This match is not needed: the fixture is already decided');
  if (match.status !== 'pending') throw new HttpError(409, `Match ${match.match_no} has already started`);

  const earlier = await firstUnfinishedBefore(match);
  if (earlier) throw new HttpError(409, `Finish match ${earlier.match_no} first. Matches are played in slip order.`);

  const size = playersPerSide(match.type);
  if (match.team1_players.length !== size || match.team2_players.length !== size) {
    throw new HttpError(409, `Add both houses' players for match ${match.match_no} to the slips first`);
  }

  const now = new Date();
  const set = await BadmintonSet.create({
    match: match._id,
    fixture: fixture._id,
    set_no: 1,
    status: 'live',
    started_at: now,
  });
  match.set({ status: 'live', sets: [set._id], team1_sets_won: 0, team2_sets_won: 0, started_at: now });
  await match.save();
  await recomputeFixture(fixture);
}

// A + or - tap on the set in play (see parseScoreChange).
export async function changeScore(match, { team, change, expected }) {
  const set = await setInPlay(match);
  const current = { team1: set.team1_points, team2: set.team2_points };
  if (current.team1 !== expected.team1_points || current.team2 !== expected.team2_points) {
    throw new HttpError(409, STALE_SCORE);
  }
  if (change > 0 && winnerOf(set, match)) {
    throw new HttpError(409, 'This set is already won. Tap Next set or Finish match, or use - or edit to correct it.');
  }

  const next = { ...current, [team]: current[team] + change };
  if (next[team] < 0) throw new HttpError(409, 'The score cannot go below 0');

  // Only applies if nobody changed the score in the meantime.
  const updated = await BadmintonSet.findOneAndUpdate(
    { _id: set._id, status: 'live', team1_points: current.team1, team2_points: current.team2 },
    { $set: { team1_points: next.team1, team2_points: next.team2 } },
  );
  if (!updated) throw new HttpError(409, STALE_SCORE);

  // Touch the fixture so the viewer's polling detects score changes.
  await BadmintonFixture.updateOne({ _id: match.fixture }, { $set: { updated_at: new Date() } });
}

// "Next set": closes the won set and opens the next one.
export async function startNextSet(match) {
  const set = await setInPlay(match);
  const winner = winnerOf(set, match);
  if (!winner) throw new HttpError(409, 'The set is not finished yet');
  if (matchWinnerIfSetEnds(match, winner)) throw new HttpError(409, 'This set wins the match. Tap Finish match.');

  const now = new Date();
  set.set({ status: 'completed', winner, ended_at: now });
  await set.save();

  const next = await BadmintonSet.create({
    match: match._id,
    fixture: match.fixture,
    set_no: set.set_no + 1,
    status: 'live',
    started_at: now,
  });
  match.sets.push(next._id);
  match[`${winner}_sets_won`] += 1;
  await match.save();

  // Touch the fixture so the viewer's polling detects the set change.
  await BadmintonFixture.updateOne({ _id: match.fixture }, { $set: { updated_at: new Date() } });
}

// "Finish match": closes the last set and the match once a house has won enough sets.
export async function finishMatch(fixture, match) {
  const set = await setInPlay(match);
  const winner = winnerOf(set, match);
  if (!winner) throw new HttpError(409, 'The set is not finished yet');
  const matchWinner = matchWinnerIfSetEnds(match, winner);
  if (!matchWinner) throw new HttpError(409, 'Nobody has won the match yet. Tap Next set.');

  const now = new Date();
  set.set({ status: 'completed', winner, ended_at: now });
  await set.save();

  match[`${winner}_sets_won`] += 1;
  match.set({ status: 'completed', result_type: 'normal', winner: matchWinner, note: undefined, ended_at: now });
  await match.save();

  await recomputeFixture(fixture);
  await refreshPlayerStats(playersOf(match));
}

// Ends a match early with the referee's decision (see parseAbandonDecision). Works on the match in play,
// the next match (e.g. a walkover) or a finished one. Points already played stay and count in the
// points difference; an unfinished set is kept as it is.
export async function abandonMatch(fixture, match, decision) {
  if (match.status === 'not_played') throw new HttpError(409, 'This match is not needed: the fixture is already decided');
  if (match.status === 'pending') {
    const earlier = await firstUnfinishedBefore(match);
    if (earlier) throw new HttpError(409, `Finish match ${earlier.match_no} first. Matches are played in slip order.`);
  }

  const now = new Date();
  const set = await BadmintonSet.findOne({ match: match._id, status: 'live' });
  if (set) {
    set.set({ status: 'completed', winner: winnerOf(set, match), ended_at: now });
    await set.save();
  }

  const sets = await BadmintonSet.find({ match: match._id });
  match.set({
    status: 'completed',
    result_type: 'abandoned',
    winner: decision.winner,
    note: decision.note,
    team1_sets_won: sets.filter((item) => item.winner === 'team1').length,
    team2_sets_won: sets.filter((item) => item.winner === 'team2').length,
    ended_at: now,
  });
  match.started_at ??= now;
  await match.save();

  await recomputeFixture(fixture);
  await refreshPlayerStats(playersOf(match));
}

// The edit button: fixes the score of any set in the fixture (see parseSetScore).
// - Set in play: any score that can happen.
// - Earlier set of the match in play: must stay a finished set, and must not already win the match.
// - Set of a finished match: the match must still have a winner; the result follows the new score.
export async function editSetScore(fixture, set, score) {
  const match = await BadmintonMatch.findById(set.match);
  const problem = invalidSetScore(score.team1_points, score.team2_points, match.points_to_win, match.point_cap);
  if (problem) throw new HttpError(400, problem);

  const sets = await BadmintonSet.find({ match: match._id }).sort({ set_no: 1 });
  const scores = sets.map((item) =>
    item._id.equals(set._id) ? score : { team1_points: item.team1_points, team2_points: item.team2_points },
  );

  if (match.status === 'completed') {
    // Checked like a full result; an abandoned match keeps the referee's decision and note.
    const result = validateMatchResult(match, {
      result_type: match.result_type,
      sets: scores,
      winner: match.winner ?? 'draw',
      note: match.note,
    });
    sets.forEach((item, index) => item.set({ ...scores[index], winner: result.sets[index].winner }));
    match.set({ team1_sets_won: result.team1_sets_won, team2_sets_won: result.team2_sets_won, winner: result.winner });
  } else {
    // Match in play: every set before the one in play must be finished and must not decide the match.
    const needed = setsToWin(match.sets_count);
    let team1Won = 0;
    let team2Won = 0;
    sets.forEach((item, index) => {
      if (item.status === 'live') {
        item.set(scores[index]);
        return;
      }
      const winner = setWinner(scores[index].team1_points, scores[index].team2_points, match.points_to_win, match.point_cap);
      if (!winner) throw new HttpError(400, `Set ${item.set_no} is finished, so it needs a final score such as 21-18`);
      if (winner === 'team1') team1Won += 1;
      else team2Won += 1;
      if (team1Won >= needed || team2Won >= needed) {
        throw new HttpError(400, 'With this score the match would already be over before the set in play');
      }
      item.set({ ...scores[index], winner });
    });
    match.set({ team1_sets_won: team1Won, team2_sets_won: team2Won });
  }

  await Promise.all(sets.filter((item) => item.isModified()).map((item) => item.save()));
  await match.save();
  if (match.status === 'completed') {
    await recomputeFixture(fixture);
    await refreshPlayerStats(playersOf(match));
  }
}
