import { BadmintonFixture } from '../../models/sports/badminton/BadmintonFixture.js';
import { BadmintonMatch } from '../../models/sports/badminton/BadmintonMatch.js';
import { BadmintonSet } from '../../models/sports/badminton/BadmintonSet.js';
import { TABLE_POINTS } from '../../models/sports/badminton/constants.js';

// Tie-breakers after table points, as in BWF team events. When exactly two houses are still level
// after any step, the winner of their fixture(s) ranks higher.
const RANKING = ['points', 'match_diff', 'set_diff', 'point_diff'];

function emptyRow(house) {
  return {
    house_id: String(house._id),
    house_name: house.house_name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0,
    matches_won: 0,
    matches_lost: 0,
    sets_won: 0,
    sets_lost: 0,
    points_scored: 0,
    points_conceded: 0,
  };
}

function addFixture(row, { won, drawn, matchesFor, matchesAgainst, setsFor, setsAgainst, pointsFor, pointsAgainst }) {
  row.played += 1;
  if (won) row.won += 1;
  else if (drawn) row.drawn += 1;
  else row.lost += 1;
  row.points += won ? TABLE_POINTS.win : drawn ? TABLE_POINTS.draw : TABLE_POINTS.loss;
  row.matches_won += matchesFor;
  row.matches_lost += matchesAgainst;
  row.sets_won += setsFor;
  row.sets_lost += setsAgainst;
  row.points_scored += pointsFor;
  row.points_conceded += pointsAgainst;
}

// Table points each house earned in the fixtures between just these two houses.
function headToHeadLeader(a, b, fixtures) {
  let aPoints = 0;
  let bPoints = 0;
  for (const fixture of fixtures) {
    const teams = [String(fixture.team1), String(fixture.team2)];
    if (!teams.includes(a.house_id) || !teams.includes(b.house_id)) continue;
    if (fixture.result === 'draw') {
      aPoints += TABLE_POINTS.draw;
      bPoints += TABLE_POINTS.draw;
    } else {
      const winnerId = String(fixture.result === 'team1' ? fixture.team1 : fixture.team2);
      if (winnerId === a.house_id) aPoints += TABLE_POINTS.win;
      else bPoints += TABLE_POINTS.win;
    }
  }
  if (aPoints === bPoints) return null;
  return aPoints > bPoints ? a : b;
}

function rank(rows, step, fixtures) {
  if (rows.length <= 1) return rows;
  if (step === RANKING.length) return [...rows].sort((a, b) => a.house_name.localeCompare(b.house_name));

  const key = RANKING[step];
  const groups = new Map();
  for (const row of [...rows].sort((a, b) => b[key] - a[key])) {
    if (!groups.has(row[key])) groups.set(row[key], []);
    groups.get(row[key]).push(row);
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length === 2) {
      const leader = headToHeadLeader(group[0], group[1], fixtures);
      if (leader) return leader === group[0] ? group : [group[1], group[0]];
    }
    return rank(group, step + 1, fixtures);
  });
}

// Points table for badminton in one tournament, worked out from completed fixtures every time,
// so it is always in step with the latest results and corrections.
export async function computeStandings(tournament) {
  const fixtures = await BadmintonFixture.find({ tournament: tournament._id, status: 'completed' });
  const rows = new Map(tournament.houses.map((house) => [String(house._id), emptyRow(house)]));

  const fixtureIds = fixtures.map((fixture) => fixture._id);
  const [setTotals, pointTotals] = await Promise.all([
    BadmintonMatch.aggregate([
      { $match: { fixture: { $in: fixtureIds }, status: 'completed' } },
      { $group: { _id: '$fixture', team1: { $sum: '$team1_sets_won' }, team2: { $sum: '$team2_sets_won' } } },
    ]),
    // Every set counts, including cut-short sets of abandoned matches.
    BadmintonSet.aggregate([
      { $match: { fixture: { $in: fixtureIds } } },
      { $group: { _id: '$fixture', team1: { $sum: '$team1_points' }, team2: { $sum: '$team2_points' } } },
    ]),
  ]);
  const setsByFixture = new Map(setTotals.map((total) => [String(total._id), total]));
  const pointsByFixture = new Map(pointTotals.map((total) => [String(total._id), total]));

  for (const fixture of fixtures) {
    const team1 = rows.get(String(fixture.team1));
    const team2 = rows.get(String(fixture.team2));
    if (!team1 || !team2) continue;

    const sets = setsByFixture.get(String(fixture._id)) ?? { team1: 0, team2: 0 };
    const points = pointsByFixture.get(String(fixture._id)) ?? { team1: 0, team2: 0 };
    const drawn = fixture.result === 'draw';

    addFixture(team1, {
      won: fixture.result === 'team1',
      drawn,
      matchesFor: fixture.team1_matches_won,
      matchesAgainst: fixture.team2_matches_won,
      setsFor: sets.team1,
      setsAgainst: sets.team2,
      pointsFor: points.team1,
      pointsAgainst: points.team2,
    });
    addFixture(team2, {
      won: fixture.result === 'team2',
      drawn,
      matchesFor: fixture.team2_matches_won,
      matchesAgainst: fixture.team1_matches_won,
      setsFor: sets.team2,
      setsAgainst: sets.team1,
      pointsFor: points.team2,
      pointsAgainst: points.team1,
    });
  }

  const table = [...rows.values()].map((row) => ({
    ...row,
    match_diff: row.matches_won - row.matches_lost,
    set_diff: row.sets_won - row.sets_lost,
    point_diff: row.points_scored - row.points_conceded,
  }));

  return rank(table, 0, fixtures).map((row, index) => ({ position: index + 1, ...row }));
}
