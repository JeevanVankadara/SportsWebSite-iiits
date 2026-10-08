import { HttpError } from '../../utils/httpError.js';
import { recomputeFixture } from './fixture.service.js';
import { idOf, invalidSetScore, matchWinnerIfSetEnds, replayMatch, setWinner, setsToWin } from './rules.js';

// Live scoring by the referee, court-side. The set in play keeps no stored winner: whether it is won
// is worked out from its score, and it is only closed when the referee taps Next set or Finish match.

const STALE_SCORE = 'The score was changed on another device. The latest score is now shown.';

const cfg = (fixture) => ({
  points_to_win: fixture.config.points_to_win,
  point_cap: fixture.config.point_cap,
});

function liveSet(fixture) {
  if (fixture.status === 'completed') throw new HttpError(409, 'This match is over');
  const set = fixture.sets.find((item) => item.status === 'live');
  if (!set) throw new HttpError(409, 'There is no set in play');
  return set;
}

function winnerOf(set, fixture) {
  const { points_to_win, point_cap } = cfg(fixture);
  return setWinner(set.team1_points, set.team2_points, points_to_win, point_cap);
}

// Opens set 1 once both lineups are in.
export async function startMatch(fixture) {
  if (!fixture.lineup_locked_at) throw new HttpError(409, "Submit both houses' lineups before play starts");
  if (fixture.status === 'completed') throw new HttpError(409, 'This match is over');
  if (fixture.status !== 'scheduled' || fixture.sets.length > 0) throw new HttpError(409, 'The match has already started');

  const now = new Date();
  fixture.sets.push({ set_no: 1, status: 'live', started_at: now });
  fixture.status = 'live';
  await recomputeFixture(fixture);
}

// A + or - tap on the set in play (see parseScoreChange).
export async function changeScore(fixture, { team, change, expected }) {
  const set = liveSet(fixture);
  if (set.team1_points !== expected.team1_points || set.team2_points !== expected.team2_points) {
    throw new HttpError(409, STALE_SCORE);
  }
  if (change > 0 && winnerOf(set, fixture)) {
    throw new HttpError(409, 'This set is already won. Tap Next set or Finish match, or use - or edit to correct it.');
  }

  const next = set[`${team}_points`] + change;
  if (next < 0) throw new HttpError(409, 'The score cannot go below 0');
  set[`${team}_points`] = next;

  await recomputeFixture(fixture);
}

// "Next set": closes the won set and opens the next one.
export async function startNextSet(fixture) {
  const set = liveSet(fixture);
  const winner = winnerOf(set, fixture);
  if (!winner) throw new HttpError(409, 'The set is not finished yet');
  if (matchWinnerIfSetEnds(fixture, winner)) throw new HttpError(409, 'This set wins the match. Tap Finish match.');
  if (set.set_no >= fixture.config.match_sets) throw new HttpError(409, 'That was the last set. Tap Finish match.');

  const now = new Date();
  set.status = 'completed';
  set.winner = winner;
  set.ended_at = now;
  fixture.sets.push({ set_no: set.set_no + 1, status: 'live', started_at: now });

  await recomputeFixture(fixture);
}

// "Finish match": closes the last set and the match once a house has won enough sets.
export async function finishMatch(fixture) {
  const set = liveSet(fixture);
  const winner = winnerOf(set, fixture);
  if (!winner) throw new HttpError(409, 'The set is not finished yet');
  const matchWinner = matchWinnerIfSetEnds(fixture, winner);
  if (!matchWinner) throw new HttpError(409, 'Nobody has won the match yet. Tap Next set.');

  const now = new Date();
  set.status = 'completed';
  set.winner = winner;
  set.ended_at = now;
  fixture.status = 'completed';
  fixture.result_type = 'normal';
  fixture.note = undefined;
  fixture.completed_at = now;

  await recomputeFixture(fixture);
}

