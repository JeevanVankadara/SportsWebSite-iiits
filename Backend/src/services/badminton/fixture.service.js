import { Game } from '../../models/Game.js';
import { caseInsensitive } from '../../models/schemaOptions.js';
import { BadmintonFixture } from '../../models/sports/badminton/BadmintonFixture.js';
import { BadmintonMatch } from '../../models/sports/badminton/BadmintonMatch.js';
import { BadmintonSet } from '../../models/sports/badminton/BadmintonSet.js';
import { POINT_CAPS } from '../../models/sports/badminton/constants.js';
import { HttpError } from '../../utils/httpError.js';
import { refreshPlayerStats } from './playerStats.service.js';
import { fixtureOutcome, playersPerSide } from './rules.js';

const PLAYER_FIELDS = 'name username roll_number';

export function findBadmintonGame() {
  return Game.findOne({ game_name: 'Badminton' }).collation(caseInsensitive);
}

// Everything the fixture page needs: the fixture with its referees, and each match with its players and sets.
export async function loadFixtureDetail(fixtureId) {
  const [fixture, matches] = await Promise.all([
    BadmintonFixture.findById(fixtureId).populate('referees', PLAYER_FIELDS),
    BadmintonMatch.find({ fixture: fixtureId })
      .sort({ match_no: 1 })
      .populate({ path: 'sets', select: 'set_no team1_points team2_points winner status', options: { sort: { set_no: 1 } } })
      .populate({ path: 'team1_players team2_players', select: PLAYER_FIELDS }),
  ]);
  return { fixture, matches };
}

// A match has started once it is live or finished. From then on its type, sets and points are fixed.
export function hasStarted(match) {
  return match.status === 'live' || match.status === 'completed';
}

// Saves the match order the referee sets: [{ type, sets_count, points_to_win }] in playing order.
// Matches that have not started can be changed, added or removed at any time; started ones must stay.
export async function saveMatchOrder(fixture, plan) {
  const existing = await BadmintonMatch.find({ fixture: fixture._id }).sort({ match_no: 1 });

  for (const [index, match] of existing.entries()) {
    const item = plan[index];
    const unchanged =
      item &&
      item.type === match.type &&
      item.sets_count === match.sets_count &&
      item.points_to_win === match.points_to_win;
    if (hasStarted(match) && !unchanged) {
      throw new HttpError(409, `Match ${match.match_no} has already started, so it cannot be changed or removed`);
    }
  }

  const matches = plan.map((item, index) => {
    const match =
      existing[index] ??
      new BadmintonMatch({ fixture: fixture._id, tournament: fixture.tournament, match_no: index + 1 });
    if (!hasStarted(match)) {
      match.set({
        type: item.type,
        sets_count: item.sets_count,
        points_to_win: item.points_to_win,
        point_cap: POINT_CAPS[item.points_to_win],
      });
      // Switching between singles and doubles keeps the players that still fit.
      const size = playersPerSide(item.type);
      match.team1_players = match.team1_players.slice(0, size);
      match.team2_players = match.team2_players.slice(0, size);
    }
    return match;
  });

  const removed = existing.slice(plan.length).map((match) => match._id);
  if (removed.length) await BadmintonMatch.deleteMany({ _id: { $in: removed } });
  await Promise.all(matches.map((match) => match.save()));

  fixture.match_count = matches.length;
  fixture.matches = matches.map((match) => ({
    match: match._id,
    match_no: match.match_no,
    type: match.type,
    sets_count: match.sets_count,
  }));
  await recomputeFixture(fixture);
}

// Rebuilds the fixture's score, status and result from its matches. Safe to run after any change.
// Matches that are no longer needed become "not played"; if a correction reopens the fixture they return.
export async function recomputeFixture(fixture) {
  const matches = await BadmintonMatch.find({ fixture: fixture._id }).sort({ match_no: 1 });
  const completed = matches.filter((match) => match.status === 'completed');
  const team1Won = completed.filter((match) => match.winner === 'team1').length;
  const team2Won = completed.filter((match) => match.winner === 'team2').length;

  let outcome = null;
  if (fixture.result_type === 'abandoned') outcome = fixture.result;
  else if (matches.length > 0) {
    outcome = fixtureOutcome({ team1Won, team2Won, matchesLeft: matches.length - completed.length });
  }

  const reopen = outcome ? [] : matches.filter((match) => match.status === 'not_played');
  const close = outcome ? matches.filter((match) => match.status === 'pending' || match.status === 'live') : [];
  if (close.length) {
    await BadmintonMatch.updateMany({ _id: { $in: close.map((match) => match._id) } }, { $set: { status: 'not_played' } });
  }
  if (reopen.length) {
    await BadmintonMatch.updateMany({ _id: { $in: reopen.map((match) => match._id) } }, { $set: { status: 'pending' } });
  }

  fixture.team1_matches_won = team1Won;
  fixture.team2_matches_won = team2Won;
  fixture.result = outcome;
  if (outcome) {
    fixture.status = 'completed';
    fixture.completed_at ??= new Date();
  } else {
    const started = matches.some((match) => match.status === 'completed' || match.status === 'live');
    fixture.status = started ? 'live' : 'scheduled';
    fixture.completed_at = undefined;
  }
  await fixture.save();
}

// Saves a checked result (see validateMatchResult) and updates the fixture and the players' records.
export async function recordMatchResult(match, fixture, result) {
  const now = new Date();
  await BadmintonSet.deleteMany({ match: match._id });
  const sets = await BadmintonSet.insertMany(
    result.sets.map((set, index) => ({
      match: match._id,
      fixture: fixture._id,
      set_no: index + 1,
      team1_points: set.team1_points,
      team2_points: set.team2_points,
      winner: set.winner,
      status: 'completed',
      ended_at: now,
    })),
  );

  match.set({
    sets: sets.map((set) => set._id),
    team1_sets_won: result.team1_sets_won,
    team2_sets_won: result.team2_sets_won,
    status: 'completed',
    result_type: result.result_type,
    winner: result.winner,
    note: result.note,
    ended_at: now,
  });
  match.started_at ??= now;
  await match.save();

  await recomputeFixture(fixture);
  await refreshPlayerStats([...match.team1_players, ...match.team2_players]);
}

// Takes a match back to "not played yet", e.g. when a result was entered for the wrong match.
export async function clearMatchResult(match, fixture) {
  await BadmintonSet.deleteMany({ match: match._id });
  match.set({
    sets: [],
    team1_sets_won: 0,
    team2_sets_won: 0,
    status: 'pending',
    result_type: undefined,
    winner: null,
    note: undefined,
    started_at: undefined,
    ended_at: undefined,
  });
  await match.save();

  await recomputeFixture(fixture);
  await refreshPlayerStats([...match.team1_players, ...match.team2_players]);
}

// Sets or removes the referee's decision on the whole fixture (see validateFixtureDecision).
export async function applyFixtureDecision(fixture, decision) {
  fixture.result_type = decision.result_type;
  fixture.note = decision.note;
  if (decision.result_type === 'abandoned') fixture.result = decision.result;
  await recomputeFixture(fixture);
}

// Deletes fixtures with all their matches and sets, then corrects the records of everyone who played.
export async function deleteFixtures(filter) {
  const fixtureIds = (await BadmintonFixture.find(filter, '_id')).map((fixture) => fixture._id);
  if (fixtureIds.length === 0) return;

  const matches = await BadmintonMatch.find({ fixture: { $in: fixtureIds } }, 'team1_players team2_players');
  const players = matches.flatMap((match) => [...match.team1_players, ...match.team2_players]);

  await BadmintonSet.deleteMany({ fixture: { $in: fixtureIds } });
  await BadmintonMatch.deleteMany({ fixture: { $in: fixtureIds } });
  await BadmintonFixture.deleteMany({ _id: { $in: fixtureIds } });
  await refreshPlayerStats(players);
}

// Stops a tournament edit that would leave badminton fixtures pointing at a removed house or sport.
// games: the new list of game ids; houses: the new list of { _id?, house_name }. Either may be undefined.
export async function assertTournamentEditAllowed(tournament, { games, houses }) {
  if (tournament.isNew) return;

  if (games) {
    const badminton = await findBadmintonGame();
    const removing =
      badminton &&
      tournament.games.some((id) => id.equals(badminton._id)) &&
      !games.includes(String(badminton._id));
    if (removing && (await BadmintonFixture.exists({ tournament: tournament._id }))) {
      throw new HttpError(409, 'Badminton has fixtures in this tournament. Delete them before removing badminton.');
    }
  }

  if (houses) {
    const kept = new Set(houses.filter((house) => house._id).map((house) => String(house._id)));
    const removed = tournament.houses.filter((house) => !kept.has(String(house._id))).map((house) => house._id);
    const inUse =
      removed.length > 0 &&
      (await BadmintonFixture.exists({
        tournament: tournament._id,
        $or: [{ team1: { $in: removed } }, { team2: { $in: removed } }],
      }));
    if (inUse) {
      throw new HttpError(409, 'A house you removed has badminton fixtures. Delete those fixtures first, or keep the house.');
    }
  }
}