// The edit button: fixes the score of any set in the fixture (see parseSetScore).
export async function editSetScore(fixture, setId, score) {
  const set = fixture.sets.id(setId);
  if (!set) throw new HttpError(404, 'Set not found');

  const { points_to_win, point_cap } = cfg(fixture);
  const problem = invalidSetScore(score.team1_points, score.team2_points, points_to_win, point_cap);
  if (problem) throw new HttpError(400, problem);

  const scoreOf = (item) =>
    item._id.equals(setId) ? score : { team1_points: item.team1_points, team2_points: item.team2_points };

  if (fixture.status === 'completed' && fixture.result_type === 'normal') {
    // Checked like a full result: every set must be finished and the match must end with a winner.
    let team1 = 0;
    let team2 = 0;
    for (const item of fixture.sets) {
      if (team1 >= setsToWin(fixture.config.match_sets) || team2 >= setsToWin(fixture.config.match_sets)) {
        throw new HttpError(400, `Set ${item.set_no} should not be there: the match was already won`);
      }
      const points = scoreOf(item);
      const winner = setWinner(points.team1_points, points.team2_points, points_to_win, point_cap);
      if (!winner) throw new HttpError(400, `Set ${item.set_no} is finished, so it needs a final score such as 25-18`);
      item.set({ ...points, winner });
      if (winner === 'team1') team1 += 1;
      else team2 += 1;
    }
    if (team1 < setsToWin(fixture.config.match_sets) && team2 < setsToWin(fixture.config.match_sets)) {
      throw new HttpError(400, `A finished match needs a winner: one side must win ${setsToWin(fixture.config.match_sets)} sets`);
    }
  } else if (fixture.status === 'completed') {
    // Abandoned: keep the referee's decision. The edited set's winner just follows the new score.
    set.set({ ...score, winner: setWinner(score.team1_points, score.team2_points, points_to_win, point_cap) });
  } else {
    // Match in play: every set before the one in play must be finished and must not decide the match.
    let team1 = 0;
    let team2 = 0;
    for (const item of fixture.sets) {
      const points = scoreOf(item);
      if (item.status === 'live') {
        item.set(points);
        continue;
      }
      const winner = setWinner(points.team1_points, points.team2_points, points_to_win, point_cap);
      if (!winner) throw new HttpError(400, `Set ${item.set_no} is finished, so it needs a final score such as 25-18`);
      if (winner === 'team1') team1 += 1;
      else team2 += 1;
      if (team1 >= setsToWin(fixture.config.match_sets) || team2 >= setsToWin(fixture.config.match_sets)) {
        throw new HttpError(400, 'With this score the match would already be over before the set in play');
      }
      item.set({ ...points, winner });
    }
  }

  await recomputeFixture(fixture);
}

// Records a substitution. Free substitutions: any player on court may be swapped for any player on
// the bench, and a player subbed off can come back on later.
export async function addSubstitution(fixture, sub) {
  if (fixture.status === 'completed') throw new HttpError(409, 'This match is over');
  if (fixture.status !== 'live') throw new HttpError(409, 'Start the match before recording a substitution');

  const state = replayMatch(fixture);
  const side = state.sides[sub.team];
  if (!side.on_court.includes(idOf(sub.player_out))) {
    throw new HttpError(400, 'The player going off must be on court');
  }
  if (!side.bench.includes(idOf(sub.player_in))) {
    throw new HttpError(400, 'The player coming on must be on the bench');
  }

  const live = fixture.sets.find((item) => item.status === 'live');
  fixture.events.push({ ...sub, set_no: live?.set_no ?? null });
  await recomputeFixture(fixture);
}

// Removes the latest substitution, as if it never happened.
export async function undoLastEvent(fixture) {
  if (fixture.events.length === 0) throw new HttpError(409, 'There is nothing to undo');
  fixture.events.pop();
  await recomputeFixture(fixture);
}
